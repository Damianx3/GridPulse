import pandas as pd

from sklearn.metrics import (
    mean_absolute_error,
)

from xgboost import (
    XGBRegressor,
)


# =========================================================
# 1. LOAD DATA
# =========================================================

df = pd.read_csv(
    "data/processed/"
    "ercot_demand_forecast_clean.csv"
)


# =========================================================
# 2. PARSE CANONICAL UTC TIMESTAMP
# =========================================================

df["timestamp"] = pd.to_datetime(
    df["timestamp"],
    utc=True,
)


df = (
    df
    .sort_values("timestamp")
    .reset_index(drop=True)
)


# =========================================================
# 3. VERIFY HOURLY CONTINUITY
# =========================================================

time_differences = (
    df[
        "timestamp"
    ]
    .diff()
)


print(
    "\nMost common time gaps:"
)


print(
    time_differences
    .value_counts()
    .head()
)


# =========================================================
# 4. CREATE TEXAS LOCAL TIME
# =========================================================

# Keep timestamp as UTC.
#
# timestamp_local is only used when we need
# Texas calendar information.
#
# America/Chicago automatically handles:
#
# CST = UTC-6
# CDT = UTC-5

df["timestamp_local"] = (
    df["timestamp"]
    .dt.tz_convert(
        "America/Chicago"
    )
)


print(
    "\nUTC -> Texas time sample:"
)


print(
    df[
        [
            "timestamp",
            "timestamp_local",
        ]
    ]
    .tail()
)


# =========================================================
# 5. CALENDAR FEATURES
# =========================================================

df["hour"] = (
    df["timestamp_local"]
    .dt.hour
)


df["day_of_week"] = (
    df["timestamp_local"]
    .dt.dayofweek
)


df["month"] = (
    df["timestamp_local"]
    .dt.month
)


df["is_weekend"] = (
    df["day_of_week"] >= 5
).astype(int)


# =========================================================
# 6. HISTORICAL DEMAND FEATURES
# =========================================================

# Because the dataset is continuous hourly UTC data:
#
# shift(24) = demand 24 chronological hours ago
#
# This stays DST-safe at the canonical timeline level.

df["lag_24"] = (
    df["demand"]
    .shift(24)
)


df["lag_48"] = (
    df["demand"]
    .shift(48)
)


df["lag_72"] = (
    df["demand"]
    .shift(72)
)


df["lag_168"] = (
    df["demand"]
    .shift(168)
)


# =========================================================
# 7. MODELING DATASET
# =========================================================

model_df = (
    df.dropna(
        subset=[
            "lag_24",
            "lag_48",
            "lag_72",
            "lag_168",
        ]
    )
    .copy()
)


# =========================================================
# 8. RESIDUAL TARGET
# =========================================================

# GridPulse predicts how much demand changes
# relative to demand 24 hours earlier.

model_df["residual"] = (
    model_df["demand"]
    - model_df["lag_24"]
)


# =========================================================
# 9. CHRONOLOGICAL TRAIN / TEST SPLIT
# =========================================================

split_index = int(
    len(model_df) * 0.8
)


train_df = (
    model_df
    .iloc[:split_index]
    .copy()
)


test_df = (
    model_df
    .iloc[split_index:]
    .copy()
)


print(
    "\nTrain period "
    "(Texas time):"
)


print(
    train_df[
        "timestamp_local"
    ].min(),
    "->",
    train_df[
        "timestamp_local"
    ].max(),
)


print(
    "\nTest period "
    "(Texas time):"
)


print(
    test_df[
        "timestamp_local"
    ].min(),
    "->",
    test_df[
        "timestamp_local"
    ].max(),
)


# =========================================================
# 10. FEATURES
# =========================================================

feature_columns = [
    "hour",
    "day_of_week",
    "month",
    "is_weekend",
    "lag_24",
    "lag_48",
    "lag_72",
    "lag_168",
]


X_train = (
    train_df[
        feature_columns
    ]
)


X_test = (
    test_df[
        feature_columns
    ]
)


y_train = (
    train_df[
        "residual"
    ]
)


# =========================================================
# 11. TRAIN XGBOOST MODEL
# =========================================================

model = XGBRegressor(
    n_estimators=500,
    max_depth=5,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    objective="reg:squarederror",
    random_state=42,
    n_jobs=-1,
)


model.fit(
    X_train,
    y_train,
)


# =========================================================
# 12. PREDICT RESIDUAL
# =========================================================

predicted_residual = (
    model.predict(
        X_test
    )
)


# Historical baseline:
# demand 24 hours earlier.

test_df[
    "baseline_prediction"
] = (
    test_df[
        "lag_24"
    ]
)


# GridPulse:
#
# 24-hour baseline +
# predicted correction.

test_df[
    "gridpulse_prediction"
] = (
    test_df[
        "lag_24"
    ]
    + predicted_residual
)


# =========================================================
# 13. FAIR MODEL COMPARISON
# =========================================================

comparison_df = (
    test_df
    .dropna(
        subset=[
            "forecast"
        ]
    )
    .copy()
)


baseline_mae = (
    mean_absolute_error(
        comparison_df[
            "demand"
        ],
        comparison_df[
            "baseline_prediction"
        ],
    )
)


ercot_mae = (
    mean_absolute_error(
        comparison_df[
            "demand"
        ],
        comparison_df[
            "forecast"
        ],
    )
)


gridpulse_mae = (
    mean_absolute_error(
        comparison_df[
            "demand"
        ],
        comparison_df[
            "gridpulse_prediction"
        ],
    )
)


# =========================================================
# 14. RESULTS
# =========================================================

print(
    "\n================================="
)

print(
    "       FORECAST COMPARISON"
)

print(
    "================================="
)


print(
    f"Baseline MAE:  "
    f"{baseline_mae:.2f}"
)


print(
    f"ERCOT MAE:     "
    f"{ercot_mae:.2f}"
)


print(
    f"GridPulse MAE: "
    f"{gridpulse_mae:.2f}"
)


print(
    f"\nComparison rows: "
    f"{len(comparison_df)}"
)


# =========================================================
# 15. EXPORT DASHBOARD DATA
# =========================================================

output_columns = [
    "timestamp",
    "demand",
    "forecast",
    "baseline_prediction",
    "gridpulse_prediction",
]


dashboard_df = (
    test_df[
        output_columns
    ]
    .copy()
)


# Export as explicit UTC ISO timestamps.

dashboard_df[
    "timestamp"
] = (
    dashboard_df[
        "timestamp"
    ]
    .dt.strftime(
        "%Y-%m-%dT%H:%M:%SZ"
    )
)


output_path = (
    "data/processed/"
    "model_predictions.csv"
)


dashboard_df.to_csv(
    output_path,
    index=False,
)


print(
    f"\nPredictions saved to "
    f"{output_path}"
)