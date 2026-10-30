import pandas as pd

from sklearn.metrics import mean_absolute_error
from xgboost import XGBRegressor


# =========================================================
# 1. LOAD DATA
# =========================================================

df = pd.read_csv(
    "data/processed/ercot_demand_forecast_clean.csv"
)

df["timestamp"] = pd.to_datetime(df["timestamp"])

df = df.sort_values("timestamp").reset_index(drop=True)


# =========================================================
# 2. VERIFY HOURLY CONTINUITY
# =========================================================

time_differences = df["timestamp"].diff()

print("\nMost common time gaps:")
print(time_differences.value_counts().head())


# =========================================================
# 3. CALENDAR FEATURES
# =========================================================

df["hour"] = df["timestamp"].dt.hour
df["day_of_week"] = df["timestamp"].dt.dayofweek
df["month"] = df["timestamp"].dt.month

df["is_weekend"] = (
    df["day_of_week"] >= 5
).astype(int)


# =========================================================
# 4. HISTORICAL DEMAND FEATURES
# =========================================================

df["lag_24"] = df["demand"].shift(24)
df["lag_48"] = df["demand"].shift(48)
df["lag_72"] = df["demand"].shift(72)
df["lag_168"] = df["demand"].shift(168)


# =========================================================
# 5. MODELING DATASET
# =========================================================

model_df = df.dropna(
    subset=[
        "lag_24",
        "lag_48",
        "lag_72",
        "lag_168",
    ]
).copy()


# =========================================================
# 6. RESIDUAL TARGET
# =========================================================

# How much today's demand differs from
# the same hour yesterday
model_df["residual"] = (
    model_df["demand"]
    - model_df["lag_24"]
)


# =========================================================
# 7. CHRONOLOGICAL TRAIN / TEST SPLIT
# =========================================================

split_index = int(len(model_df) * 0.8)

train_df = model_df.iloc[:split_index].copy()
test_df = model_df.iloc[split_index:].copy()

print("\nTrain period:")
print(
    train_df["timestamp"].min(),
    "->",
    train_df["timestamp"].max()
)

print("\nTest period:")
print(
    test_df["timestamp"].min(),
    "->",
    test_df["timestamp"].max()
)


# =========================================================
# 8. FEATURES AND TARGET
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

X_train = train_df[feature_columns]
X_test = test_df[feature_columns]

y_train = train_df["residual"]


# =========================================================
# 9. TRAIN MODEL
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
# 10. PREDICT RESIDUAL
# =========================================================

predicted_residual = model.predict(X_test)

# Baseline = yesterday's demand
test_df["baseline_prediction"] = test_df["lag_24"]

# GridPulse = yesterday + predicted correction
test_df["gridpulse_prediction"] = (
    test_df["lag_24"]
    + predicted_residual
)


# =========================================================
# 11. FAIR COMPARISON
# =========================================================

comparison_df = test_df.dropna(
    subset=["forecast"]
).copy()


baseline_mae = mean_absolute_error(
    comparison_df["demand"],
    comparison_df["baseline_prediction"],
)

ercot_mae = mean_absolute_error(
    comparison_df["demand"],
    comparison_df["forecast"],
)

gridpulse_mae = mean_absolute_error(
    comparison_df["demand"],
    comparison_df["gridpulse_prediction"],
)


# =========================================================
# 12. RESULTS
# =========================================================

print("\n=================================")
print("       FORECAST COMPARISON")
print("=================================")

print(f"Baseline MAE:  {baseline_mae:.2f}")
print(f"ERCOT MAE:     {ercot_mae:.2f}")
print(f"GridPulse MAE: {gridpulse_mae:.2f}")

print(f"\nComparison rows: {len(comparison_df)}")


# =========================================================
# 13. EXPORT DASHBOARD DATA
# =========================================================

output_columns = [
    "timestamp",
    "demand",
    "forecast",
    "baseline_prediction",
    "gridpulse_prediction",
]

output_path = "data/processed/model_predictions.csv"

test_df[output_columns].to_csv(
    output_path,
    index=False,
)

print(
    f"\nPredictions saved to {output_path}"
)