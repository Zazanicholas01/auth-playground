# EMQX IoT Playground Metrics Spec

This document defines a practical monitoring catalog for the EMQX IoT playground stack.
It is intended to serve three purposes:

- standardize the metrics we expose from the API, simulator, and pipeline jobs
- define the category model used by the UI dropdown menu
- guide Grafana dashboard organization and future instrumentation work

## Scope

The current stack includes:

- `iot-api` FastAPI service
- `iot-simulator` runtime service
- `EMQX` MQTT broker
- `TimescaleDB` storage
- `VictoriaMetrics` scraping and query backend
- `Grafana` dashboards

Current scrape targets are the API and simulator metrics endpoints.

## UI Dropdown Categories

The UI should organize monitoring views under these top-level categories:

1. `Platform`
2. `Ingestion`
3. `Fleet`
4. `Storage`
5. `Scenarios`

### Category Intent

| Category | Purpose | Typical Questions |
|---|---|---|
| `Platform` | Core service and scrape health | Are the API and simulator up? Are requests healthy? Is MQTT connected? |
| `Ingestion` | Message intake and processing | Are messages arriving, being parsed, and reaching storage? |
| `Fleet` | Domain and device state | Are devices fresh, connected, degraded, or anomalous? |
| `Storage` | Persistence and aggregation health | Are writes, reads, and batch promotions succeeding within acceptable latency? |
| `Scenarios` | Simulator-driven workload state | Which scenario is active, how much traffic is being generated, and is it publishing cleanly? |

## Naming Convention

Use consistent prefixes by component:

- API metrics: `iot_api_*`
- Simulator metrics: `iot_simulator_*`
- Domain and fleet metrics: `iot_fleet_*`, `iot_zone_*`
- Pipeline metrics: `iot_pipeline_*`

General rules:

- prefer counters for totals
- prefer gauges for current state or freshness
- prefer histograms for latency and duration
- keep labels low-cardinality

## Label Policy

Recommended labels:

- `zone_id`
- `event_type`
- `result`
- `status`
- `scenario`
- `query_name`
- `severity`
- `operation`

Avoid by default:

- `device_id`
- raw MQTT topic values
- user/session identifiers
- unbounded error message strings
- raw request URLs with path parameters

## Metric Catalog

### Platform

| Metric | Type | Labels | Source | Description | Status |
|---|---|---|---|---|---|
| `http_requests_total` | Counter | `handler`, `method`, `status` | API | Total API requests | Existing via FastAPI instrumentation |
| `http_request_duration_seconds` | Histogram | `handler`, `method` | API | API request latency | Existing via FastAPI instrumentation |
| `http_requests_in_progress` | Gauge | `handler`, `method` | API | Active in-flight requests | Existing via FastAPI instrumentation |
| `up` | Gauge | `job`, `instance` | VictoriaMetrics | Whether scrape target is reachable | Existing from scraper |
| `iot_api_mqtt_connected` | Gauge | none | API | Whether API MQTT consumer is connected | Existing |
| `iot_api_mqtt_reconnects_total` | Counter | none | API | API MQTT reconnect attempts | Existing |
| `iot_simulator_mqtt_connected` | Gauge | none | Simulator | Whether simulator MQTT client is connected | Existing |
| `iot_simulator_mqtt_reconnects_total` | Counter | none | Simulator | Simulator MQTT reconnect attempts | Existing |
| `iot_platform_target_errors_total` | Counter | `target` | Scrape or adapter layer | Optional count of scrape or dependency failures | Proposed |

### Ingestion

| Metric | Type | Labels | Source | Description | Status |
|---|---|---|---|---|---|
| `iot_api_mqtt_messages_total` | Counter | `event_type` | API | MQTT messages successfully received for processing | Existing |
| `iot_api_mqtt_processing_failures_total` | Counter | `event_type` | API | MQTT messages that failed processing | Existing |
| `iot_api_mqtt_message_processing_seconds` | Histogram | `event_type` | API | Time spent parsing and handling inbound MQTT messages | Proposed |
| `iot_api_telemetry_ingested_total` | Counter | `zone_id`, `event_type` | API | Domain telemetry accepted into the ingest pipeline | Proposed |
| `iot_api_telemetry_persisted_total` | Counter | `zone_id`, `event_type` | API | Domain telemetry successfully written to storage | Proposed |
| `iot_api_invalid_payloads_total` | Counter | `event_type`, `reason` | API | Rejected or malformed payloads | Proposed |
| `iot_api_telemetry_end_to_end_seconds` | Histogram | `zone_id` | API | Time from message receipt to persistence completion | Proposed |
| `iot_api_ingest_backlog_total` | Gauge | `stage` | API or pipeline | Current number of queued or delayed ingest items if queueing is introduced | Future |

### Fleet

| Metric | Type | Labels | Source | Description | Status |
|---|---|---|---|---|---|
| `iot_fleet_devices_total` | Gauge | `status` | API/domain layer | Device counts by status such as `online`, `stale`, `offline` | Proposed |
| `iot_fleet_gateways_total` | Gauge | `status` | API/domain layer | Gateway counts by health state | Proposed |
| `iot_fleet_broker_link_total` | Gauge | `state` | API/domain layer | Gateway-to-broker link counts such as `linked`, `unstable`, `down` | Proposed |
| `iot_sensor_freshness_seconds` | Gauge | `zone_id` | API/domain layer | Freshness age of latest sensor update | Proposed |
| `iot_latest_telemetry_age_seconds` | Gauge | `zone_id` | API | Age of newest telemetry by zone | Proposed |
| `iot_zone_anomalies_total` | Gauge | `zone_id`, `severity` | API/domain layer | Active anomaly count by zone and severity | Proposed |
| `iot_actuator_command_total` | Counter | `zone_id`, `result` | API/domain layer | Actuator command attempts and outcome | Proposed |

### Storage

| Metric | Type | Labels | Source | Description | Status |
|---|---|---|---|---|---|
| `iot_api_db_write_seconds` | Histogram | none | API | Time spent writing telemetry and events to the database | Existing |
| `iot_api_db_write_failures_total` | Counter | `operation` | API | Database write failures | Proposed |
| `iot_api_db_query_seconds` | Histogram | `query_name` | API | Database query latency for read paths and aggregates | Proposed |
| `iot_api_db_query_failures_total` | Counter | `query_name` | API | Failed read or aggregate queries | Proposed |
| `iot_pipeline_bronze_to_silver_duration_seconds` | Histogram | none | Cron job | Duration of bronze-to-silver promotion job | Proposed |
| `iot_pipeline_bronze_to_silver_runs_total` | Counter | `result` | Cron job | Promotion job runs by result | Proposed |
| `iot_gold_refresh_lag_seconds` | Gauge | `aggregate` | API/domain layer | Age or lag of gold-layer aggregate freshness | Proposed |

### Scenarios

| Metric | Type | Labels | Source | Description | Status |
|---|---|---|---|---|---|
| `iot_simulator_publish_success_total` | Counter | none | Simulator | Successful MQTT publishes | Existing |
| `iot_simulator_publish_failure_total` | Counter | none | Simulator | Failed MQTT publishes | Existing |
| `iot_simulator_publish_seconds` | Histogram | `zone_id` | Simulator | Publish latency to broker | Proposed |
| `iot_simulator_tick` | Gauge | none | Simulator | Current simulation tick | Existing |
| `iot_simulator_active_scenario` | Gauge | `scenario` | Simulator | One-hot current scenario indicator | Proposed |
| `iot_simulator_messages_total` | Counter | `zone_id` | Simulator | Messages emitted by zone | Proposed |
| `iot_simulator_resets_total` | Counter | `scenario` | Simulator | Number of scenario resets | Proposed |

## UI Routing Model

The UI dropdown should map each category to a curated set of KPIs and drill-down charts.

| Category | Primary KPIs | Recommended Panels |
|---|---|---|
| `Platform` | request rate, error rate, API latency, MQTT connectivity, scrape health | service overview, target health, reconnect trends |
| `Ingestion` | received/sec, failures/sec, invalid payloads, end-to-end latency | ingest throughput, failure breakdown, latency histogram |
| `Fleet` | devices online/offline, freshness, anomalies, gateway health | fleet summary, zone freshness, anomaly map |
| `Storage` | DB write latency, DB failures, query latency, promotion job health | write path, read path, aggregate freshness |
| `Scenarios` | publish success/failure, active scenario, tick, per-zone synthetic load | scenario control, publish health, generated traffic |

## First Implementation Slice

The following metrics provide a strong first version with good coverage across all categories.

### Platform v1

- `http_requests_total`
- `http_request_duration_seconds`
- `up`
- `iot_api_mqtt_connected`

### Ingestion v1

- `iot_api_mqtt_messages_total`
- `iot_api_mqtt_processing_failures_total`
- `iot_api_mqtt_message_processing_seconds`
- `iot_api_telemetry_end_to_end_seconds`

### Fleet v1

- `iot_fleet_devices_total`
- `iot_latest_telemetry_age_seconds`
- `iot_zone_anomalies_total`

### Storage v1

- `iot_api_db_write_seconds`
- `iot_api_db_write_failures_total`
- `iot_pipeline_bronze_to_silver_runs_total`

### Scenarios v1

- `iot_simulator_publish_success_total`
- `iot_simulator_publish_failure_total`
- `iot_simulator_active_scenario`
- `iot_simulator_tick`

## Grafana Organization

Grafana should mirror the dropdown model with one dashboard section or dashboard per category:

- `Platform`
- `Ingestion`
- `Fleet`
- `Storage`
- `Scenarios`

This keeps the UI, dashboard navigation, and instrumentation model aligned.

## Future Extensions

The next likely expansions are:

- EMQX broker metrics as a dedicated scrape target
- PostgreSQL or Timescale exporter metrics
- Kubernetes pod health and restart metrics
- SLO panels derived from ingest freshness and end-to-end latency

These can be added without changing the category model defined above.
