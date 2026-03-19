CREATE MATERIALIZED VIEW IF NOT EXISTS gold.zone_metrics_5m
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('5 minutes', ts) AS bucket,
  zone_id,
  AVG(temperature) AS avg_temperature,
  MIN(temperature) AS min_temperature,
  MAX(temperature) AS max_temperature,
  AVG(humidity) AS avg_humidity,
  AVG(co2) AS avg_co2,
  AVG(vpd) AS avg_vpd,
  AVG(soil_moisture) AS avg_soil_moisture,
  AVG(irrigation_flow) AS avg_irrigation_flow,
  COUNT(*) AS sample_count
FROM silver.telemetry
GROUP BY bucket, zone_id;


CREATE MATERIALIZED VIEW IF NOT EXISTS gold.alert_counts_1h
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 hour', event_ts) AS bucket,
  zone_id,
  severity,
  COUNT(*) AS alert_count
FROM silver.alerts
GROUP BY bucket, zone_id, severity;
