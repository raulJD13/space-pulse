-- dbt/models/marts/mart_space_alerts.sql



-- 1. Alertas Solares (clase C para arriba, severidad >= 3)
SELECT
    concat('SOLAR-', event_id) AS alert_id,
    'SOLAR_FLARE' AS alert_type,
    event_time AS created_at,
    severity_label AS severity,
    severity_numeric AS severity_numeric,
    concat('Solar flare class ', raw_class, ' detected.') AS description,
    CAST(NULL AS Nullable(Float64)) AS latitude,
    CAST(NULL AS Nullable(Float64)) AS longitude
FROM `space_pulse_dev_intermediate`.`int_solar_storm_level`
WHERE severity_numeric >= 3

UNION ALL

-- 2. Alertas de Asteroides (nivel HIGH o CRITICAL)
SELECT
    concat('NEO-', neo_id, '-', toString(close_approach_date)) AS alert_id,
    'NEAR_EARTH_OBJECT' AS alert_type,
    CAST(close_approach_date AS DateTime) AS created_at,
    risk_level AS severity,
    CASE risk_level
        WHEN 'CRITICAL' THEN 5
        WHEN 'HIGH' THEN 4
        WHEN 'MEDIUM' THEN 3
        ELSE 1
    END AS severity_numeric,
    concat(neo_name, ' approaching at ', toString(round(miss_distance_lunar, 1)), ' lunar distances.') AS description,
    CAST(NULL AS Nullable(Float64)) AS latitude,
    CAST(NULL AS Nullable(Float64)) AS longitude
FROM `space_pulse_dev_intermediate`.`int_neo_risk_score`
WHERE risk_level IN ('HIGH', 'CRITICAL')

UNION ALL

-- 3. Alertas de eventos terrestres (EONET)
SELECT
    concat('EARTH-', event_id) AS alert_id,
    'EARTH_EVENT' AS alert_type,
    event_date AS created_at,
    severity_label AS severity,
    severity_numeric AS severity_numeric,
    concat(title, ' (', category, ')') AS description,
    latitude,
    longitude
FROM `space_pulse_dev_intermediate`.`int_earth_event_severity`
WHERE severity_numeric >= 3

UNION ALL

-- 4. Alertas de satélites anómalos
SELECT
    concat('SAT-', satellite_id, '-', formatDateTime(detected_at, '%Y%m%d%H%M%S')) AS alert_id,
    'SATELLITE_ANOMALY' AS alert_type,
    detected_at AS created_at,
    'HIGH' AS severity,
    4 AS severity_numeric,
    concat('Orbital anomaly detected for satellite ', satellite_name, ' (', anomaly_type, ')') AS description,
    CAST(NULL AS Nullable(Float64)) AS latitude,
    CAST(NULL AS Nullable(Float64)) AS longitude
FROM `space_pulse_dev_intermediate`.`int_satellite_anomalies`

-- Ordenamos por lo más reciente y peligroso
ORDER BY created_at DESC, severity_numeric DESC