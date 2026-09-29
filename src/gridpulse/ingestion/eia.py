# imports
import os
import dotenv
import requests
import json


dotenv.load_dotenv()

eia_key = os.getenv("EIA_API_KEY")

# number of records to request at a time
length = 5000

# where in the dataset we want to start
offset = 0


# ----- API URLs -----

# endpoint where we request the actual electricity data
data_url = "https://api.eia.gov/v2/electricity/rto/region-data/data/"

# endpoint that gives us information ABOUT the dataset
metadata_url = "https://api.eia.gov/v2/electricity/rto/region-data/"

# endpoint that gives us information about respondent values 
respondent_url = "https://api.eia.gov/v2/electricity/rto/region-data/facet/respondent/"

# endpoint that gives us the valid metric/type values
type_url = "https://api.eia.gov/v2/electricity/rto/region-data/facet/type/"


# ----- Request parameters -----

# parameters for our actual electricity data request
data_params = {
    "api_key": eia_key,
    "data[]": "value",
    "facets[respondent][]" : "ERCO",
    "facets[type][]": ["DF", "D"],
    "start": "2025-01-01",
    "end": "2026-09-28",
    "length": length,
    "offset": offset

}

metadata_params = {
    "api_key": eia_key,
}

respondent_params = {
    "api_key" : eia_key,
}

type_params = {
    "api_key": eia_key
}


# ----- Make API requests -----

# request actual electricity data from EIA
data_response = requests.get(data_url, params=data_params)

metadata_response = requests.get(
    metadata_url,
    params=metadata_params
)

respondent_response = requests.get(respondent_url, params=respondent_params)

type_response = requests.get(type_url, params=type_params)


# ----- Parse electricity data -----

data_response_data = data_response.json()

data_info = data_response_data["response"]

records = data_info["data"]


# ----- Parse metadata -----

metadata_data = metadata_response.json()

metadata_info = metadata_data["response"]

facets = metadata_info["facets"]

# ----- respondent -----
respondent_data = respondent_response.json()

respondent_info = respondent_data["response"]

respondents = respondent_info["facets"]

# ----- Parse type data -----

type_response_data= type_response.json()

type_info = type_response_data["response"]

type_facets = type_info["facets"]


# ----- Inspect electricity data -----

print("----- Inspect electricity data -----")

print(bool(eia_key))

print(data_response.status_code)

print(type(data_response_data))
print(data_response_data.keys())

print(type(data_info))
print(data_info.keys())

print(len(records))

print(data_info["total"])

print(type(records[0]["value"]))


# ----- Inspect metadata -----

print("----- Inspect metadata -----")

print(metadata_response.status_code)

print(type(facets))

print(len(facets))

print(facets)

# ----- Inspect respondent data -----

print("----- Inspect respondent data -----")

print(respondent_response.status_code)
print(type(respondent_info))
print(respondent_info.keys())

print(type(respondents))
print(len(respondents))
print(respondents[0])

for respondent in respondents:
    if "Electric Reliability Council" in respondent["name"]:
        print(respondent)

print(records[0])

# ----- Inspect type data -----

print("----- Inspect type data -----")

print(type_response.status_code)
print(type(type_facets))
print(len(type_facets))
print(type_facets)

print("---------------")
print(data_info["total"])
print(records[0])

all_records = []

offset = 0

length = 5000

total_records = data_info["total"]

while offset < int(total_records):
     data_params["offset"] = offset

     data_response = requests.get(data_url, params=data_params)
     data_response_data = data_response.json()
     batch = data_response_data["response"]["data"]
     all_records.extend(batch)
     offset += length


print(len(all_records))
print(total_records)
print(len(all_records) == int(total_records))


with open("data/raw/ercot_demand_forecast_raw.json", "w") as file:
    json.dump(all_records, file)

with open("data/raw/ercot_demand_forecast_raw.json", "r") as file:
    d = json.load(file)

print(type(d))
print(len(d))
print(d[0])