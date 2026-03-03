# Space Pulse 🌌

2. Preparar ClickHouse (Paso temporal)
Como aún no hemos orquestado que DuckDB o Airflow vuelquen los datos JSON automáticamente a ClickHouse, vamos a crear unas "tablas lógicas" (vistas) en ClickHouse usando su increíble función s3() que lee directo del Data Lake.

Ve a http://localhost:8123/play (esta es una interfaz web muy chula que trae ClickHouse de serie). Pega y ejecuta (botón Run) las siguientes queries una a una:
CREATE OR REPLACE VIEW neows_raw AS
SELECT * FROM s3(
    'http://minio:9000/space-pulse-raw/neows/*/*/*/*.json', 
    'minioadmin', 'minioadmin123secure', 
    'JSONEachRow'
);

CREATE OR REPLACE VIEW donki_flares_raw AS
SELECT * FROM s3(
    'http://minio:9000/space-pulse-raw/donki/*/*/*/*.json', 
    'minioadmin', 'minioadmin123secure', 
    'JSONEachRow'
);