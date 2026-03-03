-- dbt/models/intermediate/int_neo_risk_score.sql

WITH staged AS (
    SELECT * FROM `space_pulse_dev_staging`.`stg_near_earth_objects`
),

scored AS (
    SELECT
        *,
        
        -- FÓRMULA DE RIESGO:
        -- Numerador: masa estimada (volumen) * velocidad 
        -- Denominador: distancia en unidades lunares
        -- Usamos GREATEST(..., 0.1) para evitar dividir por cero si pasara rozando
        ROUND(
            (POW(diameter_max_km, 3) * velocity_km_s) 
            / GREATEST(miss_distance_lunar, 0.1),
            6
        ) AS risk_score,
        
        -- Clasificación del nivel de riesgo
        CASE
            WHEN is_hazardous = true AND miss_distance_lunar < 5 THEN 'CRITICAL'
            WHEN (POW(diameter_max_km, 3) * velocity_km_s) / GREATEST(miss_distance_lunar, 0.1) > 10 THEN 'HIGH'
            WHEN (POW(diameter_max_km, 3) * velocity_km_s) / GREATEST(miss_distance_lunar, 0.1) > 1  THEN 'MEDIUM'
            ELSE 'LOW'
        END AS risk_level,
        
        -- Calculamos cuántos días faltan para el acercamiento
        dateDiff('day', today(), close_approach_date) AS days_until_approach
        
    FROM staged
    WHERE close_approach_date >= today() -- Solo nos importan los que están por venir
    ORDER BY risk_score DESC
)

SELECT * FROM scored