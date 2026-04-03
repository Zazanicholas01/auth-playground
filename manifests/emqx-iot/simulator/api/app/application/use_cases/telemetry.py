# app/application/use_cases/telemetry.py
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
import json

from app.domain.ports import TelemetryRepository, SyntheticGateway
from app.infrastructure.metrics import (
    fleet_devices_total,
    latest_telemetry_age_seconds,
    telemetry_end_to_end_seconds,
    zone_anomalies_total,
)

@dataclass(slots=True)
class TelemetryConfig:
    event_history_size: int


@dataclass(slots=True)
class TelemetryState:
    devices: dict[str, dict]
    events: list[dict]


def avg(values: list[object]) -> float | None:
    valid = [v for v in values if isinstance(v, (int, float))]
    return sum(valid) / len(valid) if valid else None


def parse_ts(value: str | None) -> datetime:
    if not value:
        return datetime.now(timezone.utc)
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def normalize_telemetry(message: dict, topic: str) -> dict:
    parts = topic.split("/")
    device_id = message.get("deviceId") or message.get("zoneId") or parts[-2]
    return {
        "deviceId": device_id,
        "zoneId": message.get("zoneId") or device_id,
        "scenario": message.get("scenario", "unknown"),
        "severity": message.get("severity", "normal"),
        "online": message.get("online", True),
        "ts": parse_ts(message.get("ts")),
        "outdoor": message.get("outdoor", {}),
        "indoor": message.get("indoor", {}),
        "soil": message.get("soil", {}),
        "actuators": message.get("actuators", {}),
        "derived": message.get("derived", {}),
        "alerts": message.get("alerts", []),
    }


class TelemetryUseCase:
    def __init__(
        self,
        repo: TelemetryRepository,
        synthetic: SyntheticGateway,
        state: TelemetryState,
        config: TelemetryConfig,
    ) -> None:
        self._repo = repo
        self._synthetic = synthetic
        self._state = state
        self._config = config

    async def warm_cache(self) -> None:
        self._state.devices = await self._repo.load_device_states()
        self._state.events = await self._repo.recent_events(self._config.event_history_size)

    async def process_message(self, topic: str, payload: bytes) -> None:
        message = json.loads(payload.decode("utf-8"))
        event_type = topic.split("/")[-1]
        received_at = datetime.now(timezone.utc)

        event = {
            "topic": topic,
            "type": event_type,
            "receivedAt": received_at,
            "payload": message,
        }

        if event_type == "telemetry":
            normalized = normalize_telemetry(message, topic)
            zone_id = str(normalized.get("zoneId", "Unknown"))

            device = {
                **self._state.devices.get(normalized["deviceId"], {}),
                **normalized,
                "lastTopic": topic,
                "lastSeen": received_at,
            }
            self._state.devices[normalized["deviceId"]] = device

            await self._repo.persist_bronze_telemetry(topic, normalized)
            await self._repo.upsert_device_state(device)

            telemetry_end_to_end_seconds.labels(zone_id=zone_id).observe(
                (datetime.now(timezone.utc) - received_at).total_seconds()
            )

        elif event_type == "status":
            device_id = message.get("deviceId") or message.get("zoneId") or topic.split("/")[-2]
            device = {
                **self._state.devices.get(device_id, {}),
                **message,
                "deviceId": device_id,
                "zoneId": message.get("zoneId") or device_id,
                "lastTopic": topic,
                "lastSeen": received_at,
            }
            self._state.devices[device_id] = device
            await self._repo.upsert_device_state(device)

        self._update_fleet_metrics()
        self._update_zone_metrics()

        self._state.events.insert(0, event)
        self._state.events = self._state.events[: self._config.event_history_size]
        await self._repo.persist_bronze_event(event)


    async def list_devices(self):
        devices = await self._repo.load_device_states()
        return self._synthetic.materialize_devices(devices)


    async def list_events(self):
        return await self._repo.recent_events(self._config.event_history_size)


    async def get_zone(self, device_id: str):
        devices = await self._repo.load_device_states()
        all_devices = self._synthetic.materialize_devices(devices)
        return next((item for item in all_devices if item.get("deviceId") == device_id), None)


    async def list_alerts(self):
        return await self._repo.load_recent_alerts(100)


    async def get_summary(self):
        devices = await self.list_devices()
        return {
            "zones": len(devices),
            "online": sum(1 for d in devices if d.get("online") is not False),
            "warning": sum(1 for d in devices if d.get("severity") == "warning"),
            "critical": sum(1 for d in devices if d.get("severity") == "critical"),
            "avgTemperature": avg([d.get("indoor", {}).get("temperature") for d in devices]),
            "avgHumidity": avg([d.get("indoor", {}).get("humidity") for d in devices]),
            "avgCo2": avg([d.get("indoor", {}).get("co2") for d in devices]),
            "avgSoilMoisture": avg([d.get("soil", {}).get("moisture") for d in devices]),
            "avgVpd": avg([d.get("derived", {}).get("vpd") for d in devices]),
        }


    async def get_gold_fleet_summary(self):
        return await self._repo.load_gold_fleet_summary()


    async def get_gold_zone_health(self):
        return await self._repo.load_gold_zone_health()


    async def get_gold_alert_counts(self, limit: int):
        return await self._repo.load_gold_alert_counts(limit)


    async def get_gold_zone_metrics(self, limit: int):
        return await self._repo.load_gold_zone_metrics(limit)


    def _update_fleet_metrics(self) -> None:
        devices = list(self._state.devices.values())

        online = sum(1 for d in devices if d.get("online") is not False)
        offline = sum(1 for d in devices if d.get("online") is False)
        stale = sum(
            1 for d in devices if isinstance(d.get("lastSeen"), datetime)
            and (datetime.now(timezone.utc) - d["lastSeen"]).total_seconds() > 60
        )

        fleet_devices_total.labels(status="online").set(online)
        fleet_devices_total.labels(status="offline").set(offline)
        fleet_devices_total.labels(status="stale").set(stale)
    

    def _update_zone_metrics(self) -> None:
        now = datetime.now(timezone.utc)

        zone_latest = {}
        zone_anomaly_counts = {}

        for device in self._state.devices.values():
            zone_id = str(device.get("zoneId") or device.get("deviceId") or "Unknown")
            severity = str(device.get("severity", "normal"))

            last_seen = device.get("lastSeen")
            if isinstance(last_seen, datetime):
                age = max(0.0, (now - last_seen).total_seconds())
                current = zone_latest.get(zone_id)
                if current is None or age < current:
                    zone_latest[zone_id] = age
            
            if severity in {"warning", "critical"}:
                key = (zone_id, severity)
                zone_anomaly_counts[key] = zone_anomaly_counts.get(key, 0) + 1
        
        for zone_id, age in zone_latest.items():
            latest_telemetry_age_seconds.labels(zone_id=zone_id).set(age)
        
        seen_pairs = set(zone_anomaly_counts)
        for (zone_id, severity), count in zone_anomaly_counts.items():
            zone_anomalies_total.labels(zone_id=zone_id, severity=severity).set(count)
        
        known_zones = {
            str(device.get("zoneId") or device.get("deviceId") or "Unknown")
            for device in self._state.devices.values()
        }

        for zone_id in known_zones:
            for severity in ("warning", "critical"):
                if (zone_id, severity) not in seen_pairs:
                    zone_anomalies_total.labels(zone_id=zone_id, severity=severity).set(0)