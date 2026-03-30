# tests/integration/test_api_endpoints.py
"""
Integration tests that hit the live FastAPI server and ClickHouse.
Prerequisites:
  1. ClickHouse running (docker compose up -d clickhouse)
  2. Airflow DAGs executed at least once (populates space_pulse.* tables)
  3. API running: uvicorn api.main:app --port 8000

Run with: python -m pytest tests/integration/ -v
"""
import pytest
import httpx

BASE = "http://localhost:8000/api/v1"


@pytest.fixture(scope="session")
def client():
    with httpx.Client(base_url=BASE, timeout=10) as c:
        yield c


# ─── /alerts ─────────────────────────────────────────────────────────────────

def test_alerts_summary_returns_dict(client):
    r = client.get("/alerts/summary")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, dict), "summary should be a dict"
    assert "total_alerts_today" in data
    assert "system_status" in data


def test_alerts_summary_counts_non_negative(client):
    data = client.get("/alerts/summary").json()
    for key in ("total_alerts_today", "critical_today", "solar_alerts_24h",
                "high_risk_neos_upcoming", "earth_events_24h", "satellite_anomalies_24h"):
        assert data.get(key, 0) >= 0, f"{key} should be >= 0"


def test_alerts_list_returns_list(client):
    r = client.get("/alerts/")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_alerts_list_has_data(client):
    """After DAGs run, there should be at least one alert."""
    data = client.get("/alerts/?hours=168").json()
    assert len(data) > 0, "Expected alerts after pipelines ran"


def test_alerts_list_schema(client):
    items = client.get("/alerts/?limit=1").json()
    if not items:
        pytest.skip("No alerts yet — run Airflow DAGs first")
    item = items[0]
    for field in ("alert_id", "alert_type", "created_at", "severity", "description"):
        assert field in item, f"Missing field: {field}"


def test_alerts_severity_filter(client):
    for sev in ("LOW", "MEDIUM", "HIGH", "CRITICAL"):
        r = client.get(f"/alerts/?severity={sev}&hours=168")
        assert r.status_code == 200
        for item in r.json():
            assert item["severity"] == sev


# ─── /asteroids ──────────────────────────────────────────────────────────────

def test_asteroids_returns_list(client):
    r = client.get("/asteroids/")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_asteroids_has_data(client):
    data = client.get("/asteroids/?days_ahead=30").json()
    assert len(data) > 0, "Expected NEOs after neo_pipeline ran"


def test_asteroids_schema(client):
    items = client.get("/asteroids/?days_ahead=30&limit=1").json()
    if not items:
        pytest.skip("No asteroids yet — run near_earth_objects_pipeline first")
    item = items[0]
    for field in ("neo_id", "neo_name", "close_approach_date", "velocity_km_s",
                  "miss_distance_lunar", "risk_score", "risk_level"):
        assert field in item, f"Missing field: {field}"


def test_asteroids_risk_level_valid(client):
    items = client.get("/asteroids/?days_ahead=30&limit=20").json()
    valid_levels = {"LOW", "MEDIUM", "HIGH", "CRITICAL"}
    for item in items:
        assert item["risk_level"] in valid_levels


# ─── /solar ──────────────────────────────────────────────────────────────────

def test_solar_events_returns_list(client):
    r = client.get("/solar/events?hours=168")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_solar_events_schema(client):
    items = client.get("/solar/events?hours=168&limit=1").json()
    if not items:
        pytest.skip("No solar events yet — run solar_weather_pipeline first")
    item = items[0]
    for field in ("event_id", "event_type", "begin_time", "class_type", "severity_label"):
        assert field in item, f"Missing field: {field}"


# ─── /earth ──────────────────────────────────────────────────────────────────

def test_earth_events_returns_list(client):
    r = client.get("/earth/events")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_earth_events_has_data(client):
    """Verifies the dedup query doesn't silently return [] due to an
    ILLEGAL_AGGREGATION error from WHERE/alias conflicts in ClickHouse."""
    data = client.get("/earth/events?status=open").json()
    assert len(data) > 0, "Expected EONET events after earth_events_pipeline ran"


def test_earth_events_schema(client):
    items = client.get("/earth/events?limit=1").json()
    if not items:
        pytest.skip("No earth events yet — run earth_events_pipeline first")
    item = items[0]
    for field in ("event_id", "title", "category", "status", "event_date"):
        assert field in item, f"Missing field: {field}"


def test_earth_events_no_duplicate_event_ids(client):
    """Each event_id must appear at most once — duplicate rows in ClickHouse
    must be collapsed by the GROUP BY in the API query."""
    items = client.get("/earth/events?limit=200").json()
    if not items:
        pytest.skip("No earth events yet — run earth_events_pipeline first")
    ids = [item["event_id"] for item in items]
    assert len(ids) == len(set(ids)), (
        f"Duplicate event_ids returned: "
        f"{[id for id in set(ids) if ids.count(id) > 1]}"
    )


# ─── /mars ───────────────────────────────────────────────────────────────────

def test_mars_weather_latest_returns_dict(client):
    r = client.get("/mars/weather/latest")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, dict)


def test_mars_weather_latest_has_data(client):
    data = client.get("/mars/weather/latest").json()
    assert data, "Expected Mars weather data after mars_weather_pipeline ran"
    assert "sol" in data
    assert "temp_avg_celsius" in data


def test_mars_weather_history_returns_list(client):
    r = client.get("/mars/weather?limit=10")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


# ─── /satellites ─────────────────────────────────────────────────────────────

def test_satellites_returns_list(client):
    r = client.get("/satellites/")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_satellites_schema(client):
    items = client.get("/satellites/?limit=1").json()
    if not items:
        pytest.skip("No satellite data yet — run satellite_tle_pipeline first")
    item = items[0]
    for field in ("satellite_id", "satellite_name", "timestamp",
                  "altitude_km", "inclination_deg", "anomaly_score", "is_anomalous"):
        assert field in item, f"Missing field: {field}"


# ─── /apod ───────────────────────────────────────────────────────────────────

def test_apod_returns_dict(client):
    r = client.get("/apod/")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, dict)


def test_apod_has_required_fields(client):
    data = client.get("/apod/").json()
    for field in ("date", "title", "url", "explanation"):
        assert field in data, f"APOD missing field: {field}"


def test_apod_url_is_string(client):
    data = client.get("/apod/").json()
    assert isinstance(data.get("url", ""), str)
    assert data.get("url", "").startswith("http")


def test_apod_served_from_clickhouse_not_nasa(client):
    """APOD must be served from ClickHouse (populated by Airflow) rather than
    the NASA API so that 429 rate-limit errors are never surfaced to clients.
    Two rapid consecutive requests must both succeed (second from in-memory cache)."""
    r1 = client.get("/apod/")
    r2 = client.get("/apod/")
    assert r1.status_code == 200, "First APOD request failed — ClickHouse may be empty"
    assert r2.status_code == 200, "Second APOD request failed — in-memory cache may be broken"
    assert r1.json().get("title") == r2.json().get("title"), "Inconsistent title across requests"


def test_apod_title_non_empty(client):
    """Title must be a non-empty string — required for APOD card overlay and metadata."""
    data = client.get("/apod/").json()
    title = data.get("title", "")
    assert isinstance(title, str) and len(title) > 0, "APOD title is empty or missing"


def test_apod_explanation_present(client):
    """Explanation/description must be present — now rendered in the APOD card."""
    data = client.get("/apod/").json()
    explanation = data.get("explanation", "")
    assert isinstance(explanation, str) and len(explanation) > 0, "APOD explanation missing"
