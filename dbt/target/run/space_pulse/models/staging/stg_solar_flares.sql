

  create view `space_pulse_dev_staging`.`stg_solar_flares__dbt_tmp` 
  
    
    
  as (
    -- dbt/models/staging/stg_solar_flares.sql
-- Source: space_pulse.solar_events (typed table populated by Airflow DONKI DAG)
-- Filters to FLARE events only; maps column names to downstream expectations.

WITH raw AS (
    SELECT * FROM `space_pulse`.`solar_events`
    WHERE event_type = 'FLARE'
),

cleaned AS (
    SELECT
        event_id                                        AS flare_id,
        begin_time,
        peak_time,
        end_time,
        class_type                                      AS flare_class,
        LEFT(class_type, 1)                             AS flare_class_letter,
        CAST(
            if(
                length(class_type) > 1,
                SUBSTRING(class_type, 2),
                '0.0'
            ) AS Float32
        )                                               AS flare_class_number,
        source_location
    FROM raw
)

SELECT * FROM cleaned
WHERE flare_id != ''
  )