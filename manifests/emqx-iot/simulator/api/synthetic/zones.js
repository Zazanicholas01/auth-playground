const syntheticZoneIds = [
  "greenhouse-a-north",
  "greenhouse-a-center",
  "greenhouse-a-south",
  "greenhouse-a-west",
  "greenhouse-a-east",
  "greenhouse-a-propagation",
];

const syntheticZoneMeta = {
  "greenhouse-a-north": { name: "North Bay", offset: 0, severity: "normal" },
  "greenhouse-a-center": { name: "Center Bay", offset: 1, severity: "warning" },
  "greenhouse-a-south": { name: "South Bay", offset: 2, severity: "critical" },
  "greenhouse-a-west": { name: "West Bay", offset: 3, severity: "normal" },
  "greenhouse-a-east": { name: "East Bay", offset: 4, severity: "warning" },
  "greenhouse-a-propagation": { name: "Propagation Bay", offset: 5, severity: "normal" },
};

export function createSyntheticService() {
  function seedZoneSnapshot(zoneId) {
    const meta = syntheticZoneMeta[zoneId] || syntheticZoneMeta["greenhouse-a-north"];
    const now = new Date().toISOString();

    return {
      deviceId: zoneId,
      zoneId,
      scenario: "baseline-day",
      severity: meta.severity,
      online: true,
      ts: now,
      lastSeen: now,
      outdoor: {},
      indoor: {},
      soil: {},
      actuators: {},
      derived: {},
      alerts: [],
      synthetic: true,
    };
  }

  function materializeDevices(sourceDevices) {
    const merged = new Map(sourceDevices);

    for (const zoneId of syntheticZoneIds) {
      if (!merged.has(zoneId)) {
        merged.set(zoneId, seedZoneSnapshot(zoneId));
      }
    }

    return [...merged.values()].sort((a, b) => a.deviceId.localeCompare(b.deviceId));
  }

  function syntheticHistoryFor(deviceId) {
    return Array.from({ length: 18 }, (_, idx) => ({
      ts: new Date(Date.now() - (17 - idx) * 5 * 60_000).toISOString(),
      scenario: "baseline-day",
      severity: "normal",
      temperature: 22 + Math.sin(idx / 4),
      humidity: 65 + Math.cos(idx / 5) * 2,
      co2: 600 + Math.sin(idx / 3) * 40,
      soilMoisture: 0.31 + Math.cos(idx / 6) * 0.01,
      deviceId,
    }));
  }

  return {
    materializeDevices,
    syntheticHistoryFor,
  };
}
