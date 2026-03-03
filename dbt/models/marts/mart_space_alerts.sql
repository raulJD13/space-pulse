-- dbt/models/marts/mart_space_alerts.sql

{{ config(materialized='table') }}

-- 1. Alertas Solares (Solo nos importan de clase C para arriba, severidad >= 3)
SELECT
    concat('SOLAR-', event_id) AS alert_id,
    'SOLAR_FLARE' AS alert_type,
    event_time AS created_at,
    severity_label AS severity,
    severity_numeric AS severity_numeric,
    concat('Solar flare class ', raw_class, ' detected.') AS description
FROM {{ ref('int_solar_storm_level') }}
WHERE severity_numeric >= 3

UNION ALL

-- 2. Alertas de Asteroides (Solo nos importan nivel HIGH o CRITICAL)
SELECT
    concat('NEO-', neo_id) AS alert_id,
    'NEAR_EARTH_OBJECT' AS alert_type,
    CAST(close_approach_date AS DateTime) AS created_at,
    risk_level AS severity,
    CASE risk_level 
        WHEN 'CRITICAL' THEN 5 
        WHEN 'HIGH' THEN 4 
        WHEN 'MEDIUM' THEN 3 
        ELSE 1 
    END AS severity_numeric,
    concat(neo_name, ' approaching at ', toString(round(miss_distance_lunar, 1)), ' lunar distances.') AS description
FROM {{ ref('int_neo_risk_score') }}
WHERE risk_level IN ('HIGH', 'CRITICAL')

-- Ordenamos la tabla final para que lo más reciente y peligroso salga primero
ORDER BY created_at DESC, severity_numeric DESC