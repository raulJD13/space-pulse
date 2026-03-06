-- dbt/models/staging/stg_earth_events.sql
-- Limpia y tipifica eventos naturales de EONET

WITH raw AS (
    SELECT * FROM {{ source('raw', 'earth_events_raw') }}
),

cleaned AS (
    SELECT
        event_id,
        title,
        category,
        status,
        latitude,
        longitude,
        event_date,
        closed_date,
        source_url,
        ingested_at
    FROM raw
    WHERE event_id IS NOT NULL AND event_id != ''
)

SELECT * FROM cleaned
