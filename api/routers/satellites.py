# api/routers/satellites.py
from fastapi import APIRouter, Query
from api.db.clickhouse import execute_query

router = APIRouter(prefix="/satellites", tags=["satellites"])


@router.get("/")
def get_satellites(
    anomalous_only: bool = False,
    limit: int = Query(default=50, le=200),
):
    """Retorna observaciones de satélites, opcionalmente solo anómalos."""
    where = "WHERE is_anomalous = true" if anomalous_only else ""

    query = f"""
        SELECT satellite_id, satellite_name, timestamp,
               altitude_km, inclination_deg, period_minutes,
               mean_motion_rev_day, anomaly_score, is_anomalous
        FROM space_pulse.satellite_observations
        {where}
        ORDER BY timestamp DESC
        LIMIT {limit}
    """
    return execute_query(query)


@router.get("/anomalies")
def get_anomalies(hours: int = Query(default=24, ge=1, le=168)):
    """Retorna satélites con anomalías detectadas en las últimas N horas."""
    query = f"""
        SELECT satellite_id, satellite_name, timestamp,
               altitude_km, inclination_deg, anomaly_score
        FROM space_pulse.satellite_observations
        WHERE is_anomalous = true
          AND timestamp >= now() - INTERVAL {hours} HOUR
        ORDER BY anomaly_score ASC
    """
    return execute_query(query)
