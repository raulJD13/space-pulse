# api/routers/mars.py
from fastapi import APIRouter, Query
from api.db.clickhouse import execute_query

router = APIRouter(prefix="/mars", tags=["mars"])


@router.get("/weather")
def get_mars_weather(limit: int = Query(default=30, le=100)):
    """Retorna datos meteorológicos de Marte (InSight)."""
    query = f"""
        SELECT sol, earth_date, temp_avg_celsius,
               temp_min_celsius, temp_max_celsius,
               wind_speed_avg_ms, wind_direction_degrees,
               pressure_pa, season
        FROM space_pulse.mars_weather
        ORDER BY earth_date DESC
        LIMIT {limit}
    """
    return execute_query(query)


@router.get("/weather/latest")
def get_mars_weather_latest():
    """Retorna el último registro meteorológico de Marte."""
    query = """
        SELECT sol, earth_date, temp_avg_celsius,
               temp_min_celsius, temp_max_celsius,
               wind_speed_avg_ms, pressure_pa, season
        FROM space_pulse.mars_weather
        ORDER BY earth_date DESC
        LIMIT 1
    """
    return execute_query(query, single_row=True)
