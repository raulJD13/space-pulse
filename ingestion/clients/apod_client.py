# ingestion/clients/apod_client.py
from .base_client import NASABaseClient
from datetime import datetime
from typing import Dict, Any, Optional, List


class APODClient(NASABaseClient):
    """
    Cliente para APOD — Astronomy Picture of the Day.
    Imagen astronómica del día con explicación de un astrónomo profesional.
    """

    async def get_today(self) -> Dict[str, Any]:
        """Obtiene la imagen astronómica del día actual."""
        return await self.get("/planetary/apod", params={"thumbs": "true"})

    async def get_by_date(self, date: str) -> Dict[str, Any]:
        """
        Obtiene APOD para una fecha específica.
        date: formato YYYY-MM-DD
        """
        return await self.get(
            "/planetary/apod",
            params={"date": date, "thumbs": "true"},
        )

    async def get_random(self, count: int = 5) -> List[Dict[str, Any]]:
        """Obtiene N imágenes APOD aleatorias."""
        return await self.get(
            "/planetary/apod",
            params={"count": count, "thumbs": "true"},
        )

    async def get_range(self, start_date: str, end_date: str) -> List[Dict[str, Any]]:
        """
        Obtiene APODs en un rango de fechas.
        start_date, end_date: formato YYYY-MM-DD
        """
        return await self.get(
            "/planetary/apod",
            params={
                "start_date": start_date,
                "end_date": end_date,
                "thumbs": "true",
            },
        )

    def normalize(self, apod_data: Dict) -> Dict:
        """Normaliza la respuesta APOD a un formato consistente."""
        return {
            "date": apod_data.get("date"),
            "title": apod_data.get("title"),
            "explanation": apod_data.get("explanation"),
            "media_type": apod_data.get("media_type", "image"),
            "url": apod_data.get("url"),
            "hdurl": apod_data.get("hdurl"),
            "thumbnail_url": apod_data.get("thumbnail_url"),
            "copyright": apod_data.get("copyright"),
        }
