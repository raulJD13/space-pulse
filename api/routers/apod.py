# api/routers/apod.py
import os
import time
import httpx
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/apod", tags=["apod"])

NASA_API_KEY = os.getenv("NASA_API_KEY", "DEMO_KEY")
APOD_URL = "https://api.nasa.gov/planetary/apod"

# APOD changes once per day; cache for 1 hour to stay well within NASA rate limits.
_cache: dict = {}
_CACHE_TTL = 3600  # seconds


@router.get("/")
async def get_apod():
    """Proxy APOD from NASA with 1-hour in-memory cache."""
    now = time.monotonic()
    if _cache.get("data") and now - _cache.get("at", 0) < _CACHE_TTL:
        return _cache["data"]

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
        if e.response.status_code == 429 and _cache.get("data"):
            return _cache["data"]  # serve stale rather than surfacing rate-limit to client
        raise HTTPException(status_code=e.response.status_code, detail="NASA APOD error")
    except Exception:
        if _cache.get("data"):
            return _cache["data"]
        raise HTTPException(status_code=503, detail="NASA APOD unavailable")
