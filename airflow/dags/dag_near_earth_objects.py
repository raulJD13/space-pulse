# airflow/dags/dag_near_earth_objects.py
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
    dag_id="near_earth_objects_pipeline",
    schedule_interval="0 6 * * *",  # Ejecutar diariamente a las 6am UTC
    start_date=days_ago(1),
    catchup=False,
    default_args=default_args,
    tags=["asteroids", "neows", "ingestion"],
)
def neo_pipeline():
    
    @task()
    def extract_neos() -> list:
        """Extrae y aplana la lista de asteroides para los próximos 7 días."""
        from ingestion.clients.neows_client import NeoWsClient
        
        client = NeoWsClient(api_key=os.environ.get("NASA_API_KEY", "DEMO_KEY"))
        feed = asyncio.run(client.get_feed(days_ahead=7))
        return client.flatten_neos(feed)
    
    @task()
    def save_to_minio(neos: list) -> str:
        """Guarda la lista de asteroides en el Data Lake."""
        from ingestion.minio_storage import MinIOStorage

        storage = MinIOStorage(
            endpoint=os.environ.get("MINIO_ENDPOINT", "minio:9000"),
            access_key=os.environ.get("MINIO_ACCESS_KEY", "minioadmin"),
            secret_key=os.environ.get("MINIO_SECRET_KEY", "minioadmin123secure")
        )

        now = datetime.now(timezone.utc)
        path = f"neows/{now.strftime('%Y/%m/%d/%H%M%S')}.json"

        storage.put_json("space-pulse-raw", path, neos)
        return path

    @task()
    def insert_to_clickhouse(neos: list) -> int:
        """Inserta asteroides en ClickHouse (neo_daily + space_alerts)."""
        from ingestion.clickhouse_inserter import insert_neos
        return insert_neos(neos)

    # Definir el flujo
    extracted_neos = extract_neos()
    save_to_minio(extracted_neos)
    insert_to_clickhouse(extracted_neos)

# Instanciar el DAG
neo_dag = neo_pipeline()