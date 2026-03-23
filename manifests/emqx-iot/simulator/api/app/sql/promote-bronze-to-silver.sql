BEGIN;

CREATE TABLE IF NOT EXISTS silver.etl_watermark (
    pipeline_name TEXT PRIMARY KEY,
    last_ingest_ts TIMESTAMPTZ NOT NULL
);

WITH telemetry_watermark AS (
    SELECT COALESCE (
        (SELECT last_ingest_ts
        FROM silver.etl_watermark
        WHERE pipeline_name = 'telemetry'),
        TIMESTAMPTZ '1970-01-01'
    ) AS last_ts
),
new_telemetry AS (
    SELECT *
    FROM bronze.telemetry_raw
    WHERE ingest_ts > (SELECT last_ts FROM telemetry_watermark)
)
INSERT INTO silver.telemetry (
    ts,
    ingest_ts,
    source_topic,
    device_id,
    zone_id,
    scenario,
    severity,
    online,
    temperature,
    humidity,
    co2,
    par,
    pressure,
    dew_point,
    vpd,
    soil_moisture,
    soil_temperature,
    tank_level,
    irrigation_flow,
    payload
)
SELECT
    COALESCE(event_ts, ingest_ts),
    ingest_ts,
    source_topic,
    COALESCE(device_id, payload->>'deviceId', payload->>'zoneId'),
    COALESCE(zone_id, payload->>'zoneId', payload->>'deviceId'),
    payload->>'scenario',
    payload->>'severity',
    CASE
        WHEN payload ? 'online' THEN (payload->>'online')::BOOLEAN
        ELSE TRUE
    END,
    NULLIF(payload->'indoor'->>'temperature', '')::DOUBLE PRECISION,
    NULLIF(payload->'indoor'->>'humidity', '')::DOUBLE PRECISION,
    NULLIF(payload->'indoor'->>'co2', '')::DOUBLE PRECISION,
    NULLIF(payload->'indoor'->>'par', '')::DOUBLE PRECISION,
    NULLIF(payload->'indoor'->>'pressure', '')::DOUBLE PRECISION,
    COALESCE(
        NULLIF(payload->'derived'->>'dewPoint', '')::DOUBLE PRECISION,
        NULLIF(payload->'indoor'->>'dewPoint', '')::DOUBLE PRECISION
    ),
    COALESCE(
        NULLIF(payload->'derived'->>'vpd', '')::DOUBLE PRECISION,
        NULLIF(payload->'indoor'->>'vpd', '')::DOUBLE PRECISION
    ),
    NULLIF(payload->'soil'->>'moisture', '')::DOUBLE PRECISION,
    NULLIF(payload->'soil'->>'temperature', '')::DOUBLE PRECISION,
    NULLIF(payload->'soil'->>'tankLevel', '')::DOUBLE PRECISION,
    NULLIF(payload->'soil'->>'irrigationFlow', '')::DOUBLE PRECISION,
    payload
FROM new_telemetry;

INSERT INTO silver.etl_watermark (pipeline_name, last_ingest_ts)
VALUES (
    'telemetry',
    COALESCE((SELECT MAX(ingest_ts) FROM bronze.telemetry_raw), TIMESTAMPTZ '1970-01-01')
)
ON CONFLICT (pipeline_name)
DO UPDATE SET last_ingest_ts = EXCLUDED.last_ingest_ts;

WITH alerts_watermark AS (
    SELECT COALESCE(
        (SELECT last_ingest_ts
        FROM silver.etl_watermark
        WHERE pipeline_name = 'alerts'),
        TIMESTAMPTZ '1970-01-01'
    ) AS last_ts
),
new_alerts AS (
    SELECT *
    FROM bronze.events_raw
    WHERE ingest_ts > (SELECT last_ts FROM alerts_watermark)
        AND event_type = 'alerts'
)
INSERT INTO silver.alerts (
  event_ts,
  ingest_ts,
  source_topic,
  device_id,
  zone_id,
  severity,
  message,
  payload
)
SELECT
  COALESCE(event_ts, ingest_ts),
  ingest_ts,
  source_topic,
  COALESCE(device_id, payload->>'deviceId', payload->>'zoneId'),
  COALESCE(zone_id, payload->>'zoneId', payload->>'deviceId'),
  payload->>'severity',
  payload->>'message',
  payload
FROM new_alerts;

INSERT INTO silver.etl_watermark (pipeline_name, last_ingest_ts)
VALUES (
  'alerts',
  COALESCE(
    (SELECT MAX(ingest_ts) FROM bronze.events_raw WHERE event_type = 'alerts'),
    TIMESTAMPTZ '1970-01-01'
  )
)
ON CONFLICT (pipeline_name)
DO UPDATE SET last_ingest_ts = EXCLUDED.last_ingest_ts;

COMMIT;