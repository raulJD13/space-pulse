# api/routers/apod.py
import logging
import os
import time
from datetime import date as date_cls

import httpx
from fastapi import APIRouter, HTTPException

from api.db.clickhouse import execute_query

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/apod", tags=["apod"])

NASA_API_KEY = os.getenv("NASA_API_KEY", "DEMO_KEY")
APOD_URL = "https://api.nasa.gov/planetary/apod"

# In-memory cache — invalidated when date changes.
_cache: dict = {}
_CACHE_TTL = 3600  # seconds


def _apod_from_clickhouse(date_filter: str | None = None) -> dict:
    """Return an APOD row from ClickHouse.

    If date_filter is given (ISO string, e.g. '2026-03-30'), returns that day's
    row or {} if not found.  Without date_filter returns the most recent row.
    """
    if date_filter:
        rows = execute_query(
            f"""
            SELECT date, title, explanation, media_type,
                   url, hdurl, thumbnail_url, copyright
            FROM space_pulse.apod
            WHERE date = '{date_filter}'
            LIMIT 1
            """
        )
    else:
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
    1. In-memory cache — valid only for today's date and within TTL.
    2. ClickHouse today's row — populated daily by Airflow; avoids NASA rate limits.
    3. NASA APOD API — called when today's row is not in ClickHouse yet.
    4. On NASA 429/error: most-recent ClickHouse row as last resort.
    """
    now = time.monotonic()
    today = date_cls.today().isoformat()  # "2026-03-30"

    # 1. Memory cache — only valid for today
    cached = _cache.get("data", {})
    if cached and cached.get("date") == today and now - _cache.get("at", 0) < _CACHE_TTL:
        return cached

    # 2. ClickHouse — prefer today's date
    db_today = _apod_from_clickhouse(date_filter=today)
    if db_today.get("url"):
        _cache["data"] = db_today
        _cache["at"] = now
        return db_today

    logger.warning("Today's APOD not in ClickHouse, calling NASA API")

    # 3. NASA API (today not ingested yet)
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
        logger.warning("NASA APOD returned %s, falling back to ClickHouse", e.response.status_code)
        # 4. Fall back to most-recent ClickHouse row (may be yesterday's)
        fallback = _apod_from_clickhouse()
        if fallback.get("url"):
            return fallback
        if _cache.get("data"):
            return _cache["data"]
        raise HTTPException(
            status_code=e.response.status_code,
            detail="NASA APOD unavailable and no cached data",
        )
    except Exception:
        fallback = _apod_from_clickhouse()
        if fallback.get("url"):
            return fallback
        if _cache.get("data"):
            return _cache["data"]
        raise HTTPException(status_code=503, detail="APOD unavailable")
