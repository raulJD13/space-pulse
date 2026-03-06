# api/models/schemas.py
from pydantic import BaseModel
from datetime import datetime, date
from typing import Optional
from enum import Enum


class AlertSeverity(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class AlertResponse(BaseModel):
    alert_id: str
    alert_type: str
    created_at: datetime
    severity: str
    severity_numeric: int
    description: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    class Config:
        from_attributes = True


class SummaryResponse(BaseModel):
    summary_date: date
    solar_alerts_24h: int = 0
    high_risk_neos_upcoming: int = 0
    earth_events_24h: int = 0
    satellite_anomalies_24h: int = 0
    total_alerts_today: int = 0
    critical_today: int = 0
    system_status: str = "NORMAL"
    last_updated: datetime

    class Config:
        from_attributes = True


class NeoResponse(BaseModel):
    neo_id: str
    neo_name: str
    close_approach_date: str
    diameter_max_km: float
    velocity_km_s: float
    miss_distance_lunar: float
    risk_score: float
    risk_level: str
    is_hazardous: bool
    days_until_approach: int

    class Config:
        from_attributes = True


class EarthEventResponse(BaseModel):
    event_id: str
    title: str
    category: str
    status: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    event_date: datetime
    severity_label: str
    severity_numeric: int

    class Config:
        from_attributes = True


class MarsWeatherResponse(BaseModel):
    sol: int
    earth_date: str
    temp_avg_celsius: Optional[float] = None
    temp_min_celsius: Optional[float] = None
    temp_max_celsius: Optional[float] = None
    wind_speed_avg_ms: Optional[float] = None
    pressure_pa: Optional[float] = None
    season: str = ""

    class Config:
        from_attributes = True


class SatelliteResponse(BaseModel):
    satellite_id: str
    satellite_name: str
    altitude_km: float
    inclination_deg: float
    period_minutes: float
    anomaly_score: float
    is_anomalous: bool

    class Config:
        from_attributes = True


class APODResponse(BaseModel):
    date: str
    title: str
    explanation: str
    media_type: str = "image"
    url: str
    hdurl: str = ""
    copyright: str = ""

    class Config:
        from_attributes = True
