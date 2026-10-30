DROP TABLE IF EXISTS ercot_demand_forecast;


CREATE TABLE ercot_demand_forecast (
    timestamp TIMESTAMPTZ PRIMARY KEY,
    demand INTEGER NOT NULL,
    forecast INTEGER
);