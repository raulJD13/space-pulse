# Space Pulse

Space Pulse is a space threat monitoring platform that ingests data from seven NASA APIs, stores raw JSON in MinIO, writes structured records into ClickHouse, and serves them through a FastAPI backend consumed by a React dashboard. A separate dbt layer transforms raw tables into Grafana-ready marts.

---

## Architecture

```
NASA APIs
  NeoWs · DONKI · EONET · EPIC · InSight · TLE · APOD
         │
         ▼  (async httpx, retry, rate-limit)
  Airflow DAGs  (6 scheduled pipelines)
         │
         ├──► MinIO  space-pulse-raw/  (raw JSON archive)
         │
         └──► ClickHouse  space_pulse.*  (raw typed tables)
                    │
                    ├──► FastAPI  /api/v1/*
                    │         │
                    │         └──► React dashboard  :5173
                    │
                    └──► dbt  space_pulse_dev_*
                              │
                              └──► Grafana  :3000
```

Kafka receives satellite anomaly alerts from the TLE pipeline but has no consumer in this codebase — it is available for downstream integrations.

---

## Data flow

### 1. Ingestion (Airflow → MinIO + ClickHouse)

Each DAG follows the same three-task pattern:

```
extract  →  save_to_minio  →  insert_to_clickhouse
```

The satellite pipeline adds two extra steps:

```
extract  →  compute_orbital_params  →  detect_anomalies
         →  save_to_minio  +  alert_anomalies (Kafka)  +  insert_to_clickhouse
```

`insert_to_clickhouse` writes to both a domain table (`neo_daily`, `solar_events`, …) and `space_pulse.space_alerts` (the unified alert table the API reads from) in the same call via `ingestion/clickhouse_inserter.py`.

### 2. Storage layout

**MinIO** (`space-pulse-raw` bucket):

| Path pattern | DAG |
|---|---|
| `neows/YYYY/MM/DD/HHMMSS.json` | near_earth_objects |
| `donki/YYYY/MM/DD/HHMMSS.json` | solar_weather |
| `eonet/YYYY/MM/DD/HHMMSS.json` | earth_events |
| `epic/YYYY/MM/DD/images_metadata.json` | earth_events |
| `insight/YYYY/MM/daily.json` | mars_weather |
| `tle/YYYY/MM/DD/HHMMSS.json` | satellite_tle |
| `apod/YYYY/MM/DD.json` | apod |

**ClickHouse** (`space_pulse` database, created by `clickhouse/init.sql`):

| Table | Engine | Populated by |
|---|---|---|
| `neo_daily` | ReplacingMergeTree | NeoWs DAG |
| `solar_events` | MergeTree (partitioned by month) | DONKI DAG |
| `earth_events` | MergeTree (partitioned by month) | EONET DAG |
| `epic_images` | ReplacingMergeTree | (schema only; EPIC metadata stays in MinIO) |
| `mars_weather` | ReplacingMergeTree | InSight DAG |
| `satellite_observations` | MergeTree (TTL 90 days) | TLE DAG |
| `apod` | ReplacingMergeTree | APOD DAG |
| `space_alerts` | MergeTree (TTL 365 days) | All DAGs (via clickhouse_inserter) |
| `v_daily_summary` | VIEW over space_alerts | — |

### 3. dbt transformations (for Grafana)

dbt runs after ClickHouse is healthy (one-shot Docker service). It reads from the raw tables above and produces three schema layers:

| Layer | Materialization | Schema prefix | Purpose |
|---|---|---|---|
| `staging/` | view | `space_pulse_dev_staging` | Type-clean columns, no logic |
| `intermediate/` | table | `space_pulse_dev_intermediate` | Risk scores, severity levels |
| `marts/` | incremental | `space_pulse_dev_marts` | Aggregated tables for Grafana |

**Important:** the FastAPI backend reads exclusively from `space_pulse.*` raw tables, not the dbt marts. dbt output is used only by Grafana.

### 4. Risk scoring

NEO risk score: `(diameter_max_km³ × velocity_km_s) / max(miss_distance_lunar, 0.1)`

| Level | Condition |
|---|---|
| CRITICAL | `is_hazardous = true` AND `miss_distance_lunar < 5` |
| HIGH | `risk_score > 10` |
| MEDIUM | `risk_score > 1` |
| LOW | `risk_score ≤ 1` |

The formula is implemented identically in `processing/parsers/neo_scorer.py` (called by the Airflow inserter at write time) and `dbt/models/intermediate/int_neo_risk_score.sql` (recalculated in the dbt layer for Grafana).

Satellite anomaly detection uses Isolation Forest (`scikit-learn`) on four orbital features: altitude, inclination, orbital period, mean motion. Anomalous observations are flagged in `satellite_observations.is_anomalous` and published to the Kafka topic `space.alerts`.

---

## Services

| Service | Port | Image / Source |
|---|---|---|
| `clickhouse` | 8123 (HTTP), 9009 (native) | `clickhouse/clickhouse-server:24.1` |
| `postgres` | — (internal) | `postgres:15` (Airflow metadata only) |
| `minio` | 9000 (API), 9001 (console) | `minio/minio:latest` |
| `minio-init` | — | `minio/mc` — creates `space-pulse-raw` bucket (one-shot) |
| `zookeeper` | — | `confluentinc/cp-zookeeper:7.5.0` |
| `kafka` | 9092 | `confluentinc/cp-kafka:7.5.0` |
| `kafka-ui` | 8090 | `provectuslabs/kafka-ui:latest` |
| `airflow-init` | — | `apache/airflow:2.8.0-python3.11` — DB migrate + admin user (one-shot) |
| `airflow-webserver` | 8080 | same image |
| `airflow-scheduler` | — | same image |
| `grafana` | 3000 | `grafana/grafana-oss:10.3.0` + clickhouse plugin |
| `dbt` | — | `dbt/Dockerfile` — runs all 14 models (one-shot) |
| `api` | 8000 | `api/Dockerfile` |
| `frontend` | 5173 | `frontend/Dockerfile` |

---

## Running with Docker

**Prerequisites:** Docker with Compose V2 (no other local dependencies required).

```bash
cp .env.example .env        # set NASA_API_KEY if you want real data
docker compose up -d --build
```

All services start in dependency order. One-shot containers (`minio-init`, `dbt`, `airflow-init`) exit after completing their setup work.

**Service URLs after startup:**

| URL | What |
|---|---|
| http://localhost:5173 | React dashboard |
| http://localhost:8000/docs | FastAPI interactive docs |
| http://localhost:8080 | Airflow UI (admin / admin) |
| http://localhost:9001 | MinIO console (minioadmin / minioadmin123secure) |
| http://localhost:3000 | Grafana (admin / spacepulse) |
| http://localhost:8090 | Kafka UI |

**On first start the database is empty.** Trigger the Airflow DAGs manually from the Airflow UI to populate data, then re-run dbt if you want Grafana marts updated:

```bash
docker compose run --rm dbt run --profiles-dir /dbt
```

---

## Running locally (without Docker for API/frontend)

Infrastructure (ClickHouse, MinIO, Airflow, etc.) must still be running via Docker Compose.

### API

```bash
pip install fastapi uvicorn clickhouse-connect httpx

# Adjust host if ClickHouse is not on localhost
export CLICKHOUSE_HOST=localhost

uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend

```bash
cd frontend
npm install --legacy-peer-deps   # react-simple-maps@3 has no React 19 peer decl
npm run dev
```

`VITE_API_URL` defaults to `http://localhost:8000`. Set it in `.env` or as a shell variable to point elsewhere.

### dbt

```bash
pip install dbt-core dbt-clickhouse

cd dbt
export CLICKHOUSE_HOST=localhost
dbt run --profiles-dir .
```

---

## DAG schedules

| DAG | Schedule | Source API |
|---|---|---|
| `apod_pipeline` | `5 0 * * *` (00:05 UTC daily) | NASA APOD |
| `near_earth_objects_pipeline` | `0 6 * * *` (06:00 UTC daily) | NASA NeoWs |
| `mars_weather_pipeline` | `0 8 * * *` (08:00 UTC daily) | NASA InSight |
| `solar_weather_pipeline` | `*/30 * * * *` (every 30 min) | NASA DONKI |
| `earth_events_pipeline` | `@hourly` | NASA EONET + EPIC |
| `satellite_tle_pipeline` | `@hourly` | TLE API (Celestrak-compatible) |

All DAGs have `catchup=False`, 2 retries, 5-minute retry delay.

---

## API reference

Base URL: `http://localhost:8000`

### v1 endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/alerts/` | Alerts from `space_pulse.space_alerts`. Params: `severity`, `alert_type`, `hours` (1–168, default 24), `limit` (max 200) |
| GET | `/api/v1/alerts/summary` | Daily counts + system status derived from `space_alerts` |
| GET | `/api/v1/solar/events` | Solar events (flares, CME, storms). Params: `hours`, `limit` |
| GET | `/api/v1/solar/flares` | Flares only. Param: `limit` |
| GET | `/api/v1/asteroids/` | NEOs ordered by risk score. Params: `risk_level`, `days_ahead` (1–30, default 7), `limit` |
| GET | `/api/v1/asteroids/hazardous` | Potentially hazardous only, ordered by close approach date |
| GET | `/api/v1/earth/events` | EONET natural events. Params: `category`, `status` (default `open`), `limit` |
| GET | `/api/v1/earth/categories` | Event categories with counts |
| GET | `/api/v1/mars/weather` | Mars weather history (up to 100 sols). Param: `limit` |
| GET | `/api/v1/mars/weather/latest` | Most recent sol |
| GET | `/api/v1/satellites/` | Satellite observations. Params: `anomalous_only`, `limit` |
| GET | `/api/v1/satellites/anomalies` | Anomalous satellites only. Param: `hours` |
| GET | `/api/v1/apod/` | Today's APOD (4-layer fallback; see below) |
| GET | `/health` | `{"status":"ok"}` |

Legacy aliases `/api/summary` and `/api/alerts` call the v1 handlers directly.

### APOD resolution order

1. In-memory cache (1-hour TTL, today's date only)
2. ClickHouse — today's row inserted by Airflow
3. NASA APOD API (direct call when today's row is not yet in DB)
4. ClickHouse — most recent row (fallback on NASA rate-limit / error)

The frontend (`spaceApi.js`) adds a second client-side in-memory cache with the same 1-hour TTL and deduplicates concurrent in-flight requests.

---

## Environment variables

Copy `.env.example` to `.env`. Only `NASA_API_KEY` needs to change for real data; everything else has working defaults.

| Variable | Default | Used by |
|---|---|---|
| `NASA_API_KEY` | `DEMO_KEY` | All Airflow DAGs + API APOD fallback |
| `VITE_NASA_API_KEY` | `DEMO_KEY` | Browser (APOD direct calls if needed) |
| `MINIO_ACCESS_KEY` | `minioadmin` | MinIO, Airflow DAGs |
| `MINIO_SECRET_KEY` | `minioadmin123secure` | MinIO, Airflow DAGs |
| `CLICKHOUSE_HOST` | `clickhouse` (Docker) / `localhost` (local) | API, dbt, clickhouse_inserter |
| `CLICKHOUSE_PORT` | `8123` | API |
| `CLICKHOUSE_USER` | `default` | API |
| `CLICKHOUSE_PASSWORD` | _(empty)_ | API |
| `KAFKA_BOOTSTRAP_SERVERS` | `kafka:29092` (Docker) | TLE DAG |
| `AIRFLOW_ADMIN_USER` | `admin` | airflow-init |
| `AIRFLOW_ADMIN_PASSWORD` | `admin` | airflow-init |
| `GRAFANA_ADMIN_PASSWORD` | `spacepulse` | Grafana |
| `VITE_API_URL` | `http://localhost:8000` | Frontend |

---

## Directory structure

```
space-pulse/
├── airflow/
│   └── dags/                   # 6 Airflow DAGs (one per data source)
├── ingestion/
│   ├── clients/                # Async httpx clients for each NASA API
│   ├── clickhouse_inserter.py  # Shared insert helpers; writes raw tables + space_alerts
│   ├── minio_storage.py        # MinIO put/get/list wrapper
│   └── kafka_producer.py       # Confluent Kafka producer (lazy-init)
├── processing/
│   ├── parsers/
│   │   ├── neo_scorer.py       # NeoRiskScorer (same formula as dbt int_neo_risk_score)
│   │   ├── storm_classifier.py # DONKI storm severity mapping
│   │   └── tle_parser.py       # TLE orbital parameter parser
│   └── anomaly/
│       └── satellite_anomaly.py # Isolation Forest anomaly detector
├── api/
│   ├── main.py                 # FastAPI app, CORS, router registration
│   ├── routers/                # alerts, solar, asteroids, earth, mars, satellites, apod
│   ├── models/                 # Pydantic response models
│   ├── db/clickhouse.py        # get_client() + execute_query() helpers
│   └── Dockerfile
├── dbt/
│   ├── profiles.yml            # ClickHouse connection (host from CLICKHOUSE_HOST env var)
│   ├── dbt_project.yml         # Materialization config per layer
│   ├── models/
│   │   ├── staging/            # Views; clean raw columns
│   │   ├── intermediate/       # Tables; risk scores, severity classification
│   │   └── marts/              # Incremental tables consumed by Grafana
│   └── Dockerfile
├── clickhouse/
│   └── init.sql                # Creates space_pulse database, all raw tables, v_daily_summary view
├── frontend/
│   ├── src/
│   │   ├── api/spaceApi.js     # Axios v1 client + APOD cache/dedup
│   │   └── [components]        # App, Header, EarthGlobe, APOD, SolarStatus, …
│   ├── vite.config.js
│   └── Dockerfile
├── grafana/provisioning/       # Grafana datasource + dashboard provisioning
├── docker-compose.yml
├── .env.example
└── .dockerignore
```

---

## Known limitations

- **Mars data is static.** The InSight lander mission ended December 2022. The DAG runs daily but the API returns only historical sols; no new data will appear.

- **EPIC images are not in ClickHouse.** The `earth_events_pipeline` fetches EPIC image metadata and saves it to MinIO, but does not insert it into the `epic_images` table. The `epic_images` schema exists in `init.sql` but is empty.

- **API has no connection pooling.** `api/db/clickhouse.py` creates a new ClickHouse client on every request.

- **CORS origins are hardcoded** to `http://localhost:5173` and `http://localhost:3000`. Requests from other origins will be rejected.

- **dbt marts are not used by the API.** The API reads from `space_pulse.*` raw tables. dbt output (`space_pulse_dev_*`) is intended for Grafana only. If you skip running dbt, the dashboard still works; Grafana panels will be empty.

- **The TLE source API can be unavailable.** The satellite DAG catches `httpx` errors and returns an empty list, so a failed TLE fetch causes the run to succeed with zero observations rather than failing.

- **`DEMO_KEY` rate limits.** Using the default NASA API key allows ~30 requests/hour. High-frequency DAGs (solar at 30 min, earth/satellite at 1 hr) will hit rate limits quickly. Register a free key at https://api.nasa.gov.

- **No `requirements.txt`.** Python dependencies are managed per-Dockerfile (`api/Dockerfile`, `dbt/Dockerfile`) and via `_PIP_ADDITIONAL_REQUIREMENTS` for Airflow. There is no top-level lockfile.

## Contributing

1. Fork the repo
2. Create a branch: `git checkout -b feat/new-feature`
3. Run tests/lint before opening a PR
4. Open a Pull Request with a clear description and screenshots if applicable

---

## License

MIT.

---

## Author

Raul Jimenez
Contact: `raul.jimenez.del@gmail.com` 
linkedin: https://www.linkedin.com/in/rauljimenezdelgado/
---

## Note

With a single command you can spin up a complete, containerized data platform:

* Kafka (event bus)
* Spark (distributed processing)
* MinIO (S3-compatible lakehouse storage)
* Producer (real-time ingestion)
* Streaming ETL job
* Analytics dashboard
