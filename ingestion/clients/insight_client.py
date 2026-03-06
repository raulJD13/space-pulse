# ingestion/clients/insight_client.py
from .base_client import NASABaseClient
from typing import List, Dict, Any


class InSightClient(NASABaseClient):
    """
    Cliente para InSight Mars Weather Service.
    Nota: La misión InSight finalizó en diciembre 2022.
    Los datos históricos siguen accesibles pero no hay nuevos datos.
    """

    async def get_weather(self) -> Dict[str, Any]:
        """
        Obtiene datos meteorológicos de Marte del rover InSight.
        Retorna datos por sol (día marciano) con temperatura,
        viento y presión atmosférica.
        """
        return await self.get(
            "/insight_weather/",
            params={"feedtype": "json", "ver": "1.0"},
        )

    def flatten_sols(self, weather_data: Dict) -> List[Dict]:
        """
        Aplana los datos meteorológicos por sol.
        weather_data contiene una lista de sol_keys y datos por sol.
        """
        sol_keys = weather_data.get("sol_keys", [])
        sols = []

        for sol_num in sol_keys:
            sol_data = weather_data.get(sol_num, {})

            at = sol_data.get("AT", {})  # Atmospheric Temperature
            hws = sol_data.get("HWS", {})  # Horizontal Wind Speed
            pre = sol_data.get("PRE", {})  # Pressure
            wd = sol_data.get("WD", {})  # Wind Direction

            most_common_wd = wd.get("most_common", {})

            sols.append({
                "sol": int(sol_num),
                "first_utc": sol_data.get("First_UTC"),
                "last_utc": sol_data.get("Last_UTC"),
                "season": sol_data.get("Season"),
                "temp_avg_celsius": at.get("av"),
                "temp_min_celsius": at.get("mn"),
                "temp_max_celsius": at.get("mx"),
                "temp_sample_count": at.get("ct"),
                "wind_speed_avg_ms": hws.get("av"),
                "wind_speed_min_ms": hws.get("mn"),
                "wind_speed_max_ms": hws.get("mx"),
                "pressure_avg_pa": pre.get("av"),
                "pressure_min_pa": pre.get("mn"),
                "pressure_max_pa": pre.get("mx"),
                "wind_direction_degrees": most_common_wd.get("compass_degrees"),
                "wind_direction_point": most_common_wd.get("compass_point"),
            })

        return sols
