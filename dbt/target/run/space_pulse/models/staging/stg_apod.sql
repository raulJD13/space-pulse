

  create view `space_pulse_dev_staging`.`stg_apod__dbt_tmp` 
  
    
    
  as (
    -- dbt/models/staging/stg_apod.sql
-- Limpia datos de la Astronomy Picture of the Day

WITH raw AS (
    SELECT * FROM `space_pulse`.`apod`
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
  )