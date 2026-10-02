# imports
import json
import os

import requests
from dotenv import load_dotenv


# ----- Configuration -----

load_dotenv()

eia_key = os.getenv("EIA_API_KEY")

data_url = "https://api.eia.gov/v2/electricity/rto/region-data/data/"

start_date = "2025-01-01"
end_date = "2026-09-28"

length = 5000
offset = 0


# ----- Request parameters -----

data_params = {
    "api_key": eia_key,
    "data[]": "value",

    # only ERCOT
    "facets[respondent][]": "ERCO",

    # demand and day-ahead demand forecast
    "facets[type][]": ["D", "DF"],

    # project date range
    "start": start_date,
    "end": end_date,

    # pagination
    "length": length,
    "offset": offset,
}


# ----- Get total number of records -----

data_response = requests.get(
    data_url,
    params=data_params,
)

data_response.raise_for_status()

data_info = data_response.json()["response"]

total_records = int(data_info["total"])

print(f"Total records available: {total_records}")


# ----- Download all records -----

all_records = []

while offset < total_records:

    data_params["offset"] = offset

    data_response = requests.get(
        data_url,
        params=data_params,
    )

    data_response.raise_for_status()

    data_info = data_response.json()["response"]

    batch = data_info["data"]

    all_records.extend(batch)

    print(f"Downloaded {len(all_records)} of {total_records} records")

    offset += length


# ----- Validate download -----

if len(all_records) != total_records:
    raise ValueError(
        f"Expected {total_records} records, "
        f"but downloaded {len(all_records)}."
    )


# ----- Save raw data -----

output_path = "data/raw/ercot_demand_forecast_raw.json"

with open(output_path, "w") as file:
    json.dump(all_records, file)


print(f"Raw data saved to {output_path}")