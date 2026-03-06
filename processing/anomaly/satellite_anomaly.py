# processing/anomaly/satellite_anomaly.py
import numpy as np
import logging
from typing import List, Dict
from pathlib import Path

logger = logging.getLogger(__name__)

# Features usados para detección de anomalías
FEATURES = ["altitude_km", "inclination_deg", "period_minutes", "mean_motion_rev_day"]


class SatelliteAnomalyDetector:
    """
    Detecta comportamientos orbitales anómalos en satélites usando Isolation Forest.

    Por qué Isolation Forest:
    - No necesita ejemplos etiquetados de anomalías (unsupervised)
    - Funciona bien con datos multidimensionales
    - Eficiente para datasets de tamaño medio (~10k observaciones)
    - Produce un anomaly_score continuo, no solo binario

    Una anomalía podría indicar:
    - Maniobra evasiva de satélite
    - Degradación orbital (decaimiento)
    - Satélite fuera de control
    - Posible objeto nuevo no catalogado
    """

    MODEL_DIR = Path("space-pulse-models")
    MODEL_PATH = MODEL_DIR / "isolation_forest_v1.pkl"
    SCALER_PATH = MODEL_DIR / "scaler_v1.pkl"
    CONTAMINATION = 0.02  # ~2% de observaciones esperadas como anómalas

    def __init__(self):
        self.model = None
        self.scaler = None
        self._load_or_init()

    def _load_or_init(self):
        """Carga modelo guardado o inicializa uno nuevo."""
        try:
            import joblib
            if self.MODEL_PATH.exists():
                self.model = joblib.load(self.MODEL_PATH)
                self.scaler = joblib.load(self.SCALER_PATH)
                logger.info("Loaded existing anomaly detection model")
                return
        except Exception as e:
            logger.warning(f"Could not load model: {e}")

        from sklearn.ensemble import IsolationForest
        from sklearn.preprocessing import StandardScaler

        self.model = IsolationForest(
            n_estimators=200,
            contamination=self.CONTAMINATION,
            random_state=42,
            n_jobs=-1,
        )
        self.scaler = StandardScaler()
        logger.info("Initialized new anomaly detection model")

    def train(self, historical_data: List[Dict]):
        """
        Entrena el modelo con datos históricos (últimos 30 días).
        Se llama automáticamente desde Airflow si el modelo tiene > 7 días.
        """
        import joblib

        features_matrix = self._extract_features(historical_data)
        if features_matrix is None or len(features_matrix) < 10:
            logger.warning("Not enough training data, need at least 10 observations")
            return

        X_scaled = self.scaler.fit_transform(features_matrix)
        self.model.fit(X_scaled)

        # Persistir modelo
        self.MODEL_DIR.mkdir(parents=True, exist_ok=True)
        joblib.dump(self.model, self.MODEL_PATH)
        joblib.dump(self.scaler, self.SCALER_PATH)
        logger.info(f"Model trained with {len(features_matrix)} observations")

    def detect(self, observations: List[Dict]) -> List[Dict]:
        """
        Detecta anomalías en batch de observaciones.

        Returns:
            Lista de dicts con campos adicionales:
            - anomaly_score: float, más negativo = más anómalo
            - is_anomalous: bool, True si el modelo lo clasifica como outlier
        """
        features_matrix = self._extract_features(observations)
        if features_matrix is None or len(features_matrix) == 0:
            return observations

        # Si el scaler no está fitted, usar detección estadística simple
        try:
            X_scaled = self.scaler.transform(features_matrix)
            predictions = self.model.predict(X_scaled)
            scores = self.model.score_samples(X_scaled)
        except Exception:
            logger.warning("Model not trained, using statistical fallback")
            return self._statistical_detect(observations, features_matrix)

        valid_idx = 0
        for obs in observations:
            if self._has_valid_features(obs):
                obs["anomaly_score"] = float(scores[valid_idx])
                obs["is_anomalous"] = bool(predictions[valid_idx] == -1)
                valid_idx += 1
            else:
                obs["anomaly_score"] = 0.0
                obs["is_anomalous"] = False

        return observations

    def _extract_features(self, data: List[Dict]) -> np.ndarray | None:
        """Extrae la matriz de features de una lista de observaciones."""
        rows = []
        for obs in data:
            if self._has_valid_features(obs):
                rows.append([float(obs[f]) for f in FEATURES])

        if not rows:
            return None
        return np.array(rows)

    def _has_valid_features(self, obs: Dict) -> bool:
        """Verifica que una observación tiene todos los features necesarios."""
        return all(obs.get(f) is not None for f in FEATURES)

    def _statistical_detect(
        self, observations: List[Dict], features: np.ndarray
    ) -> List[Dict]:
        """
        Fallback: detección estadística simple usando Z-score.
        Marca como anómalo si cualquier feature está a > 3 desviaciones estándar.
        """
        mean = np.mean(features, axis=0)
        std = np.std(features, axis=0)
        std[std == 0] = 1  # Evitar división por cero

        valid_idx = 0
        for obs in observations:
            if self._has_valid_features(obs):
                row = features[valid_idx]
                z_scores = np.abs((row - mean) / std)
                max_z = float(np.max(z_scores))
                obs["anomaly_score"] = -max_z  # Más negativo = más anómalo
                obs["is_anomalous"] = max_z > 3.0
                valid_idx += 1
            else:
                obs["anomaly_score"] = 0.0
                obs["is_anomalous"] = False

        return observations

    def get_anomalies_only(self, observations: List[Dict]) -> List[Dict]:
        """Shortcut: solo devuelve las observaciones anómalas."""
        detected = self.detect(observations)
        return [o for o in detected if o.get("is_anomalous", False)]
