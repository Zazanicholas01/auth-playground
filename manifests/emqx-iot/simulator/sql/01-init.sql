CREATE SCHEMA IF NOT EXISTS bronze;
CREATE SCHEMA IF NOT EXISTS silver;
CREATE SCHEMA IF NOT EXISTS gold;

CREATE TABLE IF NOT EXISTS bronze.telemetry_raw (
    ingest_id BIGSERIAL PRIMARY KEY,
    ingest_ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source_topic TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'telemetry',
    device_id TEXT,
    zone_id TEXT,
    event_ts TIMESTAMPTZ,
    payload JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS bronze.events_raw (
  ingest_id BIGSERIAL PRIMARY KEY,
  ingest_ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source_topic TEXT NOT NULL,
  event_type TEXT NOT NULL,
  device_id TEXT,
  zone_id TEXT,
  event_ts TIMESTAMPTZ,
  payload JSONB NOT NULL
);

SELECT create_hypertable('bronze.telemetry_raw', 'ingest_ts', if_not_exists => TRUE);
SELECT create_hypertable('bronze.events_raw', 'ingest_ts', if_not_exists => TRUE);

CREATE TABLE IF NOT EXISTS silver.telemetry (
    ts TIMESTAMPTZ NOT NULL,
    ingest_ts TIMESTAMPTZ NOT NULL,
    source_topic TEXT NOT NULL,
    device_id TEXT NOT NULL,
    zone_id TEXT NOT NULL,
    scenario TEXT,
    severity TEXT,
    online BOOLEAN,
    temperature DOUBLE PRECISION,
    humidity DOUBLE PRECISION,
    co2 DOUBLE PRECISION,
    par DOUBLE PRECISION,
    pressure DOUBLE PRECISION,
    dew_point DOUBLE PRECISION,
    vpd DOUBLE PRECISION,
    soil_moisture DOUBLE PRECISION,
    soil_temperature DOUBLE PRECISION,
    tank_level DOUBLE PRECISION,
    irrigation_flow DOUBLE PRECISION,
    payload JSONB NOT NULL
);

SELECT create_hypertable('silver.telemetry', 'ts', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS silver_telemetry_device_ts_idx
    ON silver.telemetry (device_id, ts DESC);

CREATE INDEX IF NOT EXISTS silver_telemetry_zone_ts_idx
    ON silver.telemetry (zone_id, ts DESC);

CREATE TABLE IF NOT EXISTS silver.device_state_latest (
  device_id TEXT NOT NULL,
  zone_id TEXT NOT NULL,
  last_topic TEXT,
  last_seen TIMESTAMPTZ NOT NULL,
  state JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS silver_device_state_last_seen_idx
  ON silver.device_state_latest (last_seen DESC);

CREATE TABLE IF NOT EXISTS silver.alerts (
  event_ts TIMESTAMPTZ NOT NULL,
  ingest_ts TIMESTAMPTZ NOT NULL,
  source_topic TEXT NOT NULL,
  device_id TEXT,
  zone_id TEXT,
  severity TEXT,
  message TEXT,
  payload JSONB NOT NULL
);

SELECT create_hypertable('silver.alerts', 'event_ts', if_not_exists => TRUE);

CREATE TABLE IF NOT EXISTS silver.etl_watermark (
  pipeline_name TEXT PRIMARY KEY,
  last_ingest_ts TIMESTAMPTZ NOT NULL
);