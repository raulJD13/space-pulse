# Space Pulse

**Space Pulse** es una plataforma de observabilidad del sistema solar en tiempo real. Ingesta datos de múltiples APIs públicas de la NASA, los almacena en un data lake, los transforma con un pipeline analítico y los presenta en un dashboard interactivo con alertas de amenazas espaciales.

El proyecto implementa un flujo de datos **end-to-end de producción**: ingesta asíncrona → data lake (MinIO/S3) → motor analítico columnar (ClickHouse) → modelado ELT (dbt) → API REST (FastAPI) → dashboard (React) + observabilidad (Grafana) + streaming de alertas (Kafka).

---

## Qué monitoriza

| Fuente de datos | API NASA | Descripción |
|---|---|---|
| Asteroides cercanos (NEO) | NeoWs | Diámetro, velocidad, distancia de acercamiento, riesgo de impacto |
| Clima espacial | DONKI | Llamaradas solares, eyecciones de masa coronal (CME), tormentas geomagnéticas |
| Eventos terrestres | EONET v3 | Incendios, volcanes, huracanes, inundaciones en tiempo real |
| Imágenes de la Tierra | EPIC | Fotos de la Tierra completa desde el satélite DSCOVR (1.5M km) |
| Clima en Marte | InSight | Temperatura, viento y presión atmosférica del rover InSight |
| Satélites en órbita | TLE API | Posiciones orbitales de Starlink, ISS y satélites meteorológicos |
| Imagen astronómica | APOD | Astronomy Picture of the Day con metadatos |

---

## Arquitectura

```
NASA APIs (NeoWs · DONKI · EONET · EPIC · InSight · TLE · APOD)
        │
        ▼
  Airflow DAGs (6 pipelines programados)
        │  async httpx · retry · rate-limit
        ▼
  MinIO / S3 Data Lake
  space-pulse-raw/
  ├── neows/YYYY/MM/DD/HHMMSS.json
  ├── donki/YYYY/MM/DD/HHMMSS.json
  ├── eonet/YYYY/MM/DD/HHMMSS.json
  ├── epic/YYYY/MM/DD/HHMMSS.json
  ├── mars/YYYY/MM/DD/HHMMSS.json
  ├── satellites/YYYY/MM/DD/HHMMSS.json
  └── apod/YYYY/MM/DD.json
        │
        ▼
  ClickHouse (motor OLAP columnar)
  ├── Tablas raw (cargadas por Airflow)
  └── Vistas s3() para datos en MinIO
        │
        ▼
  dbt (transformaciones ELT)
  ├── staging/    → limpieza y normalización de campos
  ├── intermediate/ → scoring de riesgo y clasificación
  └── marts/      → tablas de negocio del dashboard
        │
        ├──────────────────────┐
        ▼                      ▼
  FastAPI REST API        Kafka Producer
  /api/v1/alerts          topic: space.alerts
  /api/v1/asteroids       (streaming de alertas)
  /api/v1/solar
  /api/v1/earth
  /api/v1/mars
  /api/v1/satellites
        │
        ├──────────────────────┐
        ▼                      ▼
  React Dashboard         Grafana
  (Vite + Tailwind)       (dashboards SQL ClickHouse)
```

---

## Stack tecnológico

### Orquestación e ingesta
- **Apache Airflow 2.8** — 6 DAGs programados con retry automático
- **Python 3.11** — clientes NASA asíncronos con `httpx`
- **MinIO** — data lake S3-compatible para JSON crudo

### Almacenamiento y modelado
- **ClickHouse 24.1** — motor OLAP columnar para analítica en tiempo real
- **dbt + dbt-clickhouse** — transformaciones ELT en 3 capas (staging / intermediate / marts)

### Backend
- **FastAPI** — API REST con 6 routers, Pydantic schemas, CORS configurado
- **clickhouse-connect** — driver nativo Python para ClickHouse

### Streaming
- **Apache Kafka** (Confluent 7.5) — broker de mensajes para alertas en tiempo real
- **kafka-python** — producer de eventos de anomalías

### Frontend
- **React 19** + **Vite 7** — dashboard con 7 componentes especializados
- **TailwindCSS** — estilos dark-theme
- **Recharts** — gráficas de distribución de riesgo y clima marciano
- **Axios** — cliente HTTP con polling cada 5 minutos

### Observabilidad
- **Grafana 10.3** + plugin ClickHouse — dashboards SQL sobre los marts

### Infraestructura local
- **Docker Compose** — orquesta 10+ servicios con un solo comando
- **PostgreSQL 15** — base de datos de metadatos de Airflow

---

## Servicios locales

| Servicio | URL | Credenciales |
|---|---|---|
| React Dashboard | http://localhost:5173 | — |
| FastAPI (docs) | http://localhost:8000/docs | — |
| Airflow UI | http://localhost:8080 | admin / admin |
| Grafana | http://localhost:3000 | admin / spacepulse |
| MinIO Console | http://localhost:9001 | minioadmin / minioadmin123secure |
| ClickHouse Play | http://localhost:8123/play | default / (sin password) |
| Kafka UI | http://localhost:8090 | — |

---

## Estructura del proyecto

```
space-pulse/
├── airflow/
│   └── dags/
│       ├── dag_near_earth_objects.py   # NEOs — diario 06:00 UTC
│       ├── dag_solar_weather.py        # CME/flares/storms — cada 30 min
│       ├── dag_apod.py                 # Imagen astronómica — diario 00:05 UTC
│       ├── dag_earth_events.py         # EONET + EPIC — cada hora
│       ├── dag_mars_weather.py         # InSight — diario 08:00 UTC
│       └── dag_satellites_tle.py       # TLE + anomalías — cada hora
│
├── ingestion/
│   ├── clients/
│   │   ├── base_client.py              # Base async con retry y rate-limit
│   │   ├── neows_client.py             # Near Earth Objects
│   │   ├── donki_client.py             # Space weather (DONKI)
│   │   ├── apod_client.py              # Astronomy Picture of the Day
│   │   ├── eonet_client.py             # Earth natural events
│   │   ├── epic_client.py              # Earth imagery (DSCOVR)
│   │   ├── insight_client.py           # Mars weather (InSight)
│   │   └── tle_client.py               # Satellite orbital data + SGP4
│   ├── minio_storage.py                # Wrapper S3/MinIO
│   └── kafka_producer.py               # Producer de alertas a Kafka
│
├── processing/
│   ├── parsers/
│   │   ├── neo_scorer.py               # Risk score de asteroides (0-100)
│   │   ├── storm_classifier.py         # Clasificación de tormentas solares
│   │   └── tle_parser.py               # Parser TLE + cálculos orbitales
│   └── anomaly/
│       └── satellite_anomaly.py        # Detección de anomalías (Isolation Forest)
│
├── dbt/
│   ├── dbt_project.yml
│   ├── profiles.yml
│   └── models/
│       ├── staging/
│       │   ├── stg_near_earth_objects.sql
│       │   ├── stg_solar_flares.sql
│       │   ├── stg_apod.sql
│       │   ├── stg_earth_events.sql
│       │   ├── stg_mars_weather.sql
│       │   └── stg_satellites_tle.sql
│       ├── intermediate/
│       │   ├── int_neo_risk_score.sql       # Score de riesgo NEO (miss distance × velocidad × diámetro)
│       │   ├── int_solar_storm_level.sql    # Clasificación C/M/X → LOW/MEDIUM/HIGH/CRITICAL
│       │   ├── int_earth_event_severity.sql # Severidad de eventos EONET por categoría
│       │   └── int_satellite_anomalies.sql  # Anomalías orbitales detectadas
│       └── marts/
│           ├── mart_space_alerts.sql    # Tabla unificada de alertas (todos los tipos)
│           ├── mart_daily_summary.sql   # KPIs del día para los widgets del header
│           ├── mart_neo_history.sql     # Historial de aproximaciones de asteroides
│           └── mart_mars_climate.sql    # Serie temporal del clima marciano
│
├── api/
│   ├── main.py                          # FastAPI app + CORS + routers + rutas compat
│   ├── db/
│   │   └── clickhouse.py               # Cliente ClickHouse con manejo de errores
│   ├── models/
│   │   └── schemas.py                  # Pydantic response models
│   ├── routers/
│   │   ├── alerts.py                   # GET /api/v1/alerts/ y /alerts/summary
│   │   ├── asteroids.py                # GET /api/v1/asteroids/ y /hazardous
│   │   ├── solar.py                    # GET /api/v1/solar/events y /flares
│   │   ├── earth.py                    # GET /api/v1/earth/events y /categories
│   │   ├── mars.py                     # GET /api/v1/mars/weather y /latest
│   │   └── satellites.py               # GET /api/v1/satellites/ y /anomalies
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx                     # Layout principal del dashboard
│   │   ├── hooks/useSpacePulse.js      # Hook central con polling y estado global
│   │   ├── api/spaceApi.js             # Clientes Axios (v1 + compat)
│   │   └── components/
│   │       ├── Header/                 # KPIs: estado, alertas 24h, NEOs
│   │       ├── SolarStatus/            # Últimas llamaradas y tormentas solares
│   │       ├── NeoTracker/             # Tabla de asteroides próximos con risk score
│   │       ├── EarthGlobe/             # Mapa de eventos naturales EONET
│   │       ├── MarsWeather/            # Clima marciano (temperatura, presión, viento)
│   │       ├── SatelliteAlert/         # Satélites con anomalías orbitales
│   │       └── APOD/                   # Imagen astronómica del día
│   └── Dockerfile
│
├── clickhouse/
│   └── init.sql                        # Schema completo: 7 tablas + vista unificada
│
├── grafana/
│   └── provisioning/
│       ├── dashboards/dashboard.yml
│       └── datasources/clickhouse.yml
│
├── scripts/
│   └── test_nasa_api.py                # Test manual de ingesta a MinIO
│
├── docker-compose.yml                  # 10 servicios: infra + Airflow + Kafka + Grafana + API + Frontend
├── .env.example                        # Plantilla de variables de entorno
└── CLAUDE.md                           # Guía para Claude Code
```

---

## Flujo de datos completo

### 1. Ingesta (Airflow DAGs)

Cada DAG ejecuta un cliente NASA asíncrono con retry y exponential backoff, y escribe el JSON crudo en MinIO particionado por fecha:

```
DAG near_earth_objects_pipeline  →  neows/YYYY/MM/DD/HHMMSS.json    (diario, 06:00 UTC)
DAG solar_weather_pipeline       →  donki/YYYY/MM/DD/HHMMSS.json    (cada 30 min)
DAG apod_pipeline                →  apod/YYYY/MM/DD.json            (diario, 00:05 UTC)
DAG earth_events_pipeline        →  eonet + epic / ...              (cada hora)
DAG mars_weather_pipeline        →  mars/YYYY/MM/DD/HHMMSS.json     (diario, 08:00 UTC)
DAG satellite_tle_pipeline       →  satellites/YYYY/MM/DD/...       (cada hora)
```

El DAG de satélites incluye un paso extra de **detección de anomalías** con Isolation Forest (scikit-learn) sobre features orbitales: altitud, inclinación, período y excentricidad.

### 2. Modelado dbt (3 capas)

**Staging** — vistas, limpieza de campos y parsing de tipos:
- Normaliza nombres de columnas, castea tipos, elimina registros inválidos

**Intermediate** — tablas con lógica de negocio:
- `int_neo_risk_score`: computa un score 0-100 combinando distancia de acercamiento (en unidades lunares), velocidad relativa y diámetro máximo. Risk level: LOW / MEDIUM / HIGH / CRITICAL.
- `int_solar_storm_level`: mapea la clase Geoalert (C1–C9, M1–M9, X1+) a un nivel de severidad numérico 1-5.
- `int_earth_event_severity`: asigna severidad a eventos EONET por categoría (wildfires → HIGH, volcanoes → CRITICAL, etc.)
- `int_satellite_anomalies`: filtra satélites marcados como anómalos por el detector de Isolation Forest.

**Marts** — tablas incrementales para el dashboard:
- `mart_space_alerts`: tabla unificada con todos los tipos de alerta (solar, NEO, terrestre, satélite) con severity y descripción.
- `mart_daily_summary`: KPIs agregados: total alertas, alertas por tipo, estado global del sistema.
- `mart_neo_history`: historial de aproximaciones de asteroides para gráfica de tendencias.
- `mart_mars_climate`: serie temporal del clima marciano por sol (día marciano).

### 3. API REST (FastAPI)

Base URL: `http://localhost:8000`

| Endpoint | Descripción |
|---|---|
| `GET /health` | Healthcheck |
| `GET /api/v1/alerts/` | Alertas unificadas filtradas por `hours`, `severity`, `alert_type` |
| `GET /api/v1/alerts/summary` | KPIs del día (system_status, solar_alerts_24h, high_risk_neos...) |
| `GET /api/v1/asteroids/` | NEOs con risk score, filtro por `days_ahead` y `risk_level` |
| `GET /api/v1/asteroids/hazardous` | Solo asteroides potencialmente peligrosos |
| `GET /api/v1/solar/events` | Eventos solares por `hours` |
| `GET /api/v1/solar/flares` | Solo llamaradas solares |
| `GET /api/v1/earth/events` | Eventos naturales EONET por `category` y `status` |
| `GET /api/v1/earth/categories` | Conteo de eventos activos por categoría |
| `GET /api/v1/mars/weather` | Serie temporal del clima marciano |
| `GET /api/v1/mars/weather/latest` | Último registro del rover InSight |
| `GET /api/v1/satellites/` | Observaciones de satélites, con filtro `anomalous_only` |
| `GET /api/v1/satellites/anomalies` | Anomalías orbitales de las últimas N horas |
| `GET /api/summary` | Ruta de compatibilidad (equivale a `/api/v1/alerts/summary`) |
| `GET /api/alerts` | Ruta de compatibilidad (equivale a `/api/v1/alerts/`) |

La documentación interactiva Swagger está disponible en `http://localhost:8000/docs`.

### 4. Dashboard (React)

El hook `useSpacePulse` realiza todas las peticiones en paralelo al arrancar y refresca cada 5 minutos (`VITE_POLL_INTERVAL_MS`). Los componentes son independientes: si un endpoint falla, el resto del dashboard sigue funcionando.

---

## Puesta en marcha

### Prerrequisitos

- Docker + Docker Compose
- Python 3.11+ con pip (para ejecutar dbt y la API en local si no usas Docker)
- Node.js 20+ (solo si desarrollas el frontend fuera de Docker)
- Una [NASA API Key](https://api.nasa.gov/) — puedes usar `DEMO_KEY` con límites bajos

### 1. Variables de entorno

Copia `.env.example` a `.env` y ajusta los valores:

```bash
cp .env.example .env
```

Mínimo imprescindible:

```env
NASA_API_KEY=TU_KEY_AQUI
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123secure
```

### 2. Levantar toda la infraestructura

```bash
docker compose up -d
```

Esto arranca: Postgres, MinIO, ClickHouse, Airflow (init + webserver + scheduler), Zookeeper, Kafka, Kafka UI, Grafana, API y Frontend.

Espera ~60 segundos a que Airflow inicialice. Puedes comprobar el estado con:

```bash
docker compose ps
```

### 3. Ejecutar los DAGs para generar datos

Entra a Airflow en http://localhost:8080 (admin / admin):

1. Activa los DAGs que quieras desde el toggle de la columna izquierda.
2. Haz clic en el botón **Trigger DAG** (icono play) para ejecutarlos manualmente y generar datos inmediatamente.
3. El DAG `solar_weather_pipeline` y `earth_events_pipeline` son los más rápidos en producir alertas.

### 4. Ejecutar dbt para transformar los datos

Si corres dbt en local (fuera de Docker):

```bash
pip install dbt-core dbt-clickhouse
cd dbt
dbt debug       # verifica la conexión a ClickHouse
dbt run         # ejecuta todos los modelos
dbt test        # verifica la integridad de los datos
```

Para ejecutar solo una capa:

```bash
dbt run --select staging
dbt run --select intermediate
dbt run --select marts
```

### 5. Acceder al dashboard

El frontend ya está disponible en http://localhost:5173 si levantaste Docker Compose. Si quieres ejecutarlo en local:

```bash
cd frontend
npm install
npm run dev
```

---

## Desarrollo en local (sin Docker para API y frontend)

Si prefieres desarrollar la API o el frontend fuera de Docker:

```bash
# Crear y activar virtualenv
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# Instalar dependencias
pip install fastapi uvicorn clickhouse-connect minio httpx python-dotenv kafka-python

# Arrancar la API con hot-reload
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

```bash
# Frontend
cd frontend
npm install
npm run dev       # http://localhost:5173
npm run build     # Build de producción
```

---

## Modelos dbt: capas y materialización

| Capa | Materialización | Esquema ClickHouse |
|---|---|---|
| staging | view (no persiste datos) | `space_pulse_dev_staging` |
| intermediate | table (recalculada completa en cada `dbt run`) | `space_pulse_dev_intermediate` |
| marts | incremental (solo añade filas nuevas) | `space_pulse_dev_marts` |

La `unique_key` de los marts es `id`, lo que permite actualizaciones idempotentes.

---

## Detección de anomalías en satélites

El módulo `processing/anomaly/satellite_anomaly.py` implementa un detector no supervisado con **Isolation Forest** (scikit-learn):

- **Features**: `altitude_km`, `inclination_deg`, `period_minutes`, `mean_motion_rev_day`, `eccentricity`
- **Contaminación**: 5% de la muestra se asume anómala por defecto
- **Output**: `anomaly_score` (0–1, menor = más anómalo) y flag `is_anomalous`
- El DAG de satélites ejecuta detección en cada batch horario antes de escribir a MinIO

---

## Troubleshooting

### El frontend no muestra datos

1. Comprueba que la API responde: `curl http://localhost:8000/health`
2. Verifica que hay datos en ClickHouse:
   ```sql
   SELECT count() FROM space_pulse_dev_marts.mart_space_alerts;
   ```
   desde http://localhost:8123/play
3. Si los marts están vacíos, activa y ejecuta los DAGs en Airflow y luego corre `dbt run`.
4. Comprueba la consola del navegador (F12) para ver errores de red/CORS.

### Los DAGs fallan en Airflow

- Revisa los logs del task desde la UI de Airflow → DAG → Task Instance → Logs.
- Los errores más comunes son rate-limit de NASA API (`DEMO_KEY` tiene 30 req/hora). Usa una API key registrada.
- Verifica que MinIO está accesible: http://localhost:9001

### Error de conexión a ClickHouse

```bash
export CLICKHOUSE_HOST=localhost
export CLICKHOUSE_PORT=8123
export CLICKHOUSE_USER=default
export CLICKHOUSE_PASSWORD=
```

Comprueba que ClickHouse responde: `curl http://localhost:8123/ping`

### `init.sql` no se ejecutó (base de datos `space_pulse` ausente)

ClickHouse solo ejecuta los scripts de `/docker-entrypoint-initdb.d/` la primera vez que el volumen se crea. Si el volumen ya existía, ejecuta el SQL manualmente desde http://localhost:8123/play pegando el contenido de `clickhouse/init.sql`.

### Límites de NASA API con `DEMO_KEY`

- NeoWs: 30 req/hora, 50 req/día
- DONKI: sin límite documentado pero recomiendan no abusar
- Obtén una key gratuita en https://api.nasa.gov/ para evitar bloqueos

---

## Variables de entorno completas

| Variable | Descripción | Valor por defecto |
|---|---|---|
| `NASA_API_KEY` | API key de NASA | `DEMO_KEY` |
| `MINIO_ACCESS_KEY` | Usuario de MinIO | `minioadmin` |
| `MINIO_SECRET_KEY` | Password de MinIO | `minioadmin123secure` |
| `CLICKHOUSE_HOST` | Host de ClickHouse | `localhost` |
| `CLICKHOUSE_PORT` | Puerto HTTP de ClickHouse | `8123` |
| `CLICKHOUSE_USER` | Usuario de ClickHouse | `default` |
| `CLICKHOUSE_PASSWORD` | Password de ClickHouse | (vacío) |
| `KAFKA_BOOTSTRAP_SERVERS` | Brokers de Kafka | `localhost:9092` |
| `KAFKA_ALERTS_TOPIC` | Topic para alertas | `space.alerts` |
| `VITE_API_URL` | URL de la API desde el frontend | `http://localhost:8000` |
| `VITE_POLL_INTERVAL_MS` | Intervalo de refresco del dashboard | `300000` (5 min) |
| `GRAFANA_ADMIN_PASSWORD` | Password de Grafana | `spacepulse` |

---

## Licencia

Pendiente de definir. Datos de NASA son de dominio público bajo la [NASA Open Data Policy](https://www.nasa.gov/open/).