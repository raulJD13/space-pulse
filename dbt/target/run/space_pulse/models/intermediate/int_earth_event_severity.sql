
  
    
    
    
        
        insert into `space_pulse_dev_intermediate`.`int_earth_event_severity__dbt_backup`
        ("event_id", "title", "category", "status", "latitude", "longitude", "event_date", "closed_date", "source_url", "ingested_at", "severity_numeric", "severity_label")-- dbt/models/intermediate/int_earth_event_severity.sql
-- Asigna severidad a eventos terrestres basándose en categoría y estado

WITH staged AS (
    SELECT * FROM `space_pulse_dev_staging`.`stg_earth_events`
),

classified AS (
    SELECT
        *,

        -- Severidad basada en tipo de evento
        CASE category
            WHEN 'Wildfires' THEN 3
            WHEN 'Volcanoes' THEN 4
            WHEN 'Severe Storms' THEN 3
            WHEN 'Earthquakes' THEN 4
            WHEN 'Floods' THEN 3
            WHEN 'Drought' THEN 2
            WHEN 'Dust and Haze' THEN 1
            WHEN 'Sea and Lake Ice' THEN 1
            ELSE 2
        END AS severity_numeric,

        CASE category
            WHEN 'Volcanoes' THEN 'HIGH'
            WHEN 'Earthquakes' THEN 'HIGH'
            WHEN 'Wildfires' THEN 'MEDIUM'
            WHEN 'Severe Storms' THEN 'MEDIUM'
            WHEN 'Floods' THEN 'MEDIUM'
            ELSE 'LOW'
        END AS severity_label

    FROM staged
    WHERE status = 'open'
)

SELECT * FROM classified
ORDER BY severity_numeric DESC, event_date DESC
  
  