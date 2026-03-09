-- dbt/models/marts/mart_daily_summary.sql



SELECT
    today() AS summary_date,

    -- Resumen Solar
    countIf(alert_type = 'SOLAR_FLARE' AND created_at >= today() - INTERVAL 1 DAY) AS solar_alerts_24h,

    -- Resumen NEOs (Asteroides)
    countIf(alert_type = 'NEAR_EARTH_OBJECT') AS high_risk_neos_upcoming,

    -- Resumen Eventos Terrestres
    countIf(alert_type = 'EARTH_EVENT' AND created_at >= today() - INTERVAL 1 DAY) AS earth_events_24h,

    -- Resumen Satélites
    countIf(alert_type = 'SATELLITE_ANOMALY' AND created_at >= today() - INTERVAL 1 DAY) AS satellite_anomalies_24h,

    -- Total
    countIf(created_at >= today()) AS total_alerts_today,
    countIf(severity = 'CRITICAL' AND created_at >= today()) AS critical_today,

    -- Estado global del Sistema Solar
    CASE
        WHEN max(severity_numeric) >= 5 THEN 'CRITICAL'
        WHEN max(severity_numeric) = 4 THEN 'HIGH'
        WHEN max(severity_numeric) = 3 THEN 'ELEVATED'
        ELSE 'NORMAL'
    END AS system_status,

    now() AS last_updated

FROM `space_pulse_dev_marts`.`mart_space_alerts`