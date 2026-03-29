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

    # Fallback seed TLE data spanning LEO, SSO, and MEO regimes.
    # Used when the primary API is unavailable. TLE epoch is approximate;
    # orbital parameters (inclination, period, altitude) remain valid for
    # anomaly detection purposes over weeks/months.
    _SEED_TLES = [
        # ISS — LEO 408 km, 51.6° inclination
        {"satelliteId": "25544", "name": "ISS (ZARYA)",
         "line1": "1 25544U 98067A   24090.50000000  .00016717  00000-0  10270-3 0  9993",
         "line2": "2 25544  51.6400 208.9163 0002218 270.2437 179.3093 15.50377579 32"},
        # Hubble — LEO 537 km, 28.5° inclination
        {"satelliteId": "20580", "name": "HST",
         "line1": "1 20580U 90037B   24090.50000000  .00000882  00000-0  41888-4 0  9993",
         "line2": "2 20580  28.4700 318.6082 0002491 329.5258  30.5615 15.09662836 42"},
        # Starlink-1007 — LEO 550 km, 53° inclination
        {"satelliteId": "44713", "name": "STARLINK-1007",
         "line1": "1 44713U 19074A   24090.50000000  .00001344  00000-0  10270-3 0  9991",
         "line2": "2 44713  53.0540 119.7242 0001321 220.4500 139.6300 15.06386580 12"},
        # Starlink-1008
        {"satelliteId": "44714", "name": "STARLINK-1008",
         "line1": "1 44714U 19074B   24090.50000000  .00001366  00000-0  10430-3 0  9998",
         "line2": "2 44714  53.0538 119.7225 0001189 218.4400 141.6210 15.06380840 21"},
        # Starlink-1009
        {"satelliteId": "44715", "name": "STARLINK-1009",
         "line1": "1 44715U 19074C   24090.50000000  .00001381  00000-0  10560-3 0  9993",
         "line2": "2 44715  53.0535 119.7218 0001256 219.1200 140.9300 15.06377450 18"},
        # Starlink-2030 — shell 2, 70° inclination (different orbital plane)
        {"satelliteId": "47322", "name": "STARLINK-2030",
         "line1": "1 47322U 21006S   24090.50000000  .00002000  00000-0  14000-3 0  9992",
         "line2": "2 47322  70.0020 200.1234 0001400 270.0000 090.0000 14.98503480 31"},
        # Starlink-3000 — polar shell, 97° inclination
        {"satelliteId": "49140", "name": "STARLINK-3000",
         "line1": "1 49140U 21082J   24090.50000000  .00001800  00000-0  12800-3 0  9991",
         "line2": "2 49140  97.6000 090.0000 0001100 095.0000 265.0000 15.05100000 22"},
        # NOAA-20 — SSO 824 km, 98.7° inclination (weather, very different orbit)
        {"satelliteId": "43013", "name": "NOAA 20",
         "line1": "1 43013U 17073A   24090.50000000  .00000077  00000-0  57430-4 0  9993",
         "line2": "2 43013  98.7424 101.2312 0001282  83.6000 276.5000 14.19555470 12"},
        # NOAA-19 — SSO 870 km, 99° inclination
        {"satelliteId": "33591", "name": "NOAA 19",
         "line1": "1 33591U 09005A   24090.50000000  .00000084  00000-0  65780-4 0  9998",
         "line2": "2 33591  99.1920 140.6110 0013906 328.7100  31.3200 14.12353780 43"},
        # METOP-B — SSO 817 km, 98.7° inclination
        {"satelliteId": "38771", "name": "METOP-B",
         "line1": "1 38771U 12049A   24090.50000000  .00000066  00000-0  48660-4 0  9992",
         "line2": "2 38771  98.6985 096.3344 0001127 134.2800 225.8300 14.21477270 11"},
        # Aqua — SSO 705 km, 98.2° inclination
        {"satelliteId": "27424", "name": "AQUA",
         "line1": "1 27424U 02022A   24090.50000000  .00000129  00000-0  63290-4 0  9993",
         "line2": "2 27424  98.2181 198.4800 0001342  82.0200 278.1100 14.57110790 22"},
        # GPS IIR-M-1 — MEO 20200 km, 55° inclination (very different — will be anomalous)
        {"satelliteId": "28361", "name": "GPS BIIR-2 (PRN 13)",
         "line1": "1 28361U 04009A   24090.50000000  .00000007  00000-0  00000+0 0  9996",
         "line2": "2 28361  55.7560 280.4500 0143330 114.2000 247.3500  2.00566700 11"},
        # GOES-16 — GEO 35786 km, 0.05° inclination (extremely different — highly anomalous)
        {"satelliteId": "41866", "name": "GOES-16",
         "line1": "1 41866U 16071A   24090.50000000 -.00000121  00000-0  00000+0 0  9998",
         "line2": "2 41866   0.0450 356.2300 0000892 182.0000 253.5000  1.00271600 11"},
    ]

    async def get_satellites(
        self, search: str = "", page_size: int = 200
    ) -> List[Dict]:
        """
        Obtiene satélites activos con sus TLE.
        Falls back to embedded seed data if the primary API is unavailable.
        search: filtro por nombre (ej: 'starlink', 'iss', 'weather')
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    self.TLE_BASE,
                    params={"search": search, "page-size": page_size},
                )
                response.raise_for_status()
                members = response.json().get("member", [])
                if members:
                    return members
                logger.warning("Primary TLE API returned empty results, using seed data")
        except (httpx.HTTPStatusError, httpx.TransportError, httpx.RemoteProtocolError,
                httpx.ConnectError, httpx.TimeoutException) as e:
            logger.warning("Primary TLE API unavailable (%s), using seed fallback", e)

        # Filter seed data by search term (case-insensitive substring match on name)
        term = search.lower()
        seed_map = {
            "starlink": [s for s in self._SEED_TLES if "starlink" in s["name"].lower()],
            "iss":      [s for s in self._SEED_TLES if "iss" in s["name"].lower() or "zarya" in s["name"].lower()],
            "weather":  [s for s in self._SEED_TLES if any(
                k in s["name"].lower() for k in ("noaa", "metop", "aqua", "goes")
            )],
        }
        subset = seed_map.get(term, self._SEED_TLES)
        return subset[:page_size]

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

    async def get_all_satellite_groups(self) -> List[Dict]:
        """
        Obtiene satélites de varios grupos en paralelo: Starlink, ISS y weather sats.
        """
        import asyncio
        starlink, iss, weather = await asyncio.gather(
            self.get_satellites("starlink", 100),
            self.get_satellites("ISS", 5),
            self.get_satellites("weather", 50),
        )
        return starlink + iss + weather

    def compute_all_positions(self, satellites: List[Dict]) -> List[Dict]:
        """Alias de parse_satellites() para compatibilidad."""
        return self.parse_satellites(satellites)
