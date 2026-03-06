# processing/parsers/neo_scorer.py
from typing import Dict, List


class NeoRiskScorer:
    """
    Calcula un risk_score compuesto para cada asteroide NEO.

    Fórmula: (diameter_max_km^3 * velocity_km_s) / max(miss_distance_lunar, 0.1)

    Niveles:
    - CRITICAL: is_hazardous AND miss_distance_lunar < 5
    - HIGH: risk_score > 10
    - MEDIUM: risk_score > 1
    - LOW: risk_score <= 1
    """

    def score(self, neo: Dict) -> Dict:
        """Calcula risk_score y risk_level para un solo NEO."""
        diameter = neo.get("diameter_max_km") or neo.get("_diameter_max_km", 0)
        velocity = neo.get("velocity_km_s") or neo.get("_velocity_km_s", 0)
        miss_dist = neo.get("miss_distance_lunar") or neo.get("_miss_distance_lunar", 0)
        is_hazardous = neo.get("is_hazardous") or neo.get("is_potentially_hazardous_asteroid", False)

        # Evitar división por cero
        safe_dist = max(float(miss_dist), 0.1)

        risk_score = round(
            (float(diameter) ** 3 * float(velocity)) / safe_dist,
            6,
        )

        # Clasificación
        if is_hazardous and float(miss_dist) < 5:
            risk_level = "CRITICAL"
        elif risk_score > 10:
            risk_level = "HIGH"
        elif risk_score > 1:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"

        neo["risk_score"] = risk_score
        neo["risk_level"] = risk_level
        return neo

    def score_all(self, neos: List[Dict]) -> List[Dict]:
        """Calcula risk_score para una lista de NEOs y ordena por riesgo descendente."""
        scored = [self.score(neo) for neo in neos]
        scored.sort(key=lambda n: n.get("risk_score", 0), reverse=True)
        return scored
