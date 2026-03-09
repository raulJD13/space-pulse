
  
    
    
    
        
        insert into `space_pulse_dev_intermediate`.`int_satellite_anomalies__dbt_backup`
        ("satellite_id", "satellite_name", "detected_at", "altitude_km", "inclination_deg", "period_minutes", "mean_motion_rev_day", "anomaly_score", "is_anomalous", "anomaly_type", "ingested_at")-- dbt/models/intermediate/int_satellite_anomalies.sql
-- Filtra y enriquece satélites con anomalías detectadas por ML

WITH staged AS (
    SELECT * FROM `space_pulse_dev_staging`.`stg_satellites_tle`
),

anomalous AS (
    SELECT
        satellite_id,
        satellite_name,
        timestamp AS detected_at,
        altitude_km,
        inclination_deg,
        period_minutes,
        mean_motion_rev_day,
        anomaly_score,
        is_anomalous,

        -- Clasificar tipo de anomalía según parámetros
        CASE
            WHEN altitude_km < 200 THEN 'ORBITAL_DECAY'
            WHEN altitude_km > 2000 THEN 'HIGH_ORBIT_DEVIATION'
            WHEN abs(anomaly_score) > 0.6 THEN 'SEVERE_DEVIATION'
            ELSE 'MINOR_DEVIATION'
        END AS anomaly_type,

        ingested_at

    FROM staged
    WHERE is_anomalous = true
)

SELECT * FROM anomalous
ORDER BY detected_at DESC
  
  