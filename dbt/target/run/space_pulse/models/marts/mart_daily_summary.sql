
  
    
    
    
        
        insert into `space_pulse_dev_marts`.`mart_daily_summary`
        ("summary_date", "solar_alerts_24h", "high_risk_neos_upcoming", "system_status", "last_updated")-- dbt/models/marts/mart_daily_summary.sql



SELECT
    today() AS summary_date,
    
    -- Resumen Solar
    countIf(alert_type = 'SOLAR_FLARE' AND created_at >= today() - INTERVAL 1 DAY) AS solar_alerts_24h,
    
    -- Resumen NEOs (Asteroides)
    countIf(alert_type = 'NEAR_EARTH_OBJECT') AS high_risk_neos_upcoming,
    
    -- Estado global del Sistema Solar
    CASE
        WHEN max(severity_numeric) >= 5 THEN 'CRITICAL'
        WHEN max(severity_numeric) = 4 THEN 'HIGH'
        WHEN max(severity_numeric) = 3 THEN 'ELEVATED'
        ELSE 'NORMAL'
    END AS system_status,
    
    now() AS last_updated
    
FROM `space_pulse_dev_marts`.`mart_space_alerts`
  
  