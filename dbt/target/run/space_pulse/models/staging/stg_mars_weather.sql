

  create view `space_pulse_dev_staging`.`stg_mars_weather__dbt_tmp` 
  
    
    
  as (
    -- dbt/models/staging/stg_mars_weather.sql
-- Limpia datos meteorológicos de Marte (InSight)

WITH raw AS (
    SELECT * FROM `space_pulse`.`mars_weather`
),

cleaned AS (
    SELECT
        sol,
        earth_date,
        temp_avg_celsius,
        temp_min_celsius,
        temp_max_celsius,
        wind_speed_avg_ms,
        wind_direction_degrees,
        pressure_pa,
        season,
        ingested_at
    FROM raw
    WHERE sol > 0
)

SELECT * FROM cleaned
  )