# api/routers/asteroids.py
from fastapi import APIRouter, Query
from typing import Optional
from api.db.clickhouse import execute_query

router = APIRouter(prefix="/asteroids", tags=["asteroids"])


@router.get("/")
def get_asteroids(
    risk_level: Optional[str] = None,
    days_ahead: int = Query(default=7, ge=1, le=30),
    limit: int = Query(default=50, le=200),
):
    """Retorna asteroides cercanos a la Tierra con risk score."""
    where_clauses = [
        f"close_approach_date BETWEEN today() AND today() + INTERVAL {days_ahead} DAY"
    ]

    if risk_level:
        where_clauses.append(f"risk_level = '{risk_level}'")

    where_str = " AND ".join(where_clauses)

    query = f"""
        SELECT neo_id, neo_name, close_approach_date,
               diameter_max_km, velocity_km_s, miss_distance_lunar,
               miss_distance_km, risk_score, risk_level, is_hazardous,
               dateDiff('day', today(), close_approach_date) AS days_until_approach
        FROM space_pulse.neo_daily
        WHERE {where_str}
        ORDER BY risk_score DESC
        LIMIT {limit}
    """
    return execute_query(query)


@router.get("/hazardous")
def get_hazardous(limit: int = Query(default=10, le=50)):
    """Retorna solo asteroides potencialmente peligrosos."""
    query = f"""
        SELECT neo_id, neo_name, close_approach_date,
               diameter_max_km, velocity_km_s, miss_distance_lunar,
               risk_score, risk_level
        FROM space_pulse.neo_daily
        WHERE is_hazardous = true
          AND close_approach_date >= today()
        ORDER BY close_approach_date ASC
        LIMIT {limit}
    """
    return execute_query(query)
