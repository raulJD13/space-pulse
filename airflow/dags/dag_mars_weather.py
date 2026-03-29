# airflow/dags/dag_mars_weather.py
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
}


@dag(
    dag_id="mars_weather_pipeline",
    description="Ingesta datos meteorológicos de Marte (InSight) diariamente",
    schedule_interval="0 8 * * *",  # Diario a las 8am UTC
    start_date=days_ago(1),
    catchup=False,
    default_args=default_args,
    tags=["mars", "insight", "ingestion"],
)
def mars_weather_pipeline():

    @task()
    def extract_mars_weather() -> dict:
        """
        Extrae datos meteorológicos de Marte del InSight Lander.
        Nota: La misión finalizó en dic 2022. Los datos históricos
        siguen accesibles pero no hay nuevos datos.
        """
        from ingestion.clients.insight_client import InSightClient

        client = InSightClient(api_key=os.environ.get("NASA_API_KEY", "DEMO_KEY"))
        raw_data = asyncio.run(client.get_weather())
        sols = client.flatten_sols(raw_data)

        return {
            "extracted_at": datetime.now(timezone.utc).isoformat(),
            "sol_count": len(sols),
            "sols": sols,
            "raw": raw_data,
        }

    @task()
    def save_to_minio(extracted: dict) -> str:
        """Guarda datos de Marte en MinIO."""
        from ingestion.minio_storage import MinIOStorage

        storage = MinIOStorage(
            endpoint=os.environ.get("MINIO_ENDPOINT", "minio:9000"),
            access_key=os.environ.get("MINIO_ACCESS_KEY", "minioadmin"),
            secret_key=os.environ.get("MINIO_SECRET_KEY", "minioadmin123secure"),
        )

        now = datetime.now(timezone.utc)
        path = f"insight/{now.strftime('%Y/%m')}/daily.json"
        storage.put_json("space-pulse-raw", path, extracted)
        return path

    @task()
    def insert_to_clickhouse(extracted: dict) -> int:
        """Inserta datos meteorológicos de Marte en ClickHouse."""
        from ingestion.clickhouse_inserter import insert_mars_weather
        return insert_mars_weather(extracted.get("sols", []))

    # Flujo
    mars_data = extract_mars_weather()
    save_to_minio(mars_data)
    insert_to_clickhouse(mars_data)


dag_instance = mars_weather_pipeline()
