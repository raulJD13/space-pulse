# tests/unit/test_clickhouse_inserter.py
"""
Unit tests for ingestion/clickhouse_inserter.py.
These tests mock the ClickHouse client so no live DB is required.
Run with: python -m pytest tests/unit/
"""
import sys
from datetime import date, datetime
from types import ModuleType
from unittest.mock import MagicMock, patch

import pytest

# Stub out clickhouse_connect before the module is imported so no
# real driver or DB connection is needed during unit tests.
_fake_cc = ModuleType("clickhouse_connect")
_fake_cc.get_client = MagicMock(return_value=MagicMock())
sys.modules.setdefault("clickhouse_connect", _fake_cc)

from ingestion.clickhouse_inserter import (  # noqa: E402
    _d,
    _dt,
    _flare_severity,
    insert_apod,
    insert_earth_events,
    insert_mars_weather,
    insert_neos,
    insert_satellite_observations,
    insert_solar_events,
)


# ─── _dt / _d helpers ────────────────────────────────────────────────────────

def test_dt_iso_string():
    result = _dt("2024-03-15T12:30:00Z")
    assert isinstance(result, datetime)
    assert result.tzinfo is None  # must be naive


def test_dt_none():
    assert _dt(None) is None


def test_dt_already_datetime():
    dt = datetime(2024, 1, 1, 10, 0, tzinfo=None)
    assert _dt(dt) == dt


def test_d_iso_string():
    result = _d("2024-03-15T12:30:00Z")
    assert isinstance(result, date)
    assert result == date(2024, 3, 15)


def test_d_date_string():
    result = _d("2024-03-15")
    assert isinstance(result, date)
    assert result == date(2024, 3, 15)


def test_d_none():
    assert _d(None) is None


# ─── _flare_severity ─────────────────────────────────────────────────────────

@pytest.mark.parametrize("class_type,expected_label,expected_num", [
    ("X1.5", "CRITICAL", 4),
    ("M5.0", "HIGH", 3),
    ("C3.2", "MEDIUM", 2),
    ("B1.0", "LOW", 1),
    ("A0.5", "LOW", 1),
    ("",     "LOW", 1),
])
def test_flare_severity(class_type, expected_label, expected_num):
    label, num = _flare_severity(class_type)
    assert label == expected_label
    assert num == expected_num


# ─── insert_neos ─────────────────────────────────────────────────────────────

def _make_neo(neo_id="12345", name="Test NEO", ca_date="2026-04-01",
              diam_min=0.1, diam_max=0.5, velocity=15.0,
              miss_lunar=10.0, miss_km=3_800_000.0,
              is_hazardous=False, is_sentry=False):
    return {
        "id": neo_id,
        "name": name,
        "_close_approach_date": ca_date,
        "estimated_diameter": {
            "kilometers": {
                "estimated_diameter_min": diam_min,
                "estimated_diameter_max": diam_max,
            }
        },
        "_velocity_km_s": velocity,
        "_miss_distance_lunar": miss_lunar,
        "_miss_distance_km": miss_km,
        "is_potentially_hazardous_asteroid": is_hazardous,
        "is_sentry_object": is_sentry,
    }


def test_insert_neos_empty():
    with patch("ingestion.clickhouse_inserter._get_client") as mock_client:
        result = insert_neos([])
    assert result == 0
    mock_client.assert_not_called()


def test_insert_neos_basic():
    neo = _make_neo()
    mock_client = MagicMock()
    with patch("ingestion.clickhouse_inserter._get_client", return_value=mock_client):
        result = insert_neos([neo])
    assert result == 1
    # Two inserts: neo_daily and space_alerts
    assert mock_client.insert.call_count == 2
    first_call = mock_client.insert.call_args_list[0]
    assert first_call.args[0] == "space_pulse.neo_daily"


def test_insert_neos_critical_risk():
    """Hazardous NEO with miss < 5 LD should be CRITICAL."""
    neo = _make_neo(is_hazardous=True, miss_lunar=3.0)
    mock_client = MagicMock()
    with patch("ingestion.clickhouse_inserter._get_client", return_value=mock_client):
        insert_neos([neo])
    neo_row = mock_client.insert.call_args_list[0].args[1][0]
    risk_level_idx = 9  # index in neo_cols list
    assert neo_row[risk_level_idx] == "CRITICAL"


def test_insert_neos_skips_missing_date():
    """NEOs without a close_approach_date should be skipped."""
    neo = _make_neo()
    neo["_close_approach_date"] = None
    mock_client = MagicMock()
    with patch("ingestion.clickhouse_inserter._get_client", return_value=mock_client):
        result = insert_neos([neo])
    assert result == 0


# ─── insert_solar_events ─────────────────────────────────────────────────────

def test_insert_solar_events_empty():
    with patch("ingestion.clickhouse_inserter._get_client") as mock_client:
        result = insert_solar_events({})
    assert result == 0


def test_insert_solar_flare():
    events = {
        "flares": [{
            "flrID": "FLR-001",
            "beginTime": "2024-03-15T10:00Z",
            "peakTime": "2024-03-15T10:30Z",
            "endTime": "2024-03-15T11:00Z",
            "classType": "M5.0",
            "sourceLocation": "S10W30",
        }],
        "cme": [],
        "storms": [],
    }
    mock_client = MagicMock()
    with patch("ingestion.clickhouse_inserter._get_client", return_value=mock_client):
        result = insert_solar_events(events)
    assert result == 1
    assert mock_client.insert.call_count == 2  # solar_events + space_alerts
    solar_row = mock_client.insert.call_args_list[0].args[1][0]
    assert solar_row[0] == "FLR-001"    # event_id
    assert solar_row[1] == "FLARE"      # event_type
    assert solar_row[6] == "HIGH"       # severity_label for M-class


def test_insert_solar_storm_kp():
    events = {
        "flares": [], "cme": [],
        "storms": [{
            "gstID": "GST-001",
            "startTime": "2024-03-15T08:00Z",
            "allKpIndex": [{"kpIndex": 7.33}],
        }],
    }
    mock_client = MagicMock()
    with patch("ingestion.clickhouse_inserter._get_client", return_value=mock_client):
        insert_solar_events(events)
    alert_row = mock_client.insert.call_args_list[1].args[1][0]
    assert alert_row[3] == "CRITICAL"  # Kp 7.33 → CRITICAL


# ─── insert_earth_events ─────────────────────────────────────────────────────

def _make_earth_event(event_id="EV001", title="Wildfire CA", category="Wildfires",
                      status="open", lat=37.0, lon=-120.0,
                      event_date="2024-03-15T00:00:00Z"):
    return {
        "event_id": event_id, "title": title, "category": category,
        "status": status, "latitude": lat, "longitude": lon,
        "event_date": event_date, "closed_date": None, "source_url": "",
    }


def test_insert_earth_events_empty():
    with patch("ingestion.clickhouse_inserter._get_client"):
        result = insert_earth_events([])
    assert result == 0


def test_insert_earth_events_basic():
    ev = _make_earth_event()
    mock_client = MagicMock()
    with patch("ingestion.clickhouse_inserter._get_client", return_value=mock_client):
        result = insert_earth_events([ev])
    assert result == 1
    assert mock_client.insert.call_count == 2  # earth_events + space_alerts
    earth_row = mock_client.insert.call_args_list[0].args[1][0]
    assert earth_row[0] == "EV001"
    assert earth_row[2] == "Wildfires"


def test_insert_earth_events_closed_no_alert():
    """Closed events should not generate space_alerts."""
    ev = _make_earth_event(status="closed")
    mock_client = MagicMock()
    with patch("ingestion.clickhouse_inserter._get_client", return_value=mock_client):
        insert_earth_events([ev])
    # Only earth_events insert, no space_alerts
    tables = [call.args[0] for call in mock_client.insert.call_args_list]
    assert "space_pulse.space_alerts" not in tables


# ─── insert_mars_weather ─────────────────────────────────────────────────────

def _make_sol(sol=750, first_utc="2022-12-01T00:00:00Z", season="summer",
              temp_avg=-60.0, temp_min=-95.0, temp_max=-20.0,
              wind=5.0, wind_dir=180.0, pressure=700.0):
    return {
        "sol": sol, "first_utc": first_utc, "season": season,
        "temp_avg_celsius": temp_avg, "temp_min_celsius": temp_min,
        "temp_max_celsius": temp_max, "wind_speed_avg_ms": wind,
        "wind_direction_degrees": wind_dir, "pressure_avg_pa": pressure,
    }


def test_insert_mars_weather_empty():
    with patch("ingestion.clickhouse_inserter._get_client"):
        result = insert_mars_weather([])
    assert result == 0


def test_insert_mars_weather_basic():
    sol = _make_sol()
    mock_client = MagicMock()
    with patch("ingestion.clickhouse_inserter._get_client", return_value=mock_client):
        result = insert_mars_weather([sol])
    assert result == 1
    mock_client.insert.assert_called_once()
    row = mock_client.insert.call_args.args[1][0]
    assert row[0] == 750            # sol
    assert row[1] == date(2022, 12, 1)  # earth_date
    assert row[8] == "summer"       # season


def test_insert_mars_weather_skips_missing_date():
    sol = _make_sol(first_utc=None)
    mock_client = MagicMock()
    with patch("ingestion.clickhouse_inserter._get_client", return_value=mock_client):
        result = insert_mars_weather([sol])
    assert result == 0


# ─── insert_satellite_observations ───────────────────────────────────────────

def _make_obs(sat_id="25544", name="ISS", ts="2024-03-15T12:00:00Z",
              alt=408.0, incl=51.6, period=92.0, mean_motion=15.6,
              ecc=0.001, score=-0.1, anomalous=False):
    return {
        "satellite_id": sat_id, "name": name, "timestamp": ts,
        "altitude_km": alt, "inclination_deg": incl, "period_minutes": period,
        "mean_motion_rev_day": mean_motion, "eccentricity": ecc,
        "anomaly_score": score, "is_anomalous": anomalous,
    }


def test_insert_satellites_empty():
    with patch("ingestion.clickhouse_inserter._get_client"):
        result = insert_satellite_observations([])
    assert result == 0


def test_insert_satellites_normal():
    obs = _make_obs()
    mock_client = MagicMock()
    with patch("ingestion.clickhouse_inserter._get_client", return_value=mock_client):
        result = insert_satellite_observations([obs])
    assert result == 1
    # Only satellite_observations insert, no alert for non-anomalous
    tables = [call.args[0] for call in mock_client.insert.call_args_list]
    assert "space_pulse.space_alerts" not in tables


def test_insert_satellites_anomalous_generates_alert():
    obs = _make_obs(score=-0.5, anomalous=True)
    mock_client = MagicMock()
    with patch("ingestion.clickhouse_inserter._get_client", return_value=mock_client):
        result = insert_satellite_observations([obs])
    assert result == 1
    tables = [call.args[0] for call in mock_client.insert.call_args_list]
    assert "space_pulse.space_alerts" in tables
    alert_row = mock_client.insert.call_args_list[1].args[1][0]
    assert alert_row[1] == "SATELLITE_ANOMALY"
    assert alert_row[3] == "HIGH"  # abs(-0.5) > 0.3 → HIGH


def test_insert_satellites_anomalous_medium_score():
    obs = _make_obs(score=-0.1, anomalous=True)
    mock_client = MagicMock()
    with patch("ingestion.clickhouse_inserter._get_client", return_value=mock_client):
        insert_satellite_observations([obs])
    alert_row = mock_client.insert.call_args_list[1].args[1][0]
    assert alert_row[3] == "MEDIUM"  # abs(-0.1) < 0.3 → MEDIUM


# ─── insert_apod ─────────────────────────────────────────────────────────────

def _make_apod():
    return {
        "date": "2024-03-15",
        "title": "Orion Nebula",
        "explanation": "A star-forming region...",
        "media_type": "image",
        "url": "https://apod.nasa.gov/apod/image/2403/orion.jpg",
        "hdurl": "https://apod.nasa.gov/apod/image/2403/orion_hd.jpg",
        "thumbnail_url": None,
        "copyright": "NASA",
    }


def test_insert_apod_empty():
    with patch("ingestion.clickhouse_inserter._get_client"):
        result = insert_apod({})
    assert result == 0


def test_insert_apod_basic():
    apod = _make_apod()
    mock_client = MagicMock()
    with patch("ingestion.clickhouse_inserter._get_client", return_value=mock_client):
        result = insert_apod(apod)
    assert result == 1
    mock_client.insert.assert_called_once()
    row = mock_client.insert.call_args.args[1][0]
    assert row[0] == date(2024, 3, 15)
    assert row[1] == "Orion Nebula"
    assert row[6] == ""  # thumbnail_url None → ""
    assert row[7] == "NASA"


def test_insert_apod_missing_date():
    apod = _make_apod()
    apod["date"] = None
    mock_client = MagicMock()
    with patch("ingestion.clickhouse_inserter._get_client", return_value=mock_client):
        result = insert_apod(apod)
    assert result == 0
    mock_client.insert.assert_not_called()
