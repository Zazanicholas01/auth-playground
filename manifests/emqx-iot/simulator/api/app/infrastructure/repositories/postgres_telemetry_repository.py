from __future__ import annotations

import json
from datetime import date, datetime

from app.db import db


def decode_json(value):
    if isinstance(value, str):
        return json.loads(value)
    return value


def json_safe(value):
    if isinstance(value, dict):
        return {k: json_safe(v) for k, v in value.items()}
    if isinstance(value, list):
        return [json_safe(v) for v in value]
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return value


class PostgresTelemetryRepository:
    async def persist_bronze_event(self, event: dict) -> None:
        payload = event.get("payload", {})
        await db.execute(
            """
            INSERT INTO bronze.events_raw (
                source_topic, event_type, device_id, zone_id, event_ts, payload
            ) VALUES ($1, $2, $3, $4, $5, $6::jsonb)
            """,
            event["topic"],
            event["type"],
            payload.get("deviceId") or payload.get("zoneId"),
            payload.get("zoneId") or payload.get("deviceId"),
            event["receivedAt"],
            json.dumps(json_safe(payload)),
        )

    async def persist_bronze_telemetry(self, topic: str, normalized: dict) -> None:
        await db.execute(
            """
            INSERT INTO bronze.telemetry_raw (
                source_topic, message_type, device_id, zone_id, event_ts, payload
            ) VALUES ($1, $2, $3, $4, $5, $6::jsonb)
            """,
            topic,
            "telemetry",
            normalized["deviceId"],
            normalized["zoneId"],
            normalized["ts"],
            json.dumps(json_safe(normalized)),
        )

    async def upsert_device_state(self, device: dict) -> None:
        await db.execute(
            """
            INSERT INTO silver.device_state_latest (
                device_id, zone_id, last_topic, last_seen, state
            )
            VALUES ($1, $2, $3, $4, $5::jsonb)
            ON CONFLICT (device_id) DO UPDATE SET
                zone_id = EXCLUDED.zone_id,
                last_topic = EXCLUDED.last_topic,
                last_seen = EXCLUDED.last_seen,
                state = EXCLUDED.state
            """,
            device["deviceId"],
            device["zoneId"],
            device.get("lastTopic"),
            device["lastSeen"],
            json.dumps(json_safe(device)),
        )

    async def load_device_states(self) -> dict[str, dict]:
        rows = await db.fetch(
            """
            SELECT device_id, state
            FROM silver.device_state_latest
            ORDER BY last_seen DESC
            """
        )
        return {
            row["device_id"]: decode_json(row["state"])
            for row in rows
        }

    async def recent_events(self, limit: int) -> list[dict]:
        rows = await db.fetch(
            """
            SELECT source_topic AS topic, event_type AS type, event_ts AS "receivedAt", payload
            FROM bronze.events_raw
            ORDER BY event_ts DESC, ingest_id DESC
            LIMIT $1
            """,
            limit,
        )
        return [
            {
                **dict(row),
                "payload": decode_json(row["payload"]),
            }
            for row in rows
        ]

    async def telemetry_history(self, device_id: str, limit: int) -> list[dict]:
        rows = await db.fetch(
            """
            SELECT
                ts,
                scenario,
                severity,
                temperature,
                humidity,
                co2,
                par,
                pressure,
                dew_point AS "dewPoint",
                vpd,
                soil_moisture AS "soilMoisture",
                soil_temperature AS "soilTemperature",
                tank_level AS "tankLevel",
                irrigation_flow AS "irrigationFlow"
            FROM silver.telemetry
            WHERE device_id = $1
            ORDER BY ts DESC
            LIMIT $2
            """,
            device_id,
            limit,
        )
        return [dict(row) for row in reversed(rows)]

    async def load_recent_alerts(self, limit: int) -> list[dict]:
        rows = await db.fetch(
            """
            SELECT source_topic AS topic, 'alerts' AS type, event_ts AS "receivedAt", payload
            FROM silver.alerts
            ORDER BY event_ts DESC
            LIMIT $1
            """,
            limit,
        )
        return [
            {
                **dict(row),
                "payload": decode_json(row["payload"]),
            }
            for row in rows
        ]

    async def load_gold_fleet_summary(self) -> dict | None:
        row = await db.fetchrow("SELECT * FROM gold.fleet_summary_latest")
        return dict(row) if row else None

    async def load_gold_zone_health(self) -> list[dict]:
        rows = await db.fetch(
            """
            SELECT * FROM gold.zone_health_latest
            ORDER BY zone_id ASC
            """
        )
        return [dict(row) for row in rows]

    async def load_gold_alert_counts(self, limit: int) -> list[dict]:
        rows = await db.fetch(
            """
            SELECT bucket, zone_id, severity, alert_count
            FROM gold.alert_counts_1h
            ORDER BY bucket DESC, zone_id ASC, severity ASC
            LIMIT $1
            """,
            limit,
        )
        return [dict(row) for row in rows]

    async def load_gold_zone_metrics(self, limit: int) -> list[dict]:
        rows = await db.fetch(
            """
            SELECT
                bucket,
                zone_id,
                avg_temperature,
                min_temperature,
                max_temperature,
                avg_humidity,
                avg_co2,
                avg_vpd,
                avg_soil_moisture,
                avg_irrigation_flow,
                sample_count
            FROM gold.zone_metrics_5m
            ORDER BY bucket DESC, zone_id ASC
            LIMIT $1
            """,
            limit,
        )
        return [dict(row) for row in rows]
