import pandas as pd


# =========================================================
# 1. LOAD RAW DATA
# =========================================================

df = pd.read_json(
    "data/raw/"
    "ercot_demand_forecast_raw.json"
)


# =========================================================
# 2. PARSE EIA TIMESTAMPS AS UTC
# =========================================================

# EIA frequency="hourly" represents UTC.
#
# Previously these timestamps were parsed as
# timezone-naive values. That caused values like
# 22:00 UTC to be treated as if they were
# 10 PM Texas time.
#
# utc=True makes the timezone explicit.

df["period"] = pd.to_datetime(
    df["period"],
    utc=True,
)


# =========================================================
# 3. RESHAPE D + DF INTO COLUMNS
# =========================================================

clean_df = df.pivot(
    index="period",
    columns="type",
    values="value",
)


clean_df = clean_df.rename(
    columns={
        "D": "demand",
        "DF": "forecast",
    }
)


clean_df.columns.name = None

clean_df = (
    clean_df
    .reset_index()
)


clean_df = clean_df.rename(
    columns={
        "period": "timestamp",
    }
)


# =========================================================
# 4. SORT CHRONOLOGICALLY
# =========================================================

clean_df = (
    clean_df
    .sort_values("timestamp")
    .reset_index(drop=True)
)


# =========================================================
# 5. NUMERIC DATA TYPES
# =========================================================

clean_df["demand"] = (
    clean_df["demand"]
    .astype("Int64")
)


clean_df["forecast"] = (
    clean_df["forecast"]
    .astype("Int64")
)


# =========================================================
# 6. DATA QUALITY CHECKS
# =========================================================

print("\nMissing values:")

print(
    clean_df
    .isna()
    .sum()
)


print(
    f"\nTotal rows: "
    f"{len(clean_df)}"
)


duplicate_timestamps = (
    clean_df[
        "timestamp"
    ]
    .duplicated()
    .sum()
)


print(
    f"\nDuplicate timestamps: "
    f"{duplicate_timestamps}"
)


time_differences = (
    clean_df[
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


print(
    "\nUTC sample:"
)


print(
    clean_df[
        [
            "timestamp",
            "demand",
            "forecast",
        ]
    ]
    .tail()
)


# =========================================================
# 7. EXPORT EXPLICIT UTC TIMESTAMPS
# =========================================================

# ISO 8601 format:
#
# 2026-09-28T23:00:00Z
#
# Z explicitly tells JavaScript, Python,
# PostgreSQL, etc. that this timestamp is UTC.

clean_df["timestamp"] = (
    clean_df["timestamp"]
    .dt.strftime(
        "%Y-%m-%dT%H:%M:%SZ"
    )
)


# =========================================================
# 8. SAVE PROCESSED DATA
# =========================================================

output_path = (
    "data/processed/"
    "ercot_demand_forecast_clean.csv"
)


clean_df.to_csv(
    output_path,
    index=False,
)


print(
    f"\nProcessed dataset "
    f"saved to {output_path}"
)