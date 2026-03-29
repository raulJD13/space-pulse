# ingestion/clickhouse_inserter.py
"""
Shared ClickHouse insertion helpers used by all Airflow DAGs.
Each function receives already-parsed/flattened data and inserts it
into the appropriate space_pulse.* raw table, then upserts derived
alert rows into space_pulse.space_alerts.
"""
import json
import logging
import os
import uuid
from datetime import date, datetime, timezone
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

CLICKHOUSE_HOST = os.environ.get("CLICKHOUSE_HOST", "clickhouse")
CLICKHOUSE_PORT = int(os.environ.get("CLICKHOUSE_PORT", "8123"))

SEVERITY_NUMERIC = {"LOW": 1, "MEDIUM": 2, "HIGH": 3, "CRITICAL": 4}


def _get_client():
    import clickhouse_connect

    return clickhouse_connect.get_client(
        host=CLICKHOUSE_HOST,
        port=CLICKHOUSE_PORT,
        username="default",
        password="",
    )


def _dt(value) -> Optional[datetime]:
    """Parse ISO string / datetime → naive datetime (ClickHouse requires naive UTC)."""
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.replace(tzinfo=None)
    try:
        dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        return dt.replace(tzinfo=None)
    except Exception:
        return None


def _d(value) -> Optional[date]:
    """Parse date string / datetime → date."""
    if value is None:
        return None
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    dt = _dt(value)
    return dt.date() if dt else None


def _flare_severity(class_type: str):
    letter = (class_type or "")[:1].upper()
    label = {"X": "CRITICAL", "M": "HIGH", "C": "MEDIUM"}.get(letter, "LOW")
    return label, SEVERITY_NUMERIC[label]


# ─── NEOs ────────────────────────────────────────────────────────────────────

def insert_neos(neos: List[Dict]) -> int:
    """Insert flattened NeoWs objects into neo_daily + space_alerts."""
    if not neos:
        logger.info("No NEOs to insert")
        return 0

    client = _get_client()
    today = date.today()
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    neo_cols = [
        "neo_id", "neo_name", "close_approach_date",
        "diameter_min_km", "diameter_max_km",
        "velocity_km_s", "miss_distance_lunar", "miss_distance_km",
        "risk_score", "risk_level", "is_hazardous", "is_sentry_monitored",
        "days_until_approach",
    ]
    alert_cols = [
        "alert_id", "alert_type", "created_at", "severity",
        "severity_numeric", "description", "latitude", "longitude", "metadata",
    ]

    neo_rows, alert_rows = [], []

    for neo in neos:
        ca_date = _d(neo.get("_close_approach_date"))
        if not ca_date:
            continue

        diam = neo.get("estimated_diameter", {}).get("kilometers", {})
        diam_min = float(diam.get("estimated_diameter_min") or 0)
        diam_max = float(diam.get("estimated_diameter_max") or 0)
        velocity = float(neo.get("_velocity_km_s") or 0)
        miss_lunar = float(neo.get("_miss_distance_lunar") or 1)
        miss_km = float(neo.get("_miss_distance_km") or 0)
        is_hazardous = bool(neo.get("is_potentially_hazardous_asteroid", False))
        is_sentry = bool(neo.get("is_sentry_object", False))
        days_ahead = (ca_date - today).days

        risk_score = round((diam_max ** 3 * velocity) / max(miss_lunar, 0.1), 6)
        if is_hazardous and miss_lunar < 5:
            risk_level = "CRITICAL"
        elif risk_score > 10:
            risk_level = "HIGH"
        elif risk_score > 1:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"

        neo_rows.append([
            neo.get("id", ""), neo.get("name", ""), ca_date,
            diam_min, diam_max, velocity, miss_lunar, miss_km,
            risk_score, risk_level, is_hazardous, is_sentry, days_ahead,
        ])
        alert_rows.append([
            str(uuid.uuid4()), "NEAR_EARTH_OBJECT", now,
            risk_level, SEVERITY_NUMERIC[risk_level],
            f"{neo.get('name', 'NEO')} | {diam_max:.3f} km | {velocity:.1f} km/s | {miss_lunar:.1f} LD",
            None, None,
            json.dumps({"neo_id": neo.get("id"), "hazardous": is_hazardous}),
        ])

    if neo_rows:
        client.insert("space_pulse.neo_daily", neo_rows, column_names=neo_cols)
    if alert_rows:
        client.insert("space_pulse.space_alerts", alert_rows, column_names=alert_cols)

    logger.info("Inserted %d NEOs and %d alerts", len(neo_rows), len(alert_rows))
    return len(neo_rows)


# ─── Solar events ─────────────────────────────────────────────────────────────

def insert_solar_events(events: Dict) -> int:
    """Insert DONKI flares/CME/storms into solar_events + space_alerts."""
    if not events:
        logger.info("No solar events to insert")
        return 0

    client = _get_client()
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    solar_cols = [
        "event_id", "event_type", "begin_time", "peak_time", "end_time",
        "class_type", "severity_label", "severity_numeric", "source_location",
    ]
    alert_cols = [
        "alert_id", "alert_type", "created_at", "severity",
        "severity_numeric", "description", "latitude", "longitude", "metadata",
    ]

    solar_rows, alert_rows = [], []

    # Solar Flares
    for flare in events.get("flares", []):
        event_id = flare.get("flrID", "")
        if not event_id:
            continue
        class_type = flare.get("classType", "")
        sev_label, sev_num = _flare_severity(class_type)
        begin = _dt(flare.get("beginTime")) or now
        solar_rows.append([
            event_id, "FLARE", begin,
            _dt(flare.get("peakTime")), _dt(flare.get("endTime")),
            class_type, sev_label, sev_num,
            flare.get("sourceLocation", ""),
        ])
        alert_rows.append([
            str(uuid.uuid4()), "SOLAR_FLARE", begin,
            sev_label, sev_num,
            f"Solar Flare class {class_type} detected",
            None, None,
            json.dumps({"event_id": event_id, "class": class_type}),
        ])

    # Coronal Mass Ejections
    for cme in events.get("cme", []):
        event_id = cme.get("activityID", "")
        if not event_id:
            continue
        begin = _dt(cme.get("startTime")) or now
        solar_rows.append([
            event_id, "CME", begin,
            None, None, "CME", "MEDIUM", 2, "",
        ])
        alert_rows.append([
            str(uuid.uuid4()), "SOLAR_FLARE", begin,
            "MEDIUM", 2,
            "Coronal Mass Ejection detected",
            None, None,
            json.dumps({"event_id": event_id}),
        ])

    # Geomagnetic Storms
    for gst in events.get("storms", []):
        event_id = gst.get("gstID", "")
        if not event_id:
            continue
        begin = _dt(gst.get("startTime")) or now
        kp_list = gst.get("allKpIndex", [])
        max_kp = max((item.get("kpIndex", 0) for item in kp_list), default=0)
        if max_kp >= 7:
            sev_label, sev_num = "CRITICAL", 4
        elif max_kp >= 5:
            sev_label, sev_num = "HIGH", 3
        elif max_kp >= 3:
            sev_label, sev_num = "MEDIUM", 2
        else:
            sev_label, sev_num = "LOW", 1
        solar_rows.append([
            event_id, "STORM", begin,
            None, None, f"Kp{max_kp:.1f}", sev_label, sev_num, "",
        ])
        alert_rows.append([
            str(uuid.uuid4()), "GEOMAGNETIC_STORM", begin,
            sev_label, sev_num,
            f"Geomagnetic Storm Kp{max_kp:.1f}",
            None, None,
            json.dumps({"event_id": event_id, "kp_index": max_kp}),
        ])

    if solar_rows:
        client.insert("space_pulse.solar_events", solar_rows, column_names=solar_cols)
    if alert_rows:
        client.insert("space_pulse.space_alerts", alert_rows, column_names=alert_cols)

    logger.info(
        "Inserted %d solar events and %d alerts", len(solar_rows), len(alert_rows)
    )
    return len(solar_rows)


# ─── Earth events ─────────────────────────────────────────────────────────────

def insert_earth_events(events: List[Dict]) -> int:
    """Insert flattened EONET events into earth_events + space_alerts."""
    if not events:
        logger.info("No earth events to insert")
        return 0

    client = _get_client()
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    earth_cols = [
        "event_id", "title", "category", "status",
        "latitude", "longitude", "event_date", "closed_date", "source_url",
    ]
    alert_cols = [
        "alert_id", "alert_type", "created_at", "severity",
        "severity_numeric", "description", "latitude", "longitude", "metadata",
    ]

    # Category → severity mapping
    CATEGORY_SEV = {
        "Volcanoes": ("HIGH", 3),
        "Wildfires": ("HIGH", 3),
        "Severe Storms": ("HIGH", 3),
        "Earthquakes": ("HIGH", 3),
        "Floods": ("MEDIUM", 2),
        "Landslides": ("MEDIUM", 2),
        "Drought": ("MEDIUM", 2),
        "Dust and Haze": ("LOW", 1),
        "Sea and Lake Ice": ("LOW", 1),
        "Snow": ("LOW", 1),
        "Manmade": ("LOW", 1),
        "Water Color": ("LOW", 1),
    }

    earth_rows, alert_rows = [], []

    for ev in events:
        event_id = ev.get("event_id", "")
        if not event_id:
            continue
        status = ev.get("status", "open")
        event_date = _dt(ev.get("event_date")) or now
        earth_rows.append([
            event_id,
            ev.get("title", ""),
            ev.get("category", "Unknown"),
            status,
            ev.get("latitude"),
            ev.get("longitude"),
            event_date,
            _dt(ev.get("closed_date")),
            ev.get("source_url", ""),
        ])
        if status == "open":
            cat = ev.get("category", "Unknown")
            sev_label, sev_num = CATEGORY_SEV.get(cat, ("LOW", 1))
            alert_rows.append([
                str(uuid.uuid4()), "EARTH_EVENT", event_date,
                sev_label, sev_num,
                f"{cat}: {ev.get('title', '')}",
                ev.get("latitude"), ev.get("longitude"),
                json.dumps({"event_id": event_id, "category": cat}),
            ])

    if earth_rows:
        client.insert("space_pulse.earth_events", earth_rows, column_names=earth_cols)
    if alert_rows:
        client.insert("space_pulse.space_alerts", alert_rows, column_names=alert_cols)

    logger.info(
        "Inserted %d earth events and %d alerts", len(earth_rows), len(alert_rows)
    )
    return len(earth_rows)


# ─── Mars weather ─────────────────────────────────────────────────────────────

def insert_mars_weather(sols: List[Dict]) -> int:
    """Insert InSight sol records into mars_weather."""
    if not sols:
        logger.info("No Mars sols to insert")
        return 0

    client = _get_client()
    cols = [
        "sol", "earth_date", "temp_avg_celsius", "temp_min_celsius", "temp_max_celsius",
        "wind_speed_avg_ms", "wind_direction_degrees", "pressure_pa", "season",
    ]

    rows = []
    for s in sols:
        earth_date = _d(s.get("first_utc"))
        if not earth_date:
            continue
        rows.append([
            int(s.get("sol", 0)),
            earth_date,
            s.get("temp_avg_celsius"),
            s.get("temp_min_celsius"),
            s.get("temp_max_celsius"),
            s.get("wind_speed_avg_ms"),
            s.get("wind_direction_degrees"),
            s.get("pressure_avg_pa"),
            s.get("season", ""),
        ])

    if rows:
        client.insert("space_pulse.mars_weather", rows, column_names=cols)
    logger.info("Inserted %d Mars weather sols", len(rows))
    return len(rows)


# ─── Satellites ───────────────────────────────────────────────────────────────

def insert_satellite_observations(observations: List[Dict]) -> int:
    """Insert satellite orbital data + anomaly flags into satellite_observations + space_alerts."""
    if not observations:
        logger.info("No satellite observations to insert")
        return 0

    client = _get_client()
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    sat_cols = [
        "satellite_id", "satellite_name", "timestamp",
        "altitude_km", "inclination_deg", "period_minutes",
        "mean_motion_rev_day", "eccentricity", "anomaly_score", "is_anomalous",
    ]
    alert_cols = [
        "alert_id", "alert_type", "created_at", "severity",
        "severity_numeric", "description", "latitude", "longitude", "metadata",
    ]

    sat_rows, alert_rows = [], []

    for obs in observations:
        ts = _dt(obs.get("timestamp")) or now
        is_anomalous = bool(obs.get("is_anomalous", False))
        score = float(obs.get("anomaly_score") or 0)

        sat_rows.append([
            obs.get("satellite_id", ""),
            obs.get("name", ""),
            ts,
            float(obs.get("altitude_km") or 0),
            float(obs.get("inclination_deg") or 0),
            float(obs.get("period_minutes") or 0),
            float(obs.get("mean_motion_rev_day") or 0),
            float(obs.get("eccentricity") or 0),
            score,
            is_anomalous,
        ])

        if is_anomalous:
            sev = "HIGH" if abs(score) > 0.3 else "MEDIUM"
            alert_rows.append([
                str(uuid.uuid4()), "SATELLITE_ANOMALY", ts,
                sev, SEVERITY_NUMERIC[sev],
                f"Orbital anomaly: {obs.get('name', 'Unknown')} (score={score:.3f})",
                None, None,
                json.dumps({
                    "satellite_id": obs.get("satellite_id"),
                    "name": obs.get("name"),
                    "altitude_km": obs.get("altitude_km"),
                }),
            ])

    if sat_rows:
        client.insert(
            "space_pulse.satellite_observations", sat_rows, column_names=sat_cols
        )
    if alert_rows:
        client.insert("space_pulse.space_alerts", alert_rows, column_names=alert_cols)

    logger.info(
        "Inserted %d satellite observations, %d anomaly alerts",
        len(sat_rows),
        len(alert_rows),
    )
    return len(sat_rows)


# ─── APOD ─────────────────────────────────────────────────────────────────────

def insert_apod(apod: Dict) -> int:
    """Insert normalized APOD record into the apod table."""
    if not apod:
        logger.info("No APOD data to insert")
        return 0

    client = _get_client()
    cols = [
        "date", "title", "explanation", "media_type",
        "url", "hdurl", "thumbnail_url", "copyright",
    ]

    apod_date = _d(apod.get("date"))
    if not apod_date:
        logger.warning("APOD record missing date, skipping")
        return 0

    rows = [[
        apod_date,
        apod.get("title", ""),
        apod.get("explanation", ""),
        apod.get("media_type", "image"),
        apod.get("url", "") or "",
        apod.get("hdurl", "") or "",
        apod.get("thumbnail_url", "") or "",
        apod.get("copyright", "") or "",
    ]]
    client.insert("space_pulse.apod", rows, column_names=cols)
    logger.info("Inserted APOD for %s", apod_date)
    return 1
