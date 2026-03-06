# api/routers/apod.py
import os
import httpx
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/apod", tags=["apod"])

NASA_API_KEY = os.getenv("NASA_API_KEY", "DEMO_KEY")
APOD_URL = "https://api.nasa.gov/planetary/apod"


@router.get("/")
async def get_apod():
    """Proxy de la imagen astronómica del día (APOD) desde NASA."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(
                APOD_URL,
                params={"api_key": NASA_API_KEY, "thumbs": "true"},
            )
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail="NASA APOD error")
    except Exception:
        raise HTTPException(status_code=503, detail="NASA APOD unavailable")
