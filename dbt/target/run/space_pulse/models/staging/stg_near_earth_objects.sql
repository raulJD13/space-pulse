

  create view `space_pulse_dev_staging`.`stg_near_earth_objects__dbt_tmp` 
  
    
    
  as (
    -- dbt/models/staging/stg_near_earth_objects.sql
-- Source: space_pulse.neo_daily (typed table populated by Airflow NeoWs DAG)
-- Columns already cleaned and typed — no JSON parsing required.

WITH raw AS (
    SELECT * FROM `space_pulse`.`neo_daily`
),

cleaned AS (
    SELECT
        neo_id,
        neo_name,
        diameter_max_km,
        is_hazardous,
        velocity_km_s,
        miss_distance_lunar,
        miss_distance_km,
        close_approach_date,
        ingested_at
    FROM raw
    WHERE neo_id IS NOT NULL AND neo_id != ''
)

SELECT * FROM cleaned
  )