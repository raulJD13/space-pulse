# ingestion/kafka_producer.py
import json
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)


class SpaceKafkaProducer:
    """
    Productor Kafka genérico para alertas del sistema Space Pulse.
    Envía mensajes al topic space.alerts cuando se detectan eventos críticos.
    """

    def __init__(self, bootstrap_servers: str):
        self.bootstrap_servers = bootstrap_servers
        self._producer = None

    def _get_producer(self):
        """Lazy init del producer de confluent-kafka."""
        if self._producer is None:
            try:
                from confluent_kafka import Producer
                self._producer = Producer({
                    "bootstrap.servers": self.bootstrap_servers,
                    "client.id": "space-pulse-producer",
                    "acks": "all",
                })
            except ImportError:
                logger.warning(
                    "confluent-kafka not installed. "
                    "Kafka alerts will be logged but not sent."
                )
        return self._producer

    def send_alert(
        self,
        topic: str,
        alert_type: str,
        severity: str,
        data: Dict[str, Any],
        key: Optional[str] = None,
    ):
        """
        Envía una alerta al topic de Kafka.

        Args:
            topic: nombre del topic (ej: 'space.alerts')
            alert_type: tipo de alerta (GEOMAGNETIC_STORM, NEO_CRITICAL, etc.)
            severity: nivel (G1-G5 para tormentas, LOW/MEDIUM/HIGH/CRITICAL)
            data: datos del evento
            key: clave de partición (opcional)
        """
        message = {
            "alert_type": alert_type,
            "severity": severity,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "data": data,
        }

        producer = self._get_producer()
        if producer is None:
            logger.info(f"[KAFKA-DRY] {alert_type} ({severity}): {json.dumps(data, default=str)[:200]}")
            return

        try:
            producer.produce(
                topic=topic,
                key=(key or alert_type).encode("utf-8"),
                value=json.dumps(message, default=str).encode("utf-8"),
                callback=self._delivery_callback,
            )
            producer.flush(timeout=5)
        except Exception as e:
            logger.error(f"Failed to send Kafka alert: {e}")

    @staticmethod
    def _delivery_callback(err, msg):
        """Callback para confirmación de entrega."""
        if err:
            logger.error(f"Kafka delivery failed: {err}")
        else:
            logger.debug(f"Kafka message delivered to {msg.topic()}[{msg.partition()}]")

    def close(self):
        """Flush y cierre del producer."""
        if self._producer:
            self._producer.flush(timeout=10)
