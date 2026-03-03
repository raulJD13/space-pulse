
  
    
    
    
        
        insert into `space_pulse_dev_intermediate`.`int_solar_storm_level__dbt_backup`
        ("event_id", "event_type", "event_time", "raw_class", "severity_numeric", "severity_label", "event_date")-- dbt/models/intermediate/int_solar_storm_level.sql

WITH flares AS (
    SELECT 
        flare_id AS event_id,
        'FLARE' AS event_type,
        begin_time AS event_time,
        flare_class AS raw_class,
        
        -- Asignamos un peso numérico según la letra de la llamarada
        CASE flare_class_letter
            WHEN 'X' THEN 5
            WHEN 'M' THEN 4
            WHEN 'C' THEN 3
            WHEN 'B' THEN 2
            ELSE 1
        END AS severity_numeric,
        
        -- Asignamos la etiqueta de severidad para el Dashboard
        CASE flare_class_letter
            WHEN 'X' THEN 'CRITICAL'
            WHEN 'M' THEN 'HIGH'
            WHEN 'C' THEN 'MEDIUM'
            ELSE 'LOW'
        END AS severity_label
        
    FROM `space_pulse_dev_staging`.`stg_solar_flares`
)

SELECT 
    *,
    CAST(event_time AS Date) AS event_date
FROM flares
ORDER BY severity_numeric DESC, event_time DESC
  
  