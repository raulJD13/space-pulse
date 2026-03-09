# airflow/dags/dag_satellites_tle.py
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
    "execution_timeout": timedelta(minutes=15),
}


@dag(
    dag_id="satellite_tle_pipeline",
    description="Ingesta datos TLE de satélites y detección de anomalías cada hora",
    schedule_interval="@hourly",
    start_date=days_ago(1),
    catchup=False,
    default_args=default_args,
    tags=["satellites", "tle", "anomaly", "ml"],
)
def satellite_pipeline():

    @task()
    def extract_tle_data() -> list:
        """Descarga TLE de satélites activos (Starlink, ISS, weather sats)."""
        import httpx
        import logging
        from ingestion.clients.tle_client import TLEClient

        client = TLEClient()

        async def get_all():
            try:
                starlink, iss, weather = await asyncio.gather(
                    client.get_satellites("starlink", 50),
                    client.get_satellites("ISS", 5),
                    client.get_satellites("weather", 30),
                )
                return starlink + iss + weather
            except (httpx.HTTPStatusError, httpx.TransportError) as e:
                logging.getLogger(__name__).warning(
                    f"TLE API unavailable ({e}), skipping satellite data this run."
                )
                return []

        return asyncio.run(get_all())

    @task()
    def compute_orbital_params(satellites: list) -> list:
        """Calcula posición y parámetros orbitales para cada satélite."""
        from ingestion.clients.tle_client import TLEClient

        client = TLEClient()
        return client.parse_satellites(satellites)

    @task()
    def detect_anomalies(orbital_data: list) -> list:
        """
        Aplica Isolation Forest para detectar comportamientos orbitales anómalos.
        Features: altitud, velocidad, inclinación, período.
        """
        from processing.anomaly.satellite_anomaly import SatelliteAnomalyDetector

        detector = SatelliteAnomalyDetector()
        return detector.detect(orbital_data)

    @task()
    def save_to_minio(results: list) -> str:
        """Guarda datos orbitales + anomalías en MinIO."""
        from ingestion.minio_storage import MinIOStorage

        storage = MinIOStorage(
            endpoint=os.environ.get("MINIO_ENDPOINT", "minio:9000"),
            access_key=os.environ.get("MINIO_ACCESS_KEY", "minioadmin"),
            secret_key=os.environ.get("MINIO_SECRET_KEY", "minioadmin123secure"),
        )

        now = datetime.now(timezone.utc)
        path = f"tle/{now.strftime('%Y/%m/%d/%H%M%S')}.json"
        storage.put_json("space-pulse-raw", path, results)

        # Separar anomalías para fácil acceso
        anomalies = [r for r in results if r.get("is_anomalous")]
        if anomalies:
            anomaly_path = f"tle/{now.strftime('%Y/%m/%d')}/anomalies_{now.strftime('%H%M%S')}.json"
            storage.put_json("space-pulse-raw", anomaly_path, anomalies)

        return path

    @task()
    def alert_anomalies(results: list):
        """Envía alertas a Kafka si hay satélites anómalos."""
        from ingestion.kafka_producer import SpaceKafkaProducer

        anomalies = [r for r in results if r.get("is_anomalous")]
        if not anomalies:
            return

        producer = SpaceKafkaProducer(
            bootstrap_servers=os.environ.get("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")
        )

        for sat in anomalies:
            producer.send_alert(
                topic="space.alerts",
                alert_type="SATELLITE_ANOMALY",
                severity="HIGH",
                data={
                    "satellite_id": sat.get("satellite_id"),
                    "name": sat.get("name"),
                    "anomaly_score": sat.get("anomaly_score"),
                    "altitude_km": sat.get("altitude_km"),
                },
            )

        producer.close()

    # Flujo: Extract → Compute → Detect → Save + Alert en paralelo
    sats = extract_tle_data()
    orbital = compute_orbital_params(sats)
    detected = detect_anomalies(orbital)
    save_to_minio(detected)
    alert_anomalies(detected)


dag_instance = satellite_pipeline()
