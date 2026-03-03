# ingestion/clients/donki_client.py
from .base_client import NASABaseClient
from datetime import datetime, timedelta
from typing import List, Dict
import asyncio

class DONKIClient(NASABaseClient):
    """
    Cliente para la API DONKI (Space Weather).
    Endpoints: CME, FLR (Solar Flares), GST (Geomagnetic Storms)
    """
    
    DONKI_BASE = "https://api.nasa.gov/DONKI"
    
    async def get_cme(self, days_back: int = 1) -> List[Dict]:
        """Obtiene Coronal Mass Ejections de los últimos N días."""
        end = datetime.utcnow()
        start = end - timedelta(days=days_back)
        return await self.get(
            "/CME",
            params={"startDate": self._format_date(start), "endDate": self._format_date(end)},
            base_url=self.DONKI_BASE
        )
    
    async def get_solar_flares(self, days_back: int = 1) -> List[Dict]:
        """Obtiene Solar Flares. Clasificación: A, B, C, M, X."""
        end = datetime.utcnow()
        start = end - timedelta(days=days_back)
        return await self.get(
            "/FLR",
            params={"startDate": self._format_date(start), "endDate": self._format_date(end)},
            base_url=self.DONKI_BASE
        )
    
    async def get_geomagnetic_storms(self, days_back: int = 7) -> List[Dict]:
        """Obtiene tormentas geomagnéticas."""
        end = datetime.utcnow()
        start = end - timedelta(days=days_back)
        return await self.get(
            "/GST",
            params={"startDate": self._format_date(start), "endDate": self._format_date(end)},
            base_url=self.DONKI_BASE
        )
    
    async def get_all_events(self, days_back: int = 1) -> Dict[str, List]:
        """Obtiene todos los eventos solares a la vez (paralelizado)."""
        cme, flares, storms = await asyncio.gather(
            self.get_cme(days_back),
            self.get_solar_flares(days_back),
            self.get_geomagnetic_storms(days_back)
        )
        return {"cme": cme or [], "flares": flares or [], "storms": storms or []}