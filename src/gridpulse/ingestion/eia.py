import json
import os

import requests
from dotenv import load_dotenv


# =========================================================
# CONFIGURATION
# =========================================================

load_dotenv()

eia_key = os.getenv("EIA_API_KEY")

if not eia_key:
    raise ValueError("EIA_API_KEY was not found in the environment.")


data_url = (
    "https://api.eia.gov/v2/"
    "electricity/rto/region-data/data/"
)

start_date = "2025-01-01"
end_date = "2026-09-28"

length = 5000
offset = 0


# =========================================================
# REQUEST PARAMETERS
# =========================================================

data_params = {
    "api_key": eia_key,

    "data[]": "value",

    # Keep UTC as the canonical time source.
    "frequency": "hourly",

    # ERCOT only.
    "facets[respondent][]": "ERCO",

    # Demand + day-ahead demand forecast.
    "facets[type][]": [
        "D",
        "DF",
    ],

    "start": start_date,
    "end": end_date,

    "length": length,
    "offset": offset,
}


# =========================================================
# GET TOTAL RECORD COUNT
# =========================================================

data_response = requests.get(
    data_url,
    params=data_params,
    timeout=60,
)

data_response.raise_for_status()

data_info = (
    data_response
    .json()["response"]
)

total_records = int(
    data_info["total"]
)

print(
    f"Total records available: "
    f"{total_records}"
)


# =========================================================
# DOWNLOAD ALL RECORDS
# =========================================================

all_records = []


while offset < total_records:

    data_params["offset"] = (
        offset
    )

    data_response = requests.get(
        data_url,
        params=data_params,
        timeout=60,
    )

    data_response.raise_for_status()

    data_info = (
        data_response
        .json()["response"]
    )

    batch = data_info["data"]

    all_records.extend(batch)

    print(
        f"Downloaded "
        f"{len(all_records)} "
        f"of {total_records} records"
    )

    offset += length


# =========================================================
# VALIDATE DOWNLOAD
# =========================================================

if len(all_records) != total_records:

    raise ValueError(
        f"Expected "
        f"{total_records} records, "
        f"but downloaded "
        f"{len(all_records)}."
    )


# =========================================================
# SAVE RAW DATA
# =========================================================

output_path = (
    "data/raw/"
    "ercot_demand_forecast_raw.json"
)


with open(
    output_path,
    "w",
) as file:

    json.dump(
        all_records,
        file,
    )


print(
    f"Raw data saved to "
    f"{output_path}"
)