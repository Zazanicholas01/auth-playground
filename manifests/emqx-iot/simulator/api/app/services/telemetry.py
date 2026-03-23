from datetime import datetime, timezone
import json

from repositories.telemetry import TelemetryRepository
from settings import settings
from state import ApiState


def avg(values):
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

def to_iso(value):
    return value.isoformat() if isinstance(value, datetime) else value


class TelemetryService:
    def __init__(self, repo: TelemetryRepository, state: ApiState, synthetic):
        self.repo = repo
        self.state = state
        self.synthetic = synthetic

    async def warm_cache(self) -> None:
        self.state.devices = await self.repo.load_device_states()
        self.state.events = await self.repo.recent_events(settings.event_history_size)

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
            device = {
                **self.state.devices.get(normalized["deviceId"], {}),
                **normalized,
                "lastTopic": topic,
                "lastSeen": received_at,
            }
            self.state.devices[normalized["deviceId"]] = device
            await self.repo.persist_bronze_telemetry(topic, normalized)
            await self.repo.upsert_device_state(device)

        elif event_type == "status":
            device_id = message.get("deviceId") or message.get("zoneId") or topic.split("/")[-2]
            device = {
                **self.state.devices.get(device_id, {}),
                **message,
                "deviceId": device_id,
                "zoneId": message.get("zoneId") or device_id,
                "lastTopic": topic,
                "lastSeen": received_at,
            }
            self.state.devices[device_id] = device
            await self.repo.upsert_device_state(device)

        self.state.events.insert(0, event)
        self.state.events = self.state.events[: settings.event_history_size]
        await self.repo.persist_bronze_event(event)

    async def list_devices(self):
        devices = await self.repo.load_device_states()
        return self.synthetic.materialize_devices(devices)

    async def list_events(self):
        return await self.repo.recent_events(settings.event_history_size)

    async def get_history(self, device_id: str):
        rows = await self.repo.telemetry_history(device_id, settings.history_points)
        return rows if rows else self.synthetic.synthetic_history_for(device_id)

    async def get_zone(self, device_id: str):
        devices = await self.repo.load_device_states()
        all_devices = self.synthetic.materialize_devices(devices)
        return next((item for item in all_devices if item.get("deviceId") == device_id), None)

    async def list_alerts(self):
        return await self.repo.load_recent_alerts(100)

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
        return await self.repo.load_gold_fleet_summary()

    async def get_gold_zone_health(self):
        return await self.repo.load_gold_zone_health()

    async def get_gold_alert_counts(self, limit: int):
        return await self.repo.load_gold_alert_counts(limit)

    async def get_gold_zone_metrics(self, limit: int):
        return await self.repo.load_gold_zone_metrics(limit)
