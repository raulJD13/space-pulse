# api/routers/solar.py
from fastapi import APIRouter, Query
from api.db.clickhouse import execute_query

router = APIRouter(prefix="/solar", tags=["solar"])


@router.get("/events")
def get_solar_events(
    hours: int = Query(default=24, ge=1, le=168),
    limit: int = Query(default=50, le=200),
):
    """Retorna eventos solares recientes (flares, CME, tormentas)."""
    query = f"""
        SELECT event_id, event_type, begin_time, peak_time,
               class_type, severity_label, severity_numeric
        FROM space_pulse.solar_events
        WHERE begin_time >= now() - INTERVAL {hours} HOUR
        ORDER BY begin_time DESC
        LIMIT {limit}
    """
    return execute_query(query)


@router.get("/flares")
def get_solar_flares(limit: int = Query(default=20, le=100)):
    """Retorna las últimas llamaradas solares."""
    query = f"""
        SELECT event_id, begin_time, class_type, severity_label, severity_numeric
        FROM space_pulse.solar_events
        WHERE event_type = 'FLARE'
        ORDER BY begin_time DESC
        LIMIT {limit}
    """
    return execute_query(query)
