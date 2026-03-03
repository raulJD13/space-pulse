-- dbt/models/staging/stg_near_earth_objects.sql

WITH raw AS (
    SELECT * FROM `default`.`neows_raw`
),

cleaned AS (
    SELECT
        id AS neo_id,
        name AS neo_name,
        
        -- Extraemos el diámetro (que lo dejamos como String en ClickHouse para parsearlo aquí)
        JSONExtractFloat(JSONExtractRaw(JSONExtractRaw(estimated_diameter, 'kilometers'), 'estimated_diameter_max')) AS diameter_max_km,
        
        is_potentially_hazardous_asteroid AS is_hazardous,
        
        _velocity_km_s AS velocity_km_s,
        _miss_distance_lunar AS miss_distance_lunar,
        CAST(_close_approach_date AS Date) AS close_approach_date,
        CAST(_ingestion_date AS Date) AS ingested_at
        
    FROM raw
    WHERE id IS NOT NULL AND id != ''
)

SELECT * FROM cleaned