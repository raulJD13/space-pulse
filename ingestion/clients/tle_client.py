# ingestion/clients/tle_client.py
import httpx
import math
import logging
from datetime import datetime, timezone
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)


class TLEClient:
    """
    Cliente para TLE API + cálculos orbitales SGP4.
    El TLE (Two-Line Element set) es el formato estándar para datos orbitales de satélites.
    """

    TLE_BASE = "https://tle.ivanstanojevic.me/api/tle"

    def __init__(self, timeout: int = 30):
        self.timeout = timeout

    async def get_satellites(
        self, search: str = "", page_size: int = 200
    ) -> List[Dict]:
        """
        Obtiene satélites activos con sus TLE.
        search: filtro por nombre (ej: 'starlink', 'iss', 'weather')
        """
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(
                self.TLE_BASE,
                params={"search": search, "page-size": page_size},
            )
            response.raise_for_status()
            return response.json().get("member", [])

    def parse_tle_position(self, tle_line1: str, tle_line2: str) -> Dict:
        """
        Parsea un TLE y calcula parámetros orbitales.
        Usa cálculos directos del TLE sin depender de sgp4 como fallback.

        Returns dict con:
        - altitude_km: altitud estimada sobre superficie terrestre
        - inclination_deg: inclinación orbital
        - period_minutes: período orbital
        - mean_motion: rev/día
        - eccentricity: excentricidad orbital
        """
        try:
            # Extraer parámetros directamente del TLE (formato estándar)
            inclination = float(tle_line2[8:16].strip())
            raan = float(tle_line2[17:25].strip())
            eccentricity = float(f"0.{tle_line2[26:33].strip()}")
            arg_perigee = float(tle_line2[34:42].strip())
            mean_anomaly = float(tle_line2[43:51].strip())
            mean_motion = float(tle_line2[52:63].strip())  # rev/día

            # Período orbital
            period_minutes = 1440.0 / mean_motion if mean_motion > 0 else 0

            # Estimar altitud desde mean motion usando la ley de Kepler
            # a = (GM * T^2 / (4 * pi^2))^(1/3)
            # Simplificación: a = (8681663.653 / mean_motion^2)^(1/3) km
            mu = 398600.4418  # km^3/s^2
            period_s = period_minutes * 60
            if period_s > 0:
                semi_major_axis = (mu * (period_s / (2 * math.pi)) ** 2) ** (1 / 3)
                altitude_km = semi_major_axis - 6371.0  # Radio Tierra
            else:
                semi_major_axis = 0
                altitude_km = 0

            return {
                "altitude_km": round(altitude_km, 2),
                "inclination_deg": inclination,
                "raan_deg": raan,
                "eccentricity": eccentricity,
                "arg_perigee_deg": arg_perigee,
                "mean_anomaly_deg": mean_anomaly,
                "mean_motion_rev_day": mean_motion,
                "period_minutes": round(period_minutes, 2),
                "semi_major_axis_km": round(semi_major_axis, 2),
            }

        except (ValueError, IndexError) as e:
            logger.error(f"Error parsing TLE: {e}")
            return {"error": str(e)}

    def parse_satellites(self, satellites: List[Dict]) -> List[Dict]:
        """
        Parsea una lista de satélites obtenidos de la API TLE
        y calcula parámetros orbitales para cada uno.
        """
        results = []
        for sat in satellites:
            line1 = sat.get("line1", "")
            line2 = sat.get("line2", "")
            if not line1 or not line2:
                continue

            params = self.parse_tle_position(line1, line2)
            if "error" in params:
                continue

            params["satellite_id"] = str(sat.get("satelliteId", ""))
            params["name"] = sat.get("name", "UNKNOWN")
            params["tle_line1"] = line1
            params["tle_line2"] = line2
            params["timestamp"] = datetime.now(timezone.utc).isoformat()
            results.append(params)

        return results
