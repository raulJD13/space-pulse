# ingestion/clients/neows_client.py
from .base_client import NASABaseClient
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any

class NeoWsClient(NASABaseClient):
    """
    Cliente para Near Earth Object Web Service.
    Obtiene asteroides que se acercan a la Tierra.
    """
    
    NEO_BASE = "https://api.nasa.gov/neo/rest/v1"
    
    async def get_feed(self, days_ahead: int = 7) -> Dict[str, Any]:
        """
        Obtiene NEOs para los próximos N días.
        IMPORTANTE: la API solo permite un máximo de 7 días por request.
        """
        start = datetime.now(timezone.utc)
        end = start + timedelta(days=min(days_ahead, 7))
        
        return await self.get(
            "/feed",
            params={
                "start_date": self._format_date(start),
                "end_date": self._format_date(end)
            },
            base_url=self.NEO_BASE
        )
    
    def flatten_neos(self, feed_response: Dict) -> List[Dict]:
        """
        Aplana la estructura de near_earth_objects (que viene agrupada por fecha)
        en una lista plana de NEOs y extrae los datos del acercamiento.
        """
        neos = []
        # Iteramos sobre los días y sus listas de asteroides
        for date, neo_list in feed_response.get("near_earth_objects", {}).items():
            for neo in neo_list:
                neo["_ingestion_date"] = date
                
                # Extraer el acercamiento (close approach) más próximo
                if neo.get("close_approach_data"):
                    ca = neo["close_approach_data"][0]
                    neo["_velocity_km_s"] = float(ca["relative_velocity"]["kilometers_per_second"])
                    neo["_miss_distance_lunar"] = float(ca["miss_distance"]["lunar"])
                    neo["_miss_distance_km"] = float(ca["miss_distance"]["kilometers"])
                    neo["_close_approach_date"] = ca["close_approach_date"]
                
                neos.append(neo)
        return neos