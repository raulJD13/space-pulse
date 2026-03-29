# api/routers/apod.py
import logging
import os
import time

import httpx
from fastapi import APIRouter, HTTPException

from api.db.clickhouse import execute_query

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/apod", tags=["apod"])

NASA_API_KEY = os.getenv("NASA_API_KEY", "DEMO_KEY")
APOD_URL = "https://api.nasa.gov/planetary/apod"

# In-memory cache — avoids redundant ClickHouse reads within the same hour.
_cache: dict = {}
_CACHE_TTL = 3600  # seconds


def _apod_from_clickhouse() -> dict:
    """Return the most recent APOD row from ClickHouse.

    Airflow ingests this daily, so it is almost always available.
    Returns {} when the table is empty (e.g. first boot before Airflow runs).
    """
    rows = execute_query(
        """
        SELECT date, title, explanation, media_type,
               url, hdurl, thumbnail_url, copyright
        FROM space_pulse.apod
        ORDER BY date DESC
        LIMIT 1
        """
    )
    if not rows:
        return {}
    row = rows[0]
    return {
        "date": str(row["date"]),
        "title": row["title"],
        "explanation": row["explanation"],
        "media_type": row["media_type"] or "image",
        "url": row["url"] or "",
        "hdurl": row["hdurl"] or "",
        "thumbnail_url": row["thumbnail_url"] or "",
        "copyright": row["copyright"] or "",
    }


@router.get("/")
async def get_apod():
    """Return today's APOD.

    Resolution order (stops at first hit):
    1. In-memory cache (1-hour TTL) — fastest, no external calls.
    2. ClickHouse apod table — populated daily by Airflow; avoids NASA rate limits.
    3. NASA APOD API — only reached when ClickHouse has no data at all.
    """
    now = time.monotonic()

    # 1. Memory cache
    if _cache.get("data") and now - _cache.get("at", 0) < _CACHE_TTL:
        return _cache["data"]

    # 2. ClickHouse (primary persistent source)
    db_data = _apod_from_clickhouse()
    if db_data.get("url"):
        _cache["data"] = db_data
        _cache["at"] = now
        return db_data

    logger.warning("APOD not found in ClickHouse, falling back to NASA API")

    # 3. NASA API (fallback — only if Airflow has never run yet)
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(
                APOD_URL,
                params={"api_key": NASA_API_KEY, "thumbs": "true"},
            )
            response.raise_for_status()
            data = response.json()
            _cache["data"] = data
            _cache["at"] = now
            return data
    except httpx.HTTPStatusError as e:
        if _cache.get("data"):
            return _cache["data"]
        raise HTTPException(
            status_code=e.response.status_code,
            detail="NASA APOD unavailable and no cached data",
        )
    except Exception:
        if _cache.get("data"):
            return _cache["data"]
        raise HTTPException(status_code=503, detail="APOD unavailable")
