-- dbt/models/staging/stg_satellites_tle.sql
-- Limpia y tipifica observaciones orbitales de satélites

WITH raw AS (
    SELECT * FROM {{ source('raw', 'satellite_observations_raw') }}
),

cleaned AS (
    SELECT
        satellite_id,
        satellite_name,
        timestamp,
        altitude_km,
        inclination_deg,
        period_minutes,
        mean_motion_rev_day,
        eccentricity,
        anomaly_score,
        is_anomalous,
        ingested_at
    FROM raw
    WHERE satellite_id IS NOT NULL AND satellite_id != ''
      AND altitude_km > 0
)

SELECT * FROM cleaned
