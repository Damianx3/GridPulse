CREATE TABLE ercot_demand_forecast (
    timestamp TIMESTAMP PRIMARY KEY,
    demand INTEGER NOT NULL,
    forecast INTEGER
);