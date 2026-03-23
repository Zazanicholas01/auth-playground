from datetime import datetime, timedelta, timezone
from math import cos, sin


SYNTHETIC_ZONE_IDS = [
    "greenhouse-a-north",
    "greenhouse-a-center",
    "greenhouse-a-south",
    "greenhouse-a-west",
    "greenhouse-a-east",
    "greenhouse-a-propagation",
]


SYNTHETIC_ZONE_META = {
    "greenhouse-a-north": {"name": "North Bay", "offset": 0, "severity": "normal"},
    "greenhouse-a-center": {"name": "Center Bay", "offset": 1, "severity": "warning"},
    "greenhouse-a-south": {"name": "South Bay", "offset": 2, "severity": "critical"},
    "greenhouse-a-west": {"name": "West Bay", "offset": 3, "severity": "normal"},
    "greenhouse-a-east": {"name": "East Bay", "offset": 4, "severity": "warning"},
    "greenhouse-a-propagation": {"name": "Propagation Bay", "offset": 5, "severity": "normal"},
}


class SyntheticService:
    def seed_zone_snapshot(self, zone_id: str) -> dict:
        meta = SYNTHETIC_ZONE_META.get(zone_id, SYNTHETIC_ZONE_META["greenhouse-a-north"])
        now = datetime.now(timezone.utc).isoformat()
        return {
            "deviceId": zone_id,
            "zoneId": zone_id,
            "name": meta["name"],
            "scenario": "baseline-day",
            "severity": meta["severity"],
            "online": True,
            "ts": now,
            "lastSeen": now,
            "outdoor": {},
            "indoor": {},
            "soil": {},
            "actuators": {},
            "derived": {},
            "alerts": [],
            "synthetic": True,
        }

    def materialize_devices(self, source_devices: dict) -> list[dict]:
        merged = dict(source_devices)
        for zone_id in SYNTHETIC_ZONE_IDS:
            if zone_id not in merged:
                merged[zone_id] = self.seed_zone_snapshot(zone_id)
        return sorted(merged.values(), key=lambda item: item.get("deviceId", ""))

    def synthetic_history_for(self, device_id: str) -> list[dict]:
        now = datetime.now(timezone.utc)
        history = []
        for idx in range(18):
            ts = now - timedelta(minutes=(17 - idx) * 5)
            history.append(
                {
                    "ts": ts.isoformat(),
                    "scenario": "baseline-day",
                    "severity": "normal",
                    "temperature": 22 + sin(idx / 4),
                    "humidity": 65 + cos(idx / 5) * 2,
                    "co2": 600 + sin(idx / 3) * 40,
                    "soilMoisture": 0.31 + cos(idx / 6) * 0.01,
                    "deviceId": device_id,
                }
            )
        return history
