# airflow/dags/dag_apod.py
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
    dag_id="apod_pipeline",
    description="Ingesta la Astronomy Picture of the Day diariamente",
    schedule_interval="5 0 * * *",  # Diario a las 00:05 UTC
    start_date=days_ago(1),
    catchup=False,
    default_args=default_args,
    tags=["apod", "ingestion"],
)
def apod_pipeline():

    @task()
    def extract_apod() -> dict:
        """Extrae la imagen astronómica del día."""
        from ingestion.clients.apod_client import APODClient

        client = APODClient(api_key=os.environ.get("NASA_API_KEY", "DEMO_KEY"))
        data = asyncio.run(client.get_today())
        return client.normalize(data)

    @task()
    def save_to_minio(apod: dict) -> str:
        """Guarda APOD en MinIO."""
        from ingestion.minio_storage import MinIOStorage

        storage = MinIOStorage(
            endpoint=os.environ.get("MINIO_ENDPOINT", "minio:9000"),
            access_key=os.environ.get("MINIO_ACCESS_KEY", "minioadmin"),
            secret_key=os.environ.get("MINIO_SECRET_KEY", "minioadmin123secure"),
        )

        date_str = apod.get("date", datetime.now(timezone.utc).strftime("%Y-%m-%d"))
        parts = date_str.split("-")
        path = f"apod/{parts[0]}/{parts[1]}/{parts[2]}.json"

        storage.put_json("space-pulse-raw", path, apod)
        return path

    # Flujo
    apod_data = extract_apod()
    save_to_minio(apod_data)


dag_instance = apod_pipeline()
