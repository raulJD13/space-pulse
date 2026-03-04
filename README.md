# Space Pulse 🌌
 
-2. Preparar ClickHouse (Paso temporal)
-Como aún no hemos orquestado que DuckDB o Airflow vuelquen los datos JSON automáticamente a ClickHouse, vamos a crear unas "tablas lógicas" (vistas) en ClickHouse usando su increíble función s3() que lee directo del Data Lake.
+**Space Pulse** es una plataforma de monitorización de amenazas espaciales que combina datos públicos de la NASA para detectar y visualizar:
 
-Ve a http://localhost:8123/play (esta es una interfaz web muy chula que trae ClickHouse de serie). Pega y ejecuta (botón Run) las siguientes queries una a una:
+- **Asteroides cercanos a la Tierra (NEO)**.
+- **Eventos de clima espacial** (llamaradas solares, CME y tormentas geomagnéticas).
+
+El proyecto implementa un flujo de datos end-to-end: **ingesta → data lake → modelado analítico → API → dashboard**.
+
+---
+
+## Tabla de contenidos
+
+1. [¿Qué hace este proyecto?](#qué-hace-este-proyecto)
+2. [Arquitectura general](#arquitectura-general)
+3. [Estructura del proyecto](#estructura-del-proyecto)
+4. [Stack tecnológico](#stack-tecnológico)
+5. [Flujo de datos paso a paso](#flujo-de-datos-paso-a-paso)
+6. [Prerrequisitos](#prerrequisitos)
+7. [Configuración rápida (local)](#configuración-rápida-local)
+8. [Ejecución de API y frontend](#ejecución-de-api-y-frontend)
+9. [Preparación de ClickHouse para DBT (views raw)](#preparación-de-clickhouse-para-dbt-views-raw)
+10. [Ejecución de dbt](#ejecución-de-dbt)
+11. [Pipelines de Airflow](#pipelines-de-airflow)
+12. [Endpoints de la API](#endpoints-de-la-api)
+13. [Script de prueba de ingesta](#script-de-prueba-de-ingesta)
+14. [Troubleshooting](#troubleshooting)
+15. [Roadmap sugerido](#roadmap-sugerido)
+
+---
+
+## ¿Qué hace este proyecto?
+
+Space Pulse construye un panel operativo de alertas espaciales:
+
+- Consume datos desde APIs de NASA (**NeoWs** y **DONKI**).
+- Almacena JSON crudo en **MinIO** (data lake tipo S3).
+- Expone esos datos en **ClickHouse** (vía `s3()` y vistas raw).
+- Transforma y modela datos con **dbt** en capas `staging`, `intermediate` y `marts`.
+- Sirve métricas y alertas mediante **FastAPI**.
+- Presenta un dashboard interactivo con **React + Vite + Tailwind + Recharts**.
+
+---
+
+## Arquitectura general
+
+```text
+NASA APIs (NeoWs, DONKI)
+        │
+        ▼
+   Airflow DAGs (extract)
+        │
+        ▼
+ MinIO / S3 Data Lake (raw JSON)
+        │
+        ▼
+ ClickHouse views raw (función s3())
+        │
+        ▼
+      dbt models
+(staging → intermediate → marts)
+        │
+        ▼
+     FastAPI Backend
+   (/api/summary, /api/alerts)
+        │
+        ▼
+ React Dashboard (frontend)
+```
+
+---
+
+## Estructura del proyecto
+
+```text
+space-pulse/
+├── airflow/
+│   └── dags/
+│       ├── dag_near_earth_objects.py   # Ingesta NEOs (diaria)
+│       └── dag_solar_weather.py        # Ingesta DONKI (cada 30 min)
+├── api/
+│   └── main.py                          # API FastAPI para summary y alerts
+├── ingestion/
+│   ├── clients/
+│   │   ├── base_client.py               # Cliente base NASA (retry/rate limit)
+│   │   ├── neows_client.py              # Cliente NeoWs
+│   │   └── donki_client.py              # Cliente DONKI
+│   └── minio_storage.py                 # Wrapper de operaciones MinIO
+├── dbt/
+│   ├── dbt_project.yml
+│   ├── profiles.yml
+│   └── models/
+│       ├── staging/
+│       ├── intermediate/
+│       └── marts/
+├── frontend/
+│   ├── src/
+│   │   ├── App.jsx                      # Dashboard principal
+│   │   └── api/spaceApi.js              # Cliente Axios
+│   └── package.json
+├── scripts/
+│   └── test_nasa_api.py                 # Test manual extracción + carga a MinIO
+├── docker-compose.yml
+└── README.md
+```
+
+---
+
+## Stack tecnológico
+
+### Data & Backend
+- **Python 3.11+**
+- **Apache Airflow 2.8** (orquestación)
+- **FastAPI** (API REST)
+- **ClickHouse** (motor analítico)
+- **dbt + dbt-clickhouse** (transformaciones ELT)
+- **MinIO** (data lake S3-compatible)
+- **httpx** (cliente HTTP async)
+- **minio SDK**
+
+### Frontend
+- **React 19**
+- **Vite 7**
+- **TailwindCSS**
+- **Recharts**
+- **Axios**
+- **Lucide React**
+
+### Infra local
+- **Docker Compose**
+- **PostgreSQL 15** (metadata DB de Airflow)
+
+---
+
+## Flujo de datos paso a paso
+
+1. Airflow ejecuta DAGs programados:
+   - `near_earth_objects_pipeline`: extrae NeoWs para próximos días.
+   - `solar_weather_pipeline`: extrae DONKI cada 30 min.
+2. Los DAGs guardan JSON crudo en MinIO con particionado temporal:
+   - `neows/YYYY/MM/DD/HHMMSS.json`
+   - `donki/YYYY/MM/DD/HHMMSS.json`
+3. ClickHouse lee directamente desde MinIO usando la función `s3()` en vistas raw.
+4. dbt transforma:
+   - **staging**: limpieza/parsing.
+   - **intermediate**: score de riesgo NEO y severidad solar.
+   - **marts**: tablas de negocio (`mart_space_alerts`, `mart_daily_summary`).
+5. FastAPI consulta marts de ClickHouse y expone endpoints.
+6. React consume esos endpoints para renderizar KPIs, gráfica y tabla de alertas.
+
+---
+
+## Prerrequisitos
+
+- Docker + Docker Compose.
+- Python 3.11+ (para ejecutar API/scripts/dbt local).
+- Node.js 18+ (recomendado 20+) para frontend.
+- Una NASA API Key (puedes usar `DEMO_KEY`, con límites bajos).
+
+---
+
+## Configuración rápida (local)
+
+### 1) Variables de entorno
+
+En tu shell (o en un `.env` propio):
+
+```bash
+export NASA_API_KEY="TU_NASA_API_KEY"
+export MINIO_ACCESS_KEY="minioadmin"
+export MINIO_SECRET_KEY="minioadmin123secure"
+```
+
+### 2) Levantar infraestructura base
+
+```bash
+docker compose up -d
+```
+
+Servicios importantes:
+
+- Airflow UI: http://localhost:8080 (user/pass por defecto: `admin` / `admin`)
+- MinIO Console: http://localhost:9001
+- ClickHouse HTTP: http://localhost:8123/play
+
+---
+
+## Ejecución de API y frontend
+
+> El `docker-compose.yml` levanta infraestructura + Airflow, pero **no** arranca automáticamente FastAPI ni Vite.
+
+### API (FastAPI)
+
+Instala dependencias Python necesarias en tu entorno local:
+
+```bash
+pip install fastapi uvicorn clickhouse-connect minio httpx python-dotenv
+```
+
+Lanza la API:
+
+```bash
+uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
+```
+
+### Frontend (React)
+
+```bash
+cd frontend
+npm install
+npm run dev
+```
+
+La app quedará en: http://localhost:5173
+
+---
+
+## Preparación de ClickHouse para DBT (views raw)
+
+Como paso inicial, crea las vistas raw leyendo directo de MinIO. Entra a:
+
+- http://localhost:8123/play
+
+Ejecuta:
+
+```sql
 CREATE OR REPLACE VIEW neows_raw AS
 SELECT * FROM s3(
-    'http://minio:9000/space-pulse-raw/neows/*/*/*/*.json', 
-    'minioadmin', 'minioadmin123secure', 
+    'http://minio:9000/space-pulse-raw/neows/*/*/*/*.json',
+    'minioadmin',
+    'minioadmin123secure',
     'JSONEachRow'
 );
 
 CREATE OR REPLACE VIEW donki_flares_raw AS
 SELECT * FROM s3(
-    'http://minio:9000/space-pulse-raw/donki/*/*/*/*.json', 
-    'minioadmin', 'minioadmin123secure', 
+    'http://minio:9000/space-pulse-raw/donki/*/*/*/*.json',
+    'minioadmin',
+    'minioadmin123secure',
     'JSONEachRow'
-);
\ No newline at end of file
+);
+```
+
+---
+
+## Ejecución de dbt
+
+Instala dbt para ClickHouse (en tu entorno Python):
+
+```bash
+pip install dbt-core dbt-clickhouse
+```
+
+Desde la carpeta `dbt/`:
+
+```bash
+cd dbt
+dbt debug
+dbt run
+dbt test
+```
+
+Modelos principales esperados:
+
+- `stg_near_earth_objects`
+- `stg_solar_flares`
+- `int_neo_risk_score`
+- `int_solar_storm_level`
+- `mart_space_alerts`
+- `mart_daily_summary`
+
+---
+
+## Pipelines de Airflow
+
+### `near_earth_objects_pipeline`
+- **Schedule**: diario a las 06:00 UTC.
+- **Objetivo**: extraer NEOs y guardar raw JSON en MinIO.
+
+### `solar_weather_pipeline`
+- **Schedule**: cada 30 minutos.
+- **Objetivo**: extraer CME/flares/storms de DONKI y guardar raw JSON en MinIO.
+
+En Airflow puedes:
+
+1. Habilitar DAGs.
+2. Lanzar `Trigger DAG` manual para generar datos de prueba.
+3. Ver logs de extracción/carga.
+
+---
+
+## Endpoints de la API
+
+Base URL local:
+
+```text
+http://localhost:8000
+```
+
+### `GET /`
+Healthcheck básico.
+
+### `GET /api/summary`
+Devuelve el último resumen diario (`mart_daily_summary`):
+- estado global del sistema,
+- alertas solares 24h,
+- NEOs de alto riesgo,
+- timestamp de actualización.
+
+### `GET /api/alerts?limit=50`
+Devuelve alertas unificadas (`mart_space_alerts`) ordenadas por fecha y severidad.
+
+---
+
+## Script de prueba de ingesta
+
+Puedes validar extracción + escritura en MinIO con:
+
+```bash
+python scripts/test_nasa_api.py
+```
+
+Este script:
+
+- consulta DONKI de los últimos días,
+- imprime conteos por tipo de evento,
+- guarda el JSON en `space-pulse-raw/donki/...`.
+
+---
+
+## Troubleshooting
+
+### No aparecen datos en frontend
+
+1. Verifica que haya datos en MinIO (`space-pulse-raw`).
+2. Verifica que existan vistas raw en ClickHouse.
+3. Ejecuta `dbt run` para poblar marts.
+4. Comprueba API: `http://localhost:8000/api/summary`.
+
+### Error de conexión a ClickHouse desde API
+
+Asegura variables:
+
+```bash
+export CLICKHOUSE_HOST=localhost
+export CLICKHOUSE_PORT=8123
+export CLICKHOUSE_USER=default
+export CLICKHOUSE_PASSWORD=""
+```
+
+### Límites de NASA API (`DEMO_KEY`)
+
+Si ves errores 429/rate-limit, usa una API key propia y reduce frecuencia de pruebas.
+
+---
+
+## Roadmap sugerido
+
+- Dockerizar también API y frontend para `docker compose up` completo.
+- Reemplazar vistas `s3()` por tablas raw + cargas incrementales.
+- Añadir pruebas automáticas (unitarias + integración).
+- Añadir autenticación/autorización a la API.
+- Definir observabilidad (metrics + alerting) para pipelines.
+- CI/CD con lint, tests y `dbt build`.
+
+---
+
+## Licencia
+
+Pendiente de definir. Si quieres abrir el proyecto, añade una licencia MIT/Apache-2.0 en `LICENSE`.
 
EOF
)