# api/routers/earth.py
from fastapi import APIRouter, Query
from typing import Optional
from api.db.clickhouse import execute_query

router = APIRouter(prefix="/earth", tags=["earth"])


@router.get("/events")
def get_earth_events(
    category: Optional[str] = None,
    status: str = Query(default="open"),
    limit: int = Query(default=50, le=200),
):
    """Retorna eventos naturales terrestres de EONET."""
    where_clauses = [f"status = '{status}'"]

    if category:
        where_clauses.append(f"category = '{category}'")

    where_str = " AND ".join(where_clauses)

    # Filter in a subquery *before* GROUP BY to avoid ClickHouse ILLEGAL_AGGREGATION
    # errors caused by aliases clashing with WHERE column names.
    query = f"""
        SELECT
            event_id,
            any(title)      AS title,
            any(category)   AS category,
            any(status)     AS status,
            any(latitude)   AS latitude,
            any(longitude)  AS longitude,
            max(event_date) AS event_date,
            any(source_url) AS source_url
        FROM (
            SELECT * FROM space_pulse.earth_events
            WHERE {where_str}
        )
        GROUP BY event_id
        ORDER BY event_date DESC
        LIMIT {limit}
    """
    return execute_query(query)


@router.get("/categories")
def get_event_categories():
    """Retorna categorías de eventos con conteo."""
    query = """
        SELECT category, count() AS event_count
        FROM space_pulse.earth_events
        WHERE status = 'open'
        GROUP BY category
        ORDER BY event_count DESC
    """
    return execute_query(query)
