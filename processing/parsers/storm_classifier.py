# processing/parsers/storm_classifier.py
from typing import Dict, List


# Escala Kp → G-level para tormentas geomagnéticas
KP_TO_G = {
    5: 1,  # G1 - Minor
    6: 2,  # G2 - Moderate
    7: 3,  # G3 - Strong
    8: 4,  # G4 - Severe
    9: 5,  # G5 - Extreme
}

G_LABELS = {
    0: "NONE",
    1: "G1_MINOR",
    2: "G2_MODERATE",
    3: "G3_STRONG",
    4: "G4_SEVERE",
    5: "G5_EXTREME",
}


def classify_geomagnetic_storms(storms: List[Dict]) -> List[Dict]:
    """
    Clasifica tormentas geomagnéticas en escala G1-G5 basándose en el índice Kp.

    Cada tormenta del DONKI API tiene allKpIndex con observaciones Kp.
    Se toma el Kp máximo observado para determinar el G-level.
    """
    classified = []

    for storm in storms:
        kp_indices = storm.get("allKpIndex", [])

        if not kp_indices:
            max_kp = 0
        else:
            max_kp = max(
                int(float(kp.get("kpIndex", 0)))
                for kp in kp_indices
                if kp.get("kpIndex") is not None
            )

        # Mapear Kp a G-level
        g_level = 0
        for kp_threshold, g_val in sorted(KP_TO_G.items()):
            if max_kp >= kp_threshold:
                g_level = g_val

        storm["max_kp_index"] = max_kp
        storm["g_level"] = g_level
        storm["g_label"] = G_LABELS.get(g_level, "NONE")
        storm["is_significant"] = g_level >= 3  # G3+ requiere alerta

        classified.append(storm)

    return classified


def classify_solar_flare(class_type: str) -> Dict:
    """
    Clasifica una llamarada solar por su tipo (A, B, C, M, X).
    X es la más potente.

    Returns dict con severity_numeric y severity_label.
    """
    if not class_type:
        return {"severity_numeric": 0, "severity_label": "UNKNOWN"}

    letter = class_type[0].upper()
    mapping = {
        "X": (5, "CRITICAL"),
        "M": (4, "HIGH"),
        "C": (3, "MEDIUM"),
        "B": (2, "LOW"),
        "A": (1, "LOW"),
    }

    numeric, label = mapping.get(letter, (0, "UNKNOWN"))
    return {"severity_numeric": numeric, "severity_label": label}
