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