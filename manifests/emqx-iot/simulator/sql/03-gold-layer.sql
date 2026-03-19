CREATE OR REPLACE VIEW gold.zone_health_latest AS
SELECT DISTINCT ON (zone_id)
  zone_id,
  device_id,
  ts AS last_seen,
  scenario,
  severity,
  temperature,
  humidity,
  co2,
  vpd,
  soil_moisture,
  irrigation_flow,
  NOW() - ts AS age,
  CASE
    WHEN NOW() - ts > INTERVAL '10 minutes' THEN 'critical'
    WHEN NOW() - ts > INTERVAL '5 minutes' THEN 'warning'
    ELSE 'normal'
  END AS freshness_status
FROM silver.telemetry
ORDER BY zone_id, ts DESC;


CREATE OR REPLACE VIEW gold.fleet_summary_latest AS
SELECT
  COUNT(*) AS zones,
  COUNT(*) FILTER (WHERE freshness_status = 'normal') AS healthy_zones,
  COUNT(*) FILTER (WHERE freshness_status = 'warning') AS warning_zones,
  COUNT(*) FILTER (WHERE freshness_status = 'critical') AS critical_zones,
  AVG(temperature) AS avg_temperature,
  AVG(humidity) AS avg_humidity,
  AVG(co2) AS avg_co2,
  AVG(vpd) AS avg_vpd,
  AVG(soil_moisture) AS avg_soil_moisture
FROM gold.zone_health_latest;


CREATE OR REPLACE VIEW gold.scenario_summary AS
SELECT
  scenario,
  COUNT(*) AS sample_count,
  AVG(temperature) AS avg_temperature,
  AVG(humidity) AS avg_humidity,
  AVG(co2) AS avg_co2,
  AVG(vpd) AS avg_vpd,
  AVG(soil_moisture) AS avg_soil_moisture
FROM silver.telemetry
GROUP BY scenario;
