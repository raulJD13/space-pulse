# processing/parsers/tle_parser.py
import math
from typing import Dict, Optional


def parse_tle(line1: str, line2: str) -> Optional[Dict]:
    """
    Parsea un TLE (Two-Line Element set) y extrae parámetros orbitales.

    Formato TLE estándar:
    Línea 1: Número de satélite, clasificación, designador internacional,
             época, derivadas del movimiento medio
    Línea 2: Inclinación, RAAN, excentricidad, argumento de perigeo,
             anomalía media, movimiento medio (rev/día)
    """
    try:
        # Línea 1
        catalog_number = line1[2:7].strip()
        classification = line1[7].strip()
        epoch_year = int(line1[18:20].strip())
        epoch_day = float(line1[20:32].strip())
        mean_motion_dot = line1[33:43].strip()  # Primera derivada

        # Línea 2
        inclination = float(line2[8:16].strip())
        raan = float(line2[17:25].strip())  # Right Ascension of Ascending Node
        eccentricity = float(f"0.{line2[26:33].strip()}")
        arg_perigee = float(line2[34:42].strip())
        mean_anomaly = float(line2[43:51].strip())
        mean_motion = float(line2[52:63].strip())  # rev/día
        rev_number = int(line2[63:68].strip()) if line2[63:68].strip() else 0

        # Cálculos derivados
        period_minutes = 1440.0 / mean_motion if mean_motion > 0 else 0

        # Semi-major axis via Kepler's third law
        mu = 398600.4418  # km^3/s^2 (parámetro gravitacional terrestre)
        period_s = period_minutes * 60
        if period_s > 0:
            semi_major_axis = (mu * (period_s / (2 * math.pi)) ** 2) ** (1 / 3)
        else:
            semi_major_axis = 0

        # Altitud sobre superficie terrestre
        altitude_km = semi_major_axis - 6371.0 if semi_major_axis > 0 else 0

        # Perigeo y apogeo
        perigee_km = semi_major_axis * (1 - eccentricity) - 6371.0
        apogee_km = semi_major_axis * (1 + eccentricity) - 6371.0

        # Velocidad orbital media (vis-viva simplificada para órbita circular)
        if semi_major_axis > 0:
            velocity_km_s = math.sqrt(mu / semi_major_axis)
        else:
            velocity_km_s = 0

        # Año completo de la época
        full_year = 2000 + epoch_year if epoch_year < 57 else 1900 + epoch_year

        return {
            "catalog_number": catalog_number,
            "classification": classification,
            "epoch_year": full_year,
            "epoch_day": epoch_day,
            "inclination_deg": inclination,
            "raan_deg": raan,
            "eccentricity": eccentricity,
            "arg_perigee_deg": arg_perigee,
            "mean_anomaly_deg": mean_anomaly,
            "mean_motion_rev_day": mean_motion,
            "revolution_number": rev_number,
            "period_minutes": round(period_minutes, 2),
            "semi_major_axis_km": round(semi_major_axis, 2),
            "altitude_km": round(altitude_km, 2),
            "perigee_km": round(perigee_km, 2),
            "apogee_km": round(apogee_km, 2),
            "velocity_km_s": round(velocity_km_s, 3),
        }

    except (ValueError, IndexError) as e:
        return None
