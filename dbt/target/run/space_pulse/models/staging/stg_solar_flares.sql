

  create view `space_pulse_dev_staging`.`stg_solar_flares__dbt_tmp` 
  
    
    
  as (
    -- dbt/models/staging/stg_solar_flares.sql

WITH raw AS (
    SELECT json FROM `default`.`donki_flares_raw`
),

exploded AS (
    SELECT arrayJoin(JSONExtractArrayRaw(JSONExtractRaw(json, 'flares'))) AS flare_json
    FROM raw
    WHERE JSONHas(json, 'flares')
),

cleaned AS (
    SELECT
        JSONExtractString(flare_json, 'flrID') AS flare_id,
        
        -- Usamos parseDateTimeBestEffort que sabe leer las "T" y las "Z" de la NASA
        parseDateTimeBestEffort(JSONExtractString(flare_json, 'beginTime')) AS begin_time,
        
        -- Misma función para peak y end, con ifNull por si no vienen
        parseDateTimeBestEffort(ifNull(JSONExtractString(flare_json, 'peakTime'), JSONExtractString(flare_json, 'beginTime'))) AS peak_time,
        parseDateTimeBestEffort(ifNull(JSONExtractString(flare_json, 'endTime'), JSONExtractString(flare_json, 'beginTime'))) AS end_time,
        
        JSONExtractString(flare_json, 'classType') AS flare_class,        
        LEFT(JSONExtractString(flare_json, 'classType'), 1) AS flare_class_letter,
        
        -- Protección: Si la clase tiene más de 1 letra (ej: M1.2), sacamos el número. Si no, ponemos 0.0
        CAST(
            if(
                length(JSONExtractString(flare_json, 'classType')) > 1, 
                SUBSTRING(JSONExtractString(flare_json, 'classType'), 2), 
                '0.0'
            ) AS Float32
        ) AS flare_class_number,
        
        JSONExtractString(flare_json, 'sourceLocation') AS source_location
    FROM exploded
)

SELECT * FROM cleaned 
WHERE flare_id != ''
  )