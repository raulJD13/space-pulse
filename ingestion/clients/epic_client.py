# ingestion/clients/epic_client.py
from .base_client import NASABaseClient
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional


class EPICClient(NASABaseClient):
    """
    Cliente para EPIC — Earth Polychromatic Imaging Camera.
    Fotos de la Tierra en color natural desde el satélite DSCOVR.
    """

    EPIC_BASE = "https://api.nasa.gov/EPIC/api"

    async def get_images(self, date: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Obtiene metadatos de imágenes EPIC para una fecha.
        Si no se pasa fecha, obtiene las más recientes.
        date: formato YYYY-MM-DD
        """
        if date:
            endpoint = f"/natural/date/{date}"
        else:
            endpoint = "/natural"

        return await self.get(endpoint, base_url=self.EPIC_BASE)

    async def get_available_dates(self) -> List[str]:
        """Obtiene lista de fechas con imágenes disponibles."""
        return await self.get("/natural/available", base_url=self.EPIC_BASE)

    def build_image_url(self, image_name: str, date: str) -> str:
        """
        Construye la URL completa de una imagen EPIC.
        date: formato YYYY-MM-DD
        """
        parts = date.split("-")
        return (
            f"https://api.nasa.gov/EPIC/archive/natural/"
            f"{parts[0]}/{parts[1]}/{parts[2]}/png/{image_name}.png"
            f"?api_key={self.api_key}"
        )

    async def get_natural_images(self, date: Optional[str] = None) -> List[Dict[str, Any]]:
        """Alias de get_images() para compatibilidad."""
        return await self.get_images(date=date)

    def flatten_images(self, images: List[Dict]) -> List[Dict]:
        """Extrae campos relevantes de las imágenes EPIC."""
        flat = []
        for img in images:
            date_str = img.get("date", "")[:10]  # YYYY-MM-DD
            centroid = img.get("centroid_coordinates", {})
            position = img.get("dscovr_j2000_position", {})

            flat.append({
                "identifier": img.get("identifier"),
                "caption": img.get("caption", ""),
                "image_name": img.get("image"),
                "date": img.get("date"),
                "image_url": self.build_image_url(img.get("image", ""), date_str),
                "centroid_lat": centroid.get("lat"),
                "centroid_lon": centroid.get("lon"),
                "dscovr_x": position.get("x"),
                "dscovr_y": position.get("y"),
                "dscovr_z": position.get("z"),
            })
        return flat

    def extract_metadata(self, images: List[Dict]) -> List[Dict]:
        """Alias de flatten_images() para compatibilidad."""
        return self.flatten_images(images)
