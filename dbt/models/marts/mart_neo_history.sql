-- dbt/models/marts/mart_neo_history.sql
-- Historial de asteroides con risk score para gráficos temporales

{{ config(materialized='table') }}

SELECT
    neo_id,
    neo_name,
    close_approach_date,
    diameter_max_km,
    velocity_km_s,
    miss_distance_lunar,
    miss_distance_km,
    risk_score,
    risk_level,
    is_hazardous,
    days_until_approach
FROM {{ ref('int_neo_risk_score') }}
ORDER BY close_approach_date DESC
