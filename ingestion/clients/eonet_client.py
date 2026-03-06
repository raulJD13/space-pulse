# ingestion/clients/eonet_client.py
import httpx
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)


class EONETClient:
    """
    Cliente para EONET v3 — Earth Observatory Natural Event Tracker.
    No requiere API key. URL base diferente a api.nasa.gov.
    """

    BASE_URL = "https://eonet.gsfc.nasa.gov/api/v3"

    def __init__(self, timeout: int = 30):
        self.timeout = timeout

    async def get_events(
        self,
        status: str = "open",
        limit: int = 100,
        days: int = 7,
        category: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Obtiene eventos naturales activos.
        status: 'open' para activos, 'closed' para históricos
        category: filtrar por categoría (wildfires, severeStorms, volcanoes, etc.)
        """
        params: Dict[str, Any] = {
            "status": status,
            "limit": limit,
            "days": days,
        }
        if category:
            params["category"] = category

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(f"{self.BASE_URL}/events", params=params)
            response.raise_for_status()
            data = response.json()
            return data.get("events", [])

    async def get_categories(self) -> List[Dict]:
        """Obtiene el catálogo de categorías disponibles."""
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(f"{self.BASE_URL}/categories")
            response.raise_for_status()
            return response.json().get("categories", [])

    def flatten_events(self, events: List[Dict]) -> List[Dict]:
        """
        Aplana los eventos EONET extrayendo coordenadas del primer geometry.
        Cada evento puede tener múltiples geometrías (seguimiento temporal).
        """
        flat = []
        for event in events:
            categories = [c.get("title", "") for c in event.get("categories", [])]
            geometries = event.get("geometry", [])

            # Tomar la geometría más reciente
            if geometries:
                latest_geo = geometries[-1]
                coords = latest_geo.get("coordinates", [None, None])
                longitude = coords[0] if len(coords) > 0 else None
                latitude = coords[1] if len(coords) > 1 else None
                event_date = latest_geo.get("date")
            else:
                latitude, longitude, event_date = None, None, None

            sources = event.get("sources", [])
            source_url = sources[0].get("url", "") if sources else ""

            flat.append({
                "event_id": event.get("id"),
                "title": event.get("title"),
                "category": categories[0] if categories else "Unknown",
                "status": "open" if not event.get("closed") else "closed",
                "latitude": latitude,
                "longitude": longitude,
                "event_date": event_date,
                "closed_date": event.get("closed"),
                "source_url": source_url,
            })
        return flat
