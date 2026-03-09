# airflow/dags/dag_earth_events.py
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
    dag_id="earth_events_pipeline",
    description="Ingesta eventos naturales EONET + imágenes EPIC cada hora",
    schedule_interval="@hourly",
    start_date=days_ago(1),
    catchup=False,
    default_args=default_args,
    tags=["earth", "eonet", "epic", "ingestion"],
)
def earth_events_pipeline():

    @task()
    def extract_eonet_events() -> list:
        """Extrae eventos naturales activos de EONET v3."""
        from ingestion.clients.eonet_client import EONETClient

        client = EONETClient()
        events = asyncio.run(client.get_events(status="open", limit=100, days=7))
        return client.flatten_events(events)

    @task()
    def extract_epic_images() -> list:
        """Extrae metadatos de imágenes EPIC del día."""
        import httpx
        import logging
        from ingestion.clients.epic_client import EPICClient

        client = EPICClient(api_key=os.environ.get("NASA_API_KEY", "DEMO_KEY"))
        try:
            images = asyncio.run(client.get_images())
            if isinstance(images, list):
                return client.flatten_images(images)
        except (httpx.HTTPStatusError, httpx.TransportError) as e:
            logging.getLogger(__name__).warning(
                f"EPIC API unavailable ({e}), skipping EPIC images this run."
            )
        return []

    @task()
    def save_eonet_to_minio(events: list) -> str:
        """Guarda eventos EONET en MinIO."""
        from ingestion.minio_storage import MinIOStorage

        storage = MinIOStorage(
            endpoint=os.environ.get("MINIO_ENDPOINT", "minio:9000"),
            access_key=os.environ.get("MINIO_ACCESS_KEY", "minioadmin"),
            secret_key=os.environ.get("MINIO_SECRET_KEY", "minioadmin123secure"),
        )

        now = datetime.now(timezone.utc)
        path = f"eonet/{now.strftime('%Y/%m/%d/%H%M%S')}.json"
        storage.put_json("space-pulse-raw", path, events)
        return path

    @task()
    def save_epic_to_minio(images: list) -> str:
        """Guarda metadatos EPIC en MinIO."""
        from ingestion.minio_storage import MinIOStorage

        storage = MinIOStorage(
            endpoint=os.environ.get("MINIO_ENDPOINT", "minio:9000"),
            access_key=os.environ.get("MINIO_ACCESS_KEY", "minioadmin"),
            secret_key=os.environ.get("MINIO_SECRET_KEY", "minioadmin123secure"),
        )

        now = datetime.now(timezone.utc)
        path = f"epic/{now.strftime('%Y/%m/%d')}/images_metadata.json"
        storage.put_json("space-pulse-raw", path, images)
        return path

    # Flujo: EONET y EPIC se ejecutan en paralelo
    eonet_data = extract_eonet_events()
    epic_data = extract_epic_images()
    save_eonet_to_minio(eonet_data)
    save_epic_to_minio(epic_data)


dag_instance = earth_events_pipeline()
