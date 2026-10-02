import pandas as pd


# ----- Load raw data -----

df = pd.read_json("data/raw/ercot_demand_forecast_raw.json")


# ----- Clean data types -----

df["period"] = pd.to_datetime(df["period"])


# ----- Reshape data -----

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


# ----- Clean table structure -----

clean_df.columns.name = None

clean_df = clean_df.reset_index()

clean_df = clean_df.rename(
    columns={
        "period": "timestamp",
    }
)


# ----- Clean numeric data types -----

clean_df["demand"] = clean_df["demand"].astype("Int64")
clean_df["forecast"] = clean_df["forecast"].astype("Int64")


# ----- Data quality checks -----

print("Missing values:")
print(clean_df.isna().sum())

print(f"\nTotal rows: {len(clean_df)}")

print("\nData types:")
print(clean_df.dtypes)

print("\nShape:")
print(clean_df.shape)


# ----- Save processed data -----

output_path = "data/processed/ercot_demand_forecast_clean.csv"

clean_df.to_csv(
    output_path,
    index=False,
)

print(f"\nProcessed dataset saved to {output_path}")