-- dbt/models/marts/mart_mars_climate.sql
-- Series temporales de clima marciano para el dashboard

{{ config(materialized='table') }}

SELECT
    sol,
    earth_date,
    temp_avg_celsius,
    temp_min_celsius,
    temp_max_celsius,
    wind_speed_avg_ms,
    wind_direction_degrees,
    pressure_pa,
    season
FROM {{ ref('stg_mars_weather') }}
ORDER BY earth_date DESC
