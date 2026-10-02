-- 1. Highest demand hours
SELECT
    timestamp,
    demand
FROM ercot_demand_forecast
ORDER BY demand DESC
LIMIT 10;


-- 2. Overall forecast accuracy
SELECT
    ROUND(AVG(ABS(forecast - demand))::numeric, 2) AS mae,
    ROUND(
        AVG(ABS(forecast - demand) * 100.0 / demand)::numeric,
        2
    ) AS mape_percent
FROM ercot_demand_forecast
WHERE forecast IS NOT NULL;


-- 3. Largest forecast misses
SELECT
    timestamp,
    demand,
    forecast,
    ABS(forecast - demand) AS absolute_error
FROM ercot_demand_forecast
WHERE forecast IS NOT NULL
ORDER BY absolute_error DESC
LIMIT 10;


-- 4. Average demand by hour of day
SELECT
    EXTRACT(HOUR FROM timestamp)::integer AS hour,
    ROUND(AVG(demand)::numeric, 2) AS avg_demand
FROM ercot_demand_forecast
GROUP BY hour
ORDER BY hour;


-- 5. Average forecast error by hour
SELECT
    EXTRACT(HOUR FROM timestamp)::integer AS hour,
    ROUND(
        AVG(ABS(forecast - demand))::numeric,
        2
    ) AS avg_absolute_error
FROM ercot_demand_forecast
WHERE forecast IS NOT NULL
GROUP BY hour
ORDER BY hour;