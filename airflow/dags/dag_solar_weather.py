# airflow/dags/dag_solar_weather.py
from airflow.decorators import dag, task
from airflow.utils.dates import days_ago
from datetime import timedelta, datetime, timezone
import asyncio
import os

default_args = {
    "owner": "space-pulse",
    "depends_on_past": False,
    "retries": 2,
    "retry_delay": timedelta(minutes=5),
    "execution_timeout": timedelta(minutes=10),
}

@dag(
    dag_id="solar_weather_pipeline",
    description="Ingesta datos de tormentas solares desde DONKI API cada 30 minutos",
    schedule_interval="*/30 * * * *",
    start_date=days_ago(1),
    catchup=False,
    default_args=default_args,
    tags=["solar", "donki", "ingestion"],
)
def solar_weather_pipeline():
    
    @task()
    def extract_solar_events() -> dict:
        """Extrae CME, flares y tormentas de DONKI API."""
        from ingestion.clients.donki_client import DONKIClient
        
        # En Airflow, sacamos la key de las variables de entorno del contenedor
        client = DONKIClient(api_key=os.environ.get("NASA_API_KEY", "DEMO_KEY"))
        data = asyncio.run(client.get_all_events(days_back=1))
        
        return {
            "extracted_at": datetime.now(timezone.utc).isoformat(),
            "cme_count": len(data["cme"]),
            "flares_count": len(data["flares"]),
            "storms_count": len(data["storms"]),
            "data": data
        }
    
    @task()
    def save_to_minio(extracted: dict) -> str:
        """Guarda el JSON raw en MinIO bajo donki/YYYY/MM/DD/HHMMSS.json"""
        from ingestion.minio_storage import MinIOStorage
        
        storage = MinIOStorage(
            endpoint=os.environ.get("MINIO_ENDPOINT", "minio:9000"),
            access_key=os.environ.get("MINIO_ACCESS_KEY", "minioadmin"),
            secret_key=os.environ.get("MINIO_SECRET_KEY", "minioadmin123secure")
        )
        
        now = datetime.now(timezone.utc)
        path = f"donki/{now.strftime('%Y/%m/%d/%H%M%S')}.json"
        
        storage.put_json("space-pulse-raw", path, extracted["data"])
        return path
    
    # Definimos el orden del flujo: Extraer -> Guardar
    extracted_data = extract_solar_events()
    save_to_minio(extracted_data)

# Instanciamos el DAG
dag_instance = solar_weather_pipeline()