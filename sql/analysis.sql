-- =========================================================
-- GRIDPULSE SQL ANALYSIS
--
-- Canonical timestamps are stored as UTC.
-- Texas-local analysis explicitly converts timestamps
-- using America/Chicago.
-- =========================================================


-- =========================================================
-- 1. HIGHEST DEMAND HOURS
-- =========================================================

SELECT
    timestamp,
    timestamp AT TIME ZONE 'America/Chicago'
        AS texas_time,
    demand
FROM ercot_demand_forecast
ORDER BY demand DESC
LIMIT 10;



-- =========================================================
-- 2. OVERALL ERCOT FORECAST ACCURACY
-- =========================================================

SELECT
    ROUND(
        AVG(
            ABS(
                forecast - demand
            )
        )::numeric,
        2
    ) AS mae,

    ROUND(
        AVG(
            ABS(
                forecast - demand
            )
            * 100.0
            / demand
        )::numeric,
        2
    ) AS mape_percent

FROM ercot_demand_forecast

WHERE forecast IS NOT NULL;



-- =========================================================
-- 3. LARGEST ERCOT FORECAST MISSES
-- =========================================================

SELECT
    timestamp,

    timestamp
        AT TIME ZONE
        'America/Chicago'
        AS texas_time,

    demand,

    forecast,

    ABS(
        forecast - demand
    ) AS absolute_error

FROM ercot_demand_forecast

WHERE forecast IS NOT NULL

ORDER BY absolute_error DESC

LIMIT 10;



-- =========================================================
-- 4. AVERAGE DEMAND BY TEXAS LOCAL HOUR
-- =========================================================

SELECT
    EXTRACT(
        HOUR FROM
        timestamp
        AT TIME ZONE
        'America/Chicago'
    )::integer AS hour,

    ROUND(
        AVG(demand)::numeric,
        2
    ) AS avg_demand

FROM ercot_demand_forecast

GROUP BY hour

ORDER BY hour;



-- =========================================================
-- 5. AVERAGE ERCOT FORECAST ERROR
--    BY TEXAS LOCAL HOUR
-- =========================================================

SELECT
    EXTRACT(
        HOUR FROM
        timestamp
        AT TIME ZONE
        'America/Chicago'
    )::integer AS hour,

    ROUND(
        AVG(
            ABS(
                forecast - demand
            )
        )::numeric,
        2
    ) AS avg_absolute_error

FROM ercot_demand_forecast

WHERE forecast IS NOT NULL

GROUP BY hour

ORDER BY hour;