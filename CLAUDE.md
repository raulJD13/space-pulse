# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Space Pulse is a space threat monitoring platform. It ingests NASA data (NEOs and solar weather events), stores raw JSON in MinIO (S3-compatible data lake), transforms data via dbt in ClickHouse, and serves it through a FastAPI backend consumed by a React dashboard.

**End-to-end flow:** Airflow DAGs → MinIO (raw JSON) → ClickHouse raw views (via `s3()`) → dbt models → FastAPI → React

## Infrastructure

Start all infrastructure services (Postgres, MinIO, ClickHouse, Airflow):

```bash
docker compose up -d
```

Service URLs:
- Airflow UI: http://localhost:8080 (admin/admin)
- MinIO Console: http://localhost:9001
- ClickHouse HTTP: http://localhost:8123/play

## Development Commands

### API (FastAPI)
```bash
# Install dependencies
pip install fastapi uvicorn clickhouse-connect minio httpx python-dotenv

# Run with hot reload
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```
API available at http://localhost:8000

### Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
Frontend available at http://localhost:5173

### dbt transformations
```bash
pip install dbt-core dbt-clickhouse

cd dbt
dbt debug        # verify connection to ClickHouse
dbt run          # run all models
dbt test         # run data tests
dbt run --select staging    # run only staging layer
```

### Manual ingestion test
```bash
python scripts/test_nasa_api.py
```

## Environment Variables

Copy from `.env` (already present, not committed to git):
- `NASA_API_KEY` — NASA API key (DEMO_KEY works with rate limits)
- `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` — MinIO credentials
- `CLICKHOUSE_HOST`, `CLICKHOUSE_PORT`, `CLICKHOUSE_USER`, `CLICKHOUSE_PASSWORD`

## Architecture

### Data Layers

**Raw layer:** Airflow DAGs extract from NASA APIs and write JSON files to MinIO with path partitioning:
- `space-pulse-raw/neows/YYYY/MM/DD/HHMMSS.json`
- `space-pulse-raw/donki/YYYY/MM/DD/HHMMSS.json`

**ClickHouse raw views:** Created manually via `s3()` function pointing to MinIO. Must be created before running dbt (see README for SQL). These are not managed by dbt.

**dbt models (in `dbt/models/`):**
- `staging/` — materialized as views; parses/cleans raw JSON fields
- `intermediate/` — materialized as tables; computes `int_neo_risk_score` and `int_solar_storm_level`
- `marts/` — materialized as incremental tables; produces `mart_space_alerts` and `mart_daily_summary` (queried by the API)

dbt profile: `space_pulse_clickhouse` (configured in `dbt/profiles.yml`)
dbt target schema prefix: `space_pulse_dev_` (marts land in `space_pulse_dev_marts`)

### Backend (api/main.py)
Single FastAPI file. Connects directly to ClickHouse on each request (no connection pooling). Reads from `space_pulse_dev_marts.mart_daily_summary` and `space_pulse_dev_marts.mart_space_alerts`.

### Frontend (frontend/src/)
Single-page React app in `App.jsx`. Uses `src/api/spaceApi.js` (Axios client) to call `GET /api/summary` and `GET /api/alerts`. Displays KPI widgets, a Recharts bar chart of alert severity distribution, and a detailed alerts table.

### Airflow DAGs (airflow/dags/)
- `dag_near_earth_objects.py` — daily at 06:00 UTC, uses `ingestion/clients/neows_client.py`
- `dag_solar_weather.py` — every 30 min, uses `ingestion/clients/donki_client.py`

The `ingestion/` directory is volume-mounted into Airflow containers so DAGs can import from it.

## Key Constraints

- FastAPI and frontend are **not** started by `docker compose up` — they must be run locally.
- ClickHouse raw views (`neows_raw`, `donki_flares_raw`) must be created manually before running `dbt run`.
- The `venv/` directory is excluded from git. Python dependencies are managed manually via `pip install`.
