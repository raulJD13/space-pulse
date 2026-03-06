-- ClickHouse init.sql — Space Pulse Database Schema
-- Se ejecuta automáticamente al iniciar el contenedor ClickHouse

CREATE DATABASE IF NOT EXISTS space_pulse;

-- ═══════════════════════════════════════════════════════════════
-- RAW TABLES (cargadas por Airflow)
-- ═══════════════════════════════════════════════════════════════

-- Eventos solares (CME, Flares, Storms)
CREATE TABLE IF NOT EXISTS space_pulse.solar_events (
    event_id String,
    event_type Enum8('CME'=1, 'FLARE'=2, 'STORM'=3, 'SEP'=4),
    begin_time DateTime,
    peak_time Nullable(DateTime),
    end_time Nullable(DateTime),
    class_type String,
    severity_label Enum8('LOW'=1, 'MEDIUM'=2, 'HIGH'=3, 'CRITICAL'=4),
    severity_numeric UInt8,
    source_location String DEFAULT '',
    ingested_at DateTime DEFAULT now()
) ENGINE = MergeTree()
ORDER BY (begin_time, event_type)
PARTITION BY toYYYYMM(begin_time);

-- Asteroides (Near Earth Objects)
CREATE TABLE IF NOT EXISTS space_pulse.neo_daily (
    neo_id String,
    neo_name String,
    close_approach_date Date,
    diameter_min_km Float64,
    diameter_max_km Float64,
    velocity_km_s Float64,
    miss_distance_lunar Float64,
    miss_distance_km Float64,
    risk_score Float64 DEFAULT 0,
    risk_level Enum8('LOW'=1, 'MEDIUM'=2, 'HIGH'=3, 'CRITICAL'=4),
    is_hazardous Boolean,
    is_sentry_monitored Boolean DEFAULT false,
    days_until_approach Int16,
    ingested_at DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(ingested_at)
ORDER BY (close_approach_date, neo_id);

-- Eventos terrestres (EONET)
CREATE TABLE IF NOT EXISTS space_pulse.earth_events (
    event_id String,
    title String,
    category String,
    status Enum8('open'=1, 'closed'=2),
    latitude Nullable(Float64),
    longitude Nullable(Float64),
    event_date DateTime,
    closed_date Nullable(DateTime),
    source_url String DEFAULT '',
    ingested_at DateTime DEFAULT now()
) ENGINE = MergeTree()
ORDER BY (event_date, category)
PARTITION BY toYYYYMM(event_date);

-- Imágenes EPIC
CREATE TABLE IF NOT EXISTS space_pulse.epic_images (
    identifier String,
    caption String,
    image_name String,
    image_url String,
    date DateTime,
    centroid_lat Nullable(Float64),
    centroid_lon Nullable(Float64),
    dscovr_x Nullable(Float64),
    dscovr_y Nullable(Float64),
    dscovr_z Nullable(Float64),
    ingested_at DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(ingested_at)
ORDER BY (date, identifier);

-- Clima marciano (InSight)
CREATE TABLE IF NOT EXISTS space_pulse.mars_weather (
    sol UInt16,
    earth_date Date,
    temp_avg_celsius Nullable(Float32),
    temp_min_celsius Nullable(Float32),
    temp_max_celsius Nullable(Float32),
    wind_speed_avg_ms Nullable(Float32),
    wind_direction_degrees Nullable(Float32),
    pressure_pa Nullable(Float32),
    season String DEFAULT '',
    ingested_at DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(ingested_at)
ORDER BY (earth_date, sol);

-- Satélites + anomalías
CREATE TABLE IF NOT EXISTS space_pulse.satellite_observations (
    observation_id UUID DEFAULT generateUUIDv4(),
    satellite_id String,
    satellite_name String,
    timestamp DateTime,
    altitude_km Float64,
    inclination_deg Float64,
    period_minutes Float64,
    mean_motion_rev_day Float64,
    eccentricity Float64 DEFAULT 0,
    anomaly_score Float64 DEFAULT 0,
    is_anomalous Boolean DEFAULT false,
    ingested_at DateTime DEFAULT now()
) ENGINE = MergeTree()
ORDER BY (timestamp, satellite_id)
PARTITION BY toYYYYMM(timestamp)
TTL ingested_at + INTERVAL 90 DAY;

-- APOD
CREATE TABLE IF NOT EXISTS space_pulse.apod (
    date Date,
    title String,
    explanation String,
    media_type String DEFAULT 'image',
    url String,
    hdurl String DEFAULT '',
    thumbnail_url String DEFAULT '',
    copyright String DEFAULT '',
    ingested_at DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(ingested_at)
ORDER BY date;

-- ═══════════════════════════════════════════════════════════════
-- TABLA UNIFICADA DE ALERTAS (mart principal del dashboard)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS space_pulse.space_alerts (
    alert_id String,
    alert_type Enum8(
        'SOLAR_FLARE'=1,
        'NEAR_EARTH_OBJECT'=2,
        'SATELLITE_ANOMALY'=3,
        'EARTH_EVENT'=4,
        'GEOMAGNETIC_STORM'=5
    ),
    created_at DateTime,
    severity Enum8('LOW'=1, 'MEDIUM'=2, 'HIGH'=3, 'CRITICAL'=4),
    severity_numeric UInt8,
    description String,
    latitude Nullable(Float64),
    longitude Nullable(Float64),
    metadata String DEFAULT '{}'
) ENGINE = MergeTree()
ORDER BY (created_at, alert_type)
PARTITION BY toYYYYMM(created_at)
TTL created_at + INTERVAL 365 DAY;

-- ═══════════════════════════════════════════════════════════════
-- VISTA DE RESUMEN DIARIO
-- ═══════════════════════════════════════════════════════════════

CREATE VIEW IF NOT EXISTS space_pulse.v_daily_summary AS
SELECT
    today() AS summary_date,
    countIf(alert_type = 'SOLAR_FLARE' AND created_at >= today()) AS solar_alerts_today,
    countIf(alert_type = 'NEAR_EARTH_OBJECT' AND created_at >= today()) AS neo_alerts_today,
    countIf(alert_type = 'SATELLITE_ANOMALY' AND created_at >= today()) AS satellite_anomalies_today,
    countIf(alert_type = 'EARTH_EVENT' AND created_at >= today()) AS earth_events_today,
    countIf(created_at >= today()) AS total_alerts_today,
    countIf(severity = 'CRITICAL' AND created_at >= today()) AS critical_today,
    CASE
        WHEN countIf(severity = 'CRITICAL' AND created_at >= today()) > 0 THEN 'CRITICAL'
        WHEN countIf(severity = 'HIGH' AND created_at >= today()) > 0 THEN 'HIGH'
        WHEN countIf(severity = 'MEDIUM' AND created_at >= today()) > 0 THEN 'ELEVATED'
        ELSE 'NORMAL'
    END AS system_status,
    max(created_at) AS last_updated
FROM space_pulse.space_alerts
WHERE created_at >= today() - INTERVAL 7 DAY;
