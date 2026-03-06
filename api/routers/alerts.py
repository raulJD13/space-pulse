# api/routers/alerts.py
from fastapi import APIRouter, Query
from typing import Optional
from api.db.clickhouse import execute_query

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("/")
def get_alerts(
    severity: Optional[str] = None,
    alert_type: Optional[str] = None,
    hours: int = Query(default=24, ge=1, le=168),
    limit: int = Query(default=50, le=200),
):
    """Retorna alertas del sistema solar ordenadas por severidad y tiempo."""
    where_clauses = [f"created_at >= now() - INTERVAL {hours} HOUR"]

    if severity:
        where_clauses.append(f"severity = '{severity}'")
    if alert_type:
        where_clauses.append(f"alert_type = '{alert_type}'")

    where_str = " AND ".join(where_clauses)

    query = f"""
        SELECT alert_id, alert_type, created_at, severity,
               severity_numeric, description, latitude, longitude
        FROM space_pulse.space_alerts
        WHERE {where_str}
        ORDER BY severity_numeric DESC, created_at DESC
        LIMIT {limit}
    """
    return execute_query(query)


@router.get("/summary")
def get_daily_summary():
    """Resumen del día actual para los widgets del header."""
    query = """
        SELECT
            today() AS summary_date,
            countIf(created_at >= today()) AS total_alerts_today,
            countIf(severity = 'CRITICAL' AND created_at >= today()) AS critical_today,
            countIf(alert_type = 'SOLAR_FLARE' AND created_at >= today() - INTERVAL 1 DAY) AS solar_alerts_24h,
            countIf(alert_type = 'NEAR_EARTH_OBJECT') AS high_risk_neos_upcoming,
            countIf(alert_type = 'EARTH_EVENT' AND created_at >= today() - INTERVAL 1 DAY) AS earth_events_24h,
            countIf(alert_type = 'SATELLITE_ANOMALY' AND created_at >= today() - INTERVAL 1 DAY) AS satellite_anomalies_24h,
            CASE
                WHEN countIf(severity = 'CRITICAL' AND created_at >= today()) > 0 THEN 'CRITICAL'
                WHEN countIf(severity = 'HIGH' AND created_at >= today()) > 0 THEN 'HIGH'
                WHEN countIf(severity = 'MEDIUM' AND created_at >= today()) > 0 THEN 'ELEVATED'
                ELSE 'NORMAL'
            END AS system_status,
            max(created_at) AS last_updated
        FROM space_pulse.space_alerts
        WHERE created_at >= today() - INTERVAL 7 DAY
    """
    return execute_query(query, single_row=True)
