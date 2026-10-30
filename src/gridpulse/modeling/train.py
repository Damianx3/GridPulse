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

# Time-series data must be chronological
df = df.sort_values("timestamp").reset_index(drop=True)


# =========================================================
# 2. VALIDATE HOURLY DATA
# =========================================================

time_differences = df["timestamp"].diff()

print("\nMost common time gaps:")
print(time_differences.value_counts().head())


# =========================================================
# 3. FEATURE ENGINEERING
# =========================================================

# Calendar features
df["hour"] = df["timestamp"].dt.hour
df["day_of_week"] = df["timestamp"].dt.dayofweek
df["month"] = df["timestamp"].dt.month

# Historical demand features
df["lag_24"] = df["demand"].shift(24)
df["lag_168"] = df["demand"].shift(168)


# First week cannot have lag_168
model_df = df.dropna(
    subset=["lag_24", "lag_168"]
).copy()


# =========================================================
# 4. CHRONOLOGICAL TRAIN / TEST SPLIT
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
# 5. DEFINE MODEL FEATURES + TARGET
# =========================================================

feature_columns = [
    "hour",
    "day_of_week",
    "month",
    "lag_24",
    "lag_168",
]

# X = information the model gets to see
X_train = train_df[feature_columns]
X_test = test_df[feature_columns]

# y = value we want the model to predict
y_train = train_df["demand"]
y_test = test_df["demand"]


# =========================================================
# 6. TRAIN XGBOOST MODEL
# =========================================================

model = XGBRegressor(
    n_estimators=400,
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
# 7. CREATE PREDICTIONS
# =========================================================

test_df["gridpulse_prediction"] = model.predict(X_test)

# Naive baseline:
# same demand as the same hour yesterday
test_df["baseline_prediction"] = test_df["lag_24"]


# =========================================================
# 8. FAIR MODEL COMPARISON
# =========================================================

# ERCOT has some missing forecast values.
# For the three-way comparison, evaluate only timestamps
# where all predictions are available.
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
# 9. PRINT RESULTS
# =========================================================

print("\n=================================")
print("       FORECAST COMPARISON")
print("=================================")

print(f"Baseline MAE:  {baseline_mae:.2f}")
print(f"ERCOT MAE:     {ercot_mae:.2f}")
print(f"GridPulse MAE: {gridpulse_mae:.2f}")

print(f"\nComparison rows: {len(comparison_df)}")


# =========================================================
# 10. EXPORT DASHBOARD RESULTS
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