-- dbt/models/staging/stg_apod.sql
-- Limpia datos de la Astronomy Picture of the Day

WITH raw AS (
    SELECT * FROM {{ source('raw', 'apod_raw') }}
),

cleaned AS (
    SELECT
        date,
        title,
        explanation,
        media_type,
        url,
        hdurl,
        thumbnail_url,
        copyright,
        ingested_at
    FROM raw
    WHERE title IS NOT NULL AND title != ''
)

SELECT * FROM cleaned
