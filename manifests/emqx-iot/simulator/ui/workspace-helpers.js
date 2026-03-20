export function severityClass(severity) {
  if (severity === "critical") return "critical";
  if (severity === "warning") return "warning";
  return "normal";
}

export function edgeSeverityClass(status) {
  if (status === "offline") return "critical";
  if (status === "degraded" || status === "stale" || status === "unstable") return "warning";
  return "normal";
}

export function fmt(value, digits = 1, suffix = "") {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "--";
  return Number(value).toFixed(digits) + suffix;
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function average(values) {
  const usable = values.filter((value) => typeof value === "number" && !Number.isNaN(value));
  if (!usable.length) return 0;
  return usable.reduce((sum, value) => sum + value, 0) / usable.length;
}

export function selectedZone(state) {
  return state.zones.find((zone) => zone.id === state.selectedZoneId) || state.zones[0] || null;
}

export function isManagedZone(state, zoneId) {
  return state.managedZoneIds.includes(zoneId);
}

export function managedZones(state) {
  const zones = state.zones.filter((zone) => isManagedZone(state, zone.id));
  return zones.length ? zones : (selectedZone(state) ? [selectedZone(state)] : []);
}

export function managedAssets(state) {
  return managedZones(state).flatMap((zone) => zone.assets.map((asset) => ({
    ...asset,
    zoneId: zone.id,
    zoneName: zone.name,
    zoneSeverity: zone.severity,
    faultContext: zone.alerts[0] || "Nominal"
  })));
}

export function selectedScenarioLabel(state) {
  const scenarios = [...new Set(managedZones(state).map((zone) => zone.scenario).filter(Boolean))];
  if (!scenarios.length) return String(state.scenario || "baseline-day").replace(/-/g, " ");
  if (scenarios.length === 1) return scenarios[0].replace(/-/g, " ");
  return "mixed profiles";
}

export function selectedZoneLabel(state) {
  const zones = managedZones(state);
  if (zones.length <= 1) return zones[0]?.name || "--";
  return `${zones.length} zones`;
}

export function selectedEdgeDevice(state) {
  return state.edgeDevices.find((device) => device.id === state.selectedEdgeDeviceId) || state.edgeDevices[0] || null;
}

export function allSensors(state) {
  return state.edgeDevices.flatMap((device) => device.sensors.map((sensor) => ({
    ...sensor,
    deviceId: device.id,
    deviceName: device.name,
    deviceStatus: device.status,
    zoneId: device.zoneId,
    zoneName: device.zoneName,
    signalRssi: device.signalRssi,
    packetLossPct: device.packetLossPct,
    brokerLink: device.brokerLink,
    firmwareVersion: device.firmwareVersion
  })));
}

export function selectedSensor(state) {
  const sensors = allSensors(state);
  return sensors.find((sensor) => sensor.id === state.selectedSensorId) || sensors[0] || null;
}

export function historySlice(state, history) {
  if (state.graphRange === "short") return history.slice(-6);
  if (state.graphRange === "medium") return history.slice(-12);
  return history;
}

export function formatTimeLabel(ts) {
  if (!ts) return "--";
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function graphTimeLabels(history) {
  if (!history.length) return ["--", "--", "--"];
  const first = history[0];
  const middle = history[Math.floor((history.length - 1) / 2)];
  const last = history[history.length - 1];
  return [formatTimeLabel(first.ts), formatTimeLabel(middle.ts), formatTimeLabel(last.ts)];
}

export function calcZoneHealthScore(zone) {
  if (!zone) return 0;
  const tempPenalty = Math.min(Math.abs((zone.indoor.temperature ?? 24) - 24) * 7, 28);
  const humidityPenalty = Math.min(Math.abs((zone.indoor.humidity ?? 68) - 68) * 1.2, 16);
  const moisturePenalty = Math.min(Math.abs((zone.soil.moisture ?? 0.32) - 0.32) * 140, 18);
  const vpdPenalty = Math.min(Math.abs((zone.derived.vpd ?? 1.1) - 1.1) * 18, 18);
  const severityPenalty = zone.severity === "critical" ? 26 : zone.severity === "warning" ? 12 : 0;
  return Math.round(clamp(100 - tempPenalty - humidityPenalty - moisturePenalty - vpdPenalty - severityPenalty, 18, 100));
}

export function zoneDeviationSummary(zone) {
  if (!zone) return "Awaiting telemetry";
  const notes = [];
  const temperature = zone.indoor.temperature ?? 0;
  const humidity = zone.indoor.humidity ?? 0;
  const moisture = zone.soil.moisture ?? 0;
  const vpd = zone.derived.vpd ?? 0;

  if (temperature > 26.5) notes.push("air temperature running hot");
  else if (temperature < 22) notes.push("air temperature below recipe");

  if (humidity > 74) notes.push("humidity accumulation near canopy");
  else if (humidity < 60) notes.push("humidity below target band");

  if (moisture < 0.28) notes.push("root zone drying out");
  else if (moisture > 0.39) notes.push("root saturation risk rising");

  if (vpd > 1.45) notes.push("transpiration demand elevated");

  if (!notes.length) return "Within expected climate and root-zone envelope";
  return notes.slice(0, 2).join("; ");
}

export function assetLoadBand(load) {
  if (load >= 0.8) return "Saturated";
  if (load >= 0.55) return "Elevated";
  if (load >= 0.25) return "Nominal";
  return "Idle";
}

export function deriveProvenance(state) {
  if (state.provenance === "synthetic") return { label: "Synthetic mode", tone: "warning", description: "Using simulator fallback data because live services are unavailable." };
  if (state.provenance === "inferred") return { label: "Inferred topology", tone: "warning", description: "Gateway topology inferred from zone telemetry where live edge data is missing." };
  return { label: "Live telemetry", tone: "normal", description: "Facility, incident, and fleet state are flowing from live endpoints." };
}

export function focusPathLabel({ currentPage, zone, edgeDevice, sensor, asset }) {
  const base = ["Facility", zone?.name || "--"];
  if (currentPage === "edge-devices") return [...base, edgeDevice?.name || "Gateway"].join(" / ");
  if (currentPage === "sensors") return [...base, edgeDevice?.name || sensor?.deviceName || "Gateway", sensor?.name || "Sensor"].join(" / ");
  if (currentPage === "twin") return [...base, edgeDevice?.name || "Gateway", asset?.name || "Asset"].join(" / ");
  if (asset) return [...base, asset.name].join(" / ");
  return base.join(" / ");
}

export function surfaceClass(surface = "light") {
  return surface === "dark" ? "surface-dark" : "surface-light";
}

export function textToneClass(tone = "strong", inverse = false) {
  if (inverse) {
    if (tone === "muted") return "text-muted-inverse";
    if (tone === "soft") return "text-soft-inverse";
    return "text-strong-inverse";
  }

  if (tone === "muted") return "text-muted";
  if (tone === "soft") return "text-soft";
  return "text-strong";
}

export function textClasses({ surface = "light", tone = "strong" } = {}) {
  return `${surfaceClass(surface)} ${tone === "muted"
    ? "surface-text-muted"
    : tone === "soft"
      ? "surface-text-soft"
      : "surface-text-strong"}`;
}

export function surfaceTextToneClass(surface = "light", tone = "strong") {
  return textToneClass(tone, surface === "dark");
}
