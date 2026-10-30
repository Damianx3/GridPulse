# GridPulse

**Texas Grid Intelligence Platform**

GridPulse is an end-to-end data engineering and machine learning project for analyzing and forecasting Texas electricity demand.

The project ingests hourly ERCOT-region demand and day-ahead forecast data from the U.S. Energy Information Administration API, processes and validates it with Python and Pandas, stores analysis-ready data in PostgreSQL, and uses SQL and machine learning to study demand patterns and forecast performance.

The final product will include a Next.js dashboard for exploring Texas grid demand, forecast accuracy, peak usage periods, and GridPulse model predictions.

## What It Does

- Pulls hourly ERCOT demand and forecast data from the EIA API
- Handles API pagination and validates downloaded records
- Maintains separate raw and processed data layers
- Cleans and reshapes time-series data with Pandas
- Stores processed data in PostgreSQL
- Uses SQL to analyze demand and forecast accuracy
- Creates historical and calendar-based time-series features
- Compares machine learning predictions against ERCOT and a simple historical baseline
- Exports model predictions for a Next.js dashboard

## Architecture

```text
EIA API
   ↓
Python Ingestion
   ↓
Raw JSON
   ↓
Pandas Processing
   ↓
PostgreSQL
   ↓
SQL Analytics
   ↓
Time-Series Forecasting
   ↓
Next.js Dashboard
```

## Current Results

The current dataset contains more than **15,000 hourly observations** from the ERCOT region.

Forecast performance on the current test period:

| Model | MAE |
| --- | ---: |
| ERCOT Day-Ahead Forecast | 1,069.74 |
| Lag-24 Baseline | 1,975.85 |
| Initial GridPulse XGBoost Model | 2,488.11 |

The initial XGBoost model underperformed the historical baseline, so the next modeling iteration focuses on stronger time-series features and residual forecasting.

Rather than hiding an unsuccessful first experiment, GridPulse treats model evaluation as part of the development process.

## Time-Series Features

The current model uses:

- Hour of day
- Day of week
- Month
- Demand 24 hours earlier
- Demand 168 hours earlier

The model is evaluated using a **chronological train/test split** so future observations are never randomly mixed into the training data.

## Tech Stack

**Data Engineering**
- Python
- Pandas
- Requests
- EIA API
- PostgreSQL
- SQL

**Machine Learning**
- scikit-learn
- XGBoost
- Time-series feature engineering

**Frontend**
- Next.js
- TypeScript

**Tools**
- Git
- GitHub

## Project Structure

```text
GridPulse/
├── data/
│   ├── raw/
│   └── processed/
│
├── sql/
│   ├── schema.sql
│   └── analysis.sql
│
├── src/
│   └── gridpulse/
│       ├── ingestion/
│       │   └── eia.py
│       ├── processing/
│       │   └── clean.py
│       └── modeling/
│           └── train.py
│
├── .env.example
├── .gitignore
├── requirements.txt
└── README.md
```

## Project Progress

- [x] EIA API ingestion
- [x] Pagination
- [x] Raw data storage
- [x] Data cleaning and transformation
- [x] Data validation
- [x] PostgreSQL storage
- [x] SQL analytics
- [x] Historical forecasting baseline
- [x] Initial XGBoost model
- [ ] Improve time-series forecasting model
- [ ] Export final dashboard dataset
- [ ] Build Next.js dashboard
- [ ] Deploy GridPulse

## Why GridPulse?

GridPulse is designed to demonstrate the full lifecycle of a data product rather than only the final machine learning model.

The project combines data ingestion, transformation, validation, database design, SQL analytics, time-series modeling, model evaluation, and frontend visualization into one end-to-end system built around real Texas electricity data.
