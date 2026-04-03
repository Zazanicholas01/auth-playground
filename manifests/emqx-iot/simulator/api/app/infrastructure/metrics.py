from prometheus_client import Counter, Gauge, Histogram

mqtt_connected = Gauge(
    "iot_api_mqtt_connected",
    "Whether the MQTT consumer is currently connected"
)

mqtt_messages_total = Counter(
    "iot_api_mqtt_messages_total",
    "Total MQTT messages processed",
    ["event_type"]
)

mqtt_processing_failures_total = Counter(
    "iot_api_mqtt_processing_failures_total",
    "Total MQTT message processing failures",
    ["event_type"]
)

mqtt_reconnects_total = Counter(
    "iot_api_mqtt_reconnects_total",
    "Total MQTT reconnect attempts"
)

db_write_seconds = Histogram(
    "iot_api_db_write_seconds",
    "Time spent writing telemetry/event data to DB"
)

mqtt_message_processing_seconds = Histogram(
    "iot_api_mqtt_message_processing_seconds",
    "Time spent parsing and processing inbound MQTT messages",
    ["event_type"]
)

telemetry_ingested_total = Counter(
    "iot_api_telemetry_ingested_total",
    "Telemetry accepted into the ingest pipeline",
    ["zone_id", "event_type"]
)

telemetry_persisted_total = Counter(
    "iot_api_telemetry_persisted_total",
    "Telemetry successfully persisted",
    ["zone_id", "event_type"]
)

invalid_payloads_total = Counter(
    "iot_api_invalid_payloads_total",
    "Invalid or rejected payloads",
    ["event_type", "reason"]
)

telemetry_end_to_end_seconds = Histogram(
    "iot_api_telemetry_end_to_end_seconds",
    "Time from message receipt to persistence completion",
    ["zone_id"]
)

db_write_failures_total = Counter(
    "iot_api_db_write_failures_total",
    "Database write failures",
    ["operation"]
)

latest_telemetry_age_seconds = Gauge(
    "iot_latest_telemetry_age_seconds",
    "Age of the latest telemetry by zone",
    ["zone_id"]
)

fleet_devices_total = Gauge(
    "iot_fleet_devices_total",
    "Device counts by status",
    ["status"]
)

zone_anomalies_total = Gauge(
    "iot_zone_anomalies_total",
    "Active anomaly count by zone and severity",
    ["zone_id", "severity"]
)