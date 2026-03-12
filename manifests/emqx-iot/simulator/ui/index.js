const config = window.__IOT_CONFIG__ || {};
const apiBase = config.apiBase || (window.location.origin + "/api");
const simulatorBase = config.simulatorBase || (window.location.origin + "/simulator");
const currentPage = window.location.pathname === "/operations"
  ? "operations"
  : window.location.pathname === "/graphs"
    ? "graphs"
    : window.location.pathname === "/edge-devices"
      ? "edge-devices"
      : window.location.pathname === "/sensors"
        ? "sensors"
        : "twin";

let pendingZoneId = new URLSearchParams(window.location.search).get("zone");

document.body.dataset.page = currentPage;
document.querySelectorAll("[data-nav]").forEach((link) => {
  if (link.dataset.nav === currentPage) link.classList.add("active");
});

const zoneNames = {
  "greenhouse-a-north": "North Bay",
  "greenhouse-a-center": "Center Bay",
  "greenhouse-a-south": "South Bay",
  "greenhouse-a-west": "West Bay",
  "greenhouse-a-east": "East Bay",
  "greenhouse-a-propagation": "Propagation Bay",
  "greenhouse-a": "North Bay"
};

const zoneBase = [
  {
    id: "greenhouse-a-north",
    name: "North Bay",
    x: 90,
    y: 120,
    width: 245,
    height: 320,
    assets: [
      { id: "north-fans", name: "Supply fan bank", type: "air handling", x: 112, y: 135, width: 50, height: 24, metricLabel: "Airflow output", metricUnit: " %" },
      { id: "north-vent", name: "Roof vent array", type: "ventilation", x: 250, y: 112, width: 65, height: 14, metricLabel: "Vent position", metricUnit: " %" },
      { id: "north-heater", name: "Pipe heater loop", type: "thermal", x: 102, y: 388, width: 210, height: 14, metricLabel: "Heat demand", metricUnit: " %" },
      { id: "north-irrigation", name: "Irrigation manifold", type: "water", x: 140, y: 336, width: 140, height: 18, metricLabel: "Flow demand", metricUnit: " %" },
      { id: "north-mister", name: "Mist line", type: "humidification", metricLabel: "Mist duty", metricUnit: " %" },
      { id: "north-light", name: "Grow light rail", type: "lighting", metricLabel: "Lighting output", metricUnit: " %" },
      { id: "north-co2", name: "CO2 injector", type: "gas", metricLabel: "Injection duty", metricUnit: " %" }
    ]
  },
  {
    id: "greenhouse-a-center",
    name: "Center Bay",
    x: 363,
    y: 120,
    width: 245,
    height: 320,
    assets: [
      { id: "center-fans", name: "Circulation fans", type: "air handling", x: 390, y: 135, width: 54, height: 24, metricLabel: "Airflow output", metricUnit: " %" },
      { id: "center-vent", name: "Thermal ridge vent", type: "ventilation", x: 520, y: 112, width: 66, height: 14, metricLabel: "Vent position", metricUnit: " %" },
      { id: "center-heater", name: "Hydronic pipe loop", type: "thermal", x: 376, y: 388, width: 210, height: 14, metricLabel: "Heat demand", metricUnit: " %" },
      { id: "center-irrigation", name: "Root drip manifold", type: "water", x: 414, y: 336, width: 140, height: 18, metricLabel: "Flow demand", metricUnit: " %" },
      { id: "center-mister", name: "Fogging bar", type: "humidification", metricLabel: "Mist duty", metricUnit: " %" },
      { id: "center-light", name: "Supplemental light rack", type: "lighting", metricLabel: "Lighting output", metricUnit: " %" },
      { id: "center-co2", name: "CO2 injector", type: "gas", metricLabel: "Injection duty", metricUnit: " %" }
    ]
  },
  {
    id: "greenhouse-a-south",
    name: "South Bay",
    x: 636,
    y: 120,
    width: 245,
    height: 320,
    assets: [
      { id: "south-fans", name: "Exhaust fan bank", type: "air handling", x: 664, y: 135, width: 52, height: 24, metricLabel: "Airflow output", metricUnit: " %" },
      { id: "south-vent", name: "South ridge vent", type: "ventilation", x: 794, y: 112, width: 64, height: 14, metricLabel: "Vent position", metricUnit: " %" },
      { id: "south-heater", name: "Perimeter heat loop", type: "thermal", x: 648, y: 388, width: 212, height: 14, metricLabel: "Heat demand", metricUnit: " %" },
      { id: "south-irrigation", name: "Nutrient dosing bar", type: "water", x: 687, y: 336, width: 142, height: 18, metricLabel: "Flow demand", metricUnit: " %" },
      { id: "south-mister", name: "Humidity curtain", type: "humidification", metricLabel: "Mist duty", metricUnit: " %" },
      { id: "south-light", name: "Canopy light rail", type: "lighting", metricLabel: "Lighting output", metricUnit: " %" },
      { id: "south-co2", name: "CO2 injector", type: "gas", metricLabel: "Injection duty", metricUnit: " %" }
    ]
  },
  {
    id: "greenhouse-a-west",
    name: "West Bay",
    x: 120,
    y: 454,
    width: 220,
    height: 116,
    assets: [
      { id: "west-fans", name: "Crossflow fan bank", type: "air handling", metricLabel: "Airflow output", metricUnit: " %" },
      { id: "west-vent", name: "Side vent curtain", type: "ventilation", metricLabel: "Vent position", metricUnit: " %" },
      { id: "west-heater", name: "Bench heat loop", type: "thermal", metricLabel: "Heat demand", metricUnit: " %" },
      { id: "west-irrigation", name: "Irrigation rail", type: "water", metricLabel: "Flow demand", metricUnit: " %" },
      { id: "west-mister", name: "Cooling mist line", type: "humidification", metricLabel: "Mist duty", metricUnit: " %" },
      { id: "west-light", name: "Photoperiod rail", type: "lighting", metricLabel: "Lighting output", metricUnit: " %" },
      { id: "west-co2", name: "CO2 injector", type: "gas", metricLabel: "Injection duty", metricUnit: " %" }
    ]
  },
  {
    id: "greenhouse-a-east",
    name: "East Bay",
    x: 392,
    y: 454,
    width: 220,
    height: 116,
    assets: [
      { id: "east-fans", name: "Recirculation fan bank", type: "air handling", metricLabel: "Airflow output", metricUnit: " %" },
      { id: "east-vent", name: "Ridge vent segment", type: "ventilation", metricLabel: "Vent position", metricUnit: " %" },
      { id: "east-heater", name: "Hydronic bench loop", type: "thermal", metricLabel: "Heat demand", metricUnit: " %" },
      { id: "east-irrigation", name: "Drip manifold", type: "water", metricLabel: "Flow demand", metricUnit: " %" },
      { id: "east-mister", name: "Fogging rail", type: "humidification", metricLabel: "Mist duty", metricUnit: " %" },
      { id: "east-light", name: "Canopy light rack", type: "lighting", metricLabel: "Lighting output", metricUnit: " %" },
      { id: "east-co2", name: "CO2 injector", type: "gas", metricLabel: "Injection duty", metricUnit: " %" }
    ]
  },
  {
    id: "greenhouse-a-propagation",
    name: "Propagation Bay",
    x: 664,
    y: 454,
    width: 220,
    height: 116,
    assets: [
      { id: "prop-fans", name: "Low-velocity fans", type: "air handling", metricLabel: "Airflow output", metricUnit: " %" },
      { id: "prop-vent", name: "Nursery vent curtain", type: "ventilation", metricLabel: "Vent position", metricUnit: " %" },
      { id: "prop-heater", name: "Root-zone heat mat loop", type: "thermal", metricLabel: "Heat demand", metricUnit: " %" },
      { id: "prop-irrigation", name: "Misting manifold", type: "water", metricLabel: "Flow demand", metricUnit: " %" },
      { id: "prop-mister", name: "Propagation fogger", type: "humidification", metricLabel: "Mist duty", metricUnit: " %" },
      { id: "prop-light", name: "Nursery light bar", type: "lighting", metricLabel: "Lighting output", metricUnit: " %" },
      { id: "prop-co2", name: "CO2 injector", type: "gas", metricLabel: "Injection duty", metricUnit: " %" }
    ]
  }
];

const state = {
  summary: null,
  zones: [],
  alerts: [],
  history: [],
  edgeDevices: [],
  edgeAlerts: [],
  selectedEdgeDeviceId: null,
  selectedSensorId: null,
  edgeFilter: "all",
  scenario: "baseline-day",
  graphRange: "medium",
  graphMetricGroup: "all",
  graphComparisonMode: "managed",
  selectedZoneId: "greenhouse-a-north",
  managedZoneIds: ["greenhouse-a-north"],
  selectedAssetId: "north-fans"
};

function slotEls(name) {
  return [...document.querySelectorAll(`[data-slot="${name}"]`)];
}

function setSlotHTML(name, html) {
  slotEls(name).forEach((element) => {
    element.innerHTML = html;
  });
}

async function loadHistoryForZone(zoneId) {
  const history = await fetch(apiBase + "/history/" + zoneId).then((response) => response.json()).catch(() => []);
  state.history = history.map((point) => ({
    ts: point.ts ?? point.timestamp ?? point.time ?? null,
    temperature: point.temperature ?? 0,
    humidity: point.humidity ?? 0,
    co2: point.co2 ?? 0,
    soilMoisture: point.soilMoisture ?? 0,
    irrigationFlow: point.irrigationFlow ?? 0,
    vpd: point.vpd ?? 0
  }));
}

async function selectZone(zoneId, { updateHistory = true } = {}) {
  await focusZone(zoneId, { ensureManaged: true, updateHistory });
}

const brokerPillEl = document.getElementById("broker-pill");
const scenarioLabelEl = document.getElementById("scenario-label");
const selectedZoneLabelEl = document.getElementById("selected-zone-label");
const selectedAssetHeadingEl = document.getElementById("selected-asset-heading");
const selectedAssetLabelEl = document.getElementById("selected-asset-label");
const sceneStatusEl = document.getElementById("scene-status");
const opsStatusEl = document.getElementById("ops-status");
const graphsStatusEl = document.getElementById("graphs-status");
const schematicEl = document.getElementById("schematic");
const sceneBadgesEl = document.getElementById("scene-badges");
const graphGridEl = document.getElementById("graph-grid");
const graphRangeToggleEl = document.getElementById("graph-range-toggle");
const graphMetricToggleEl = document.getElementById("graph-metric-toggle");
const graphCompareToggleEl = document.getElementById("graph-compare-toggle");
const greenhousePhotoUrl = "/dev-assets/greenhouse-twin.png";

const edgeFleetSummaryEl = document.getElementById("edge-fleet-summary");
const edgeDeviceListEl = document.getElementById("edge-device-list");
const edgeSummaryEl = document.getElementById("edge-summary");
const edgeSensorDetailEl = document.getElementById("edge-sensor-detail");
const edgeAlertListEl = document.getElementById("edge-alert-list");
const sensorFleetSummaryEl = document.getElementById("sensor-fleet-summary");
const sensorListEl = document.getElementById("sensor-list");
const sensorSummaryEl = document.getElementById("sensor-summary");
const sensorDetailEl = document.getElementById("sensor-detail");
const sensorAlertListEl = document.getElementById("sensor-alert-list");

function severityClass(severity) {
  if (severity === "critical") return "critical";
  if (severity === "warning") return "warning";
  return "normal";
}

function edgeSeverityClass(status) {
  if (status === "offline") return "critical";
  if (status === "degraded" || status === "stale") return "warning";
  return "normal";
}

function selectedEdgeDevice() {
  return state.edgeDevices.find((device) => device.id === state.selectedEdgeDeviceId) || state.edgeDevices[0] || null;
}
function allSensors() {
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

function selectedSensor() {
  return allSensors().find((sensor) => sensor.id === state.selectedSensorId) || allSensors()[0] || null;
}


function loadEdgeFallback(tick) {
  state.edgeDevices = createFallbackEdgeDevices(tick);
  state.edgeAlerts = state.edgeDevices.flatMap((device) => {
    if (device.status === "healthy") return [];
    return [{
      receivedAt: new Date().toISOString(),
      payload: {
        severity: device.status === "offline" ? "critical" : "warning",
        message: device.status === "offline"
          ? `${device.name} heartbeat lost`
          : `${device.name} sensor freshness degraded`,
        edgeDeviceId: device.id,
        zoneId: device.zoneId
      }
    }];
  });

  if (!state.selectedEdgeDeviceId || !state.edgeDevices.find((device) => device.id === state.selectedEdgeDeviceId)) {
    state.selectedEdgeDeviceId = state.edgeDevices[0]?.id || null;
  }
  const sensors = allSensors();
  if (!state.selectedSensorId || !sensors.find((sensor) => sensor.id === state.selectedSensorId)) {
    state.selectedSensorId = sensors[0]?.id || null;
  }
}


function fmt(value, digits = 1, suffix = "") {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "--";
  return Number(value).toFixed(digits) + suffix;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function assetLoadForType(type, actuators = {}) {
  if (type === "air handling") return actuators.fan ?? 0;
  if (type === "ventilation") return actuators.vent ?? 0;
  if (type === "thermal") return actuators.heater ?? 0;
  if (type === "water") return actuators.irrigation ?? 0;
  if (type === "humidification") return actuators.mister ?? 0;
  if (type === "lighting") return actuators.growLight ?? 0;
  if (type === "gas") return clamp((actuators.vent ?? 0) * 0.28 + (actuators.fan ?? 0) * 0.12, 0, 1);
  return 0;
}

function isManagedZone(zoneId) {
  return state.managedZoneIds.includes(zoneId);
}

function managedZones() {
  const zones = state.zones.filter((zone) => isManagedZone(zone.id));
  return zones.length ? zones : (selectedZone() ? [selectedZone()] : []);
}

function managedAssets() {
  return managedZones().flatMap((zone) => zone.assets.map((asset) => ({
    ...asset,
    zoneId: zone.id,
    zoneName: zone.name,
    zoneSeverity: zone.severity,
    faultContext: zone.alerts[0] || "Nominal"
  })));
}

function selectedScenarioLabel() {
  const scenarios = [...new Set(managedZones().map((zone) => zone.scenario).filter(Boolean))];
  if (!scenarios.length) return state.scenario.replace(/-/g, " ");
  if (scenarios.length === 1) return scenarios[0].replace(/-/g, " ");
  return "Mixed profiles";
}

function selectedZoneLabel() {
  const zones = managedZones();
  if (zones.length <= 1) return zones[0]?.name || "--";
  return `${zones.length} zones`;
}

function syncManagedState() {
  const zoneIds = new Set(state.zones.map((zone) => zone.id));
  state.managedZoneIds = state.managedZoneIds.filter((zoneId) => zoneIds.has(zoneId));
  if (!state.managedZoneIds.length && state.zones[0]) {
    state.managedZoneIds = [state.zones[0].id];
  }
  if (!zoneIds.has(state.selectedZoneId)) {
    state.selectedZoneId = state.managedZoneIds[0] || state.zones[0]?.id || state.selectedZoneId;
  }
  if (state.selectedZoneId && !isManagedZone(state.selectedZoneId)) {
    state.managedZoneIds = [...state.managedZoneIds, state.selectedZoneId];
  }
}

async function focusZone(zoneId, { ensureManaged = true, updateHistory = true } = {}) {
  state.selectedZoneId = zoneId;
  if (ensureManaged && !isManagedZone(zoneId)) {
    state.managedZoneIds = [...state.managedZoneIds, zoneId];
  }
  syncManagedState();
  const zone = selectedZone();
  if (zone && !managedAssets().find((asset) => asset.id === state.selectedAssetId)) {
    state.selectedAssetId = zone.assets[0]?.id || state.selectedAssetId;
  }
  if (updateHistory && zone?.id) {
    await loadHistoryForZone(zone.id);
  }
  render();
}

async function toggleManagedZone(zoneId, { updateHistory = true } = {}) {
  const currentlyManaged = isManagedZone(zoneId);
  if (currentlyManaged && state.selectedZoneId !== zoneId) {
    state.selectedZoneId = zoneId;
  } else if (currentlyManaged && state.managedZoneIds.length > 1) {
    state.managedZoneIds = state.managedZoneIds.filter((id) => id !== zoneId);
    if (state.selectedZoneId === zoneId) {
      state.selectedZoneId = state.managedZoneIds[0];
    }
  } else if (!currentlyManaged) {
    state.managedZoneIds = [...state.managedZoneIds, zoneId];
    state.selectedZoneId = zoneId;
  } else {
    state.selectedZoneId = zoneId;
  }

  syncManagedState();
  const zone = selectedZone();
  if (zone && !managedAssets().find((asset) => asset.id === state.selectedAssetId)) {
    state.selectedAssetId = zone.assets[0]?.id || state.selectedAssetId;
  }
  if (updateHistory && zone?.id) {
    await loadHistoryForZone(zone.id);
  }
  render();
}

function assetTypeIcon(type) {
  const common = 'viewBox="0 0 48 48" aria-hidden="true"';
  if (type === "air handling") {
    return `<svg class="asset-icon-svg" ${common}><circle cx="24" cy="24" r="16" fill="rgba(38,149,83,0.14)" stroke="currentColor" stroke-width="2"/><circle cx="24" cy="24" r="4" fill="currentColor"/><path d="M24 10c5 0 9 4 9 9-5 1-9-2-9-7v-2Z" fill="currentColor"/><path d="M36 24c0 5-4 9-9 9-1-5 2-9 7-9h2Z" fill="currentColor"/><path d="M24 38c-5 0-9-4-9-9 5-1 9 2 9 7v2Z" fill="currentColor"/><path d="M12 24c0-5 4-9 9-9 1 5-2 9-7 9h-2Z" fill="currentColor"/></svg>`;
  }
  if (type === "ventilation") {
    return `<svg class="asset-icon-svg" ${common}><rect x="8" y="12" width="32" height="24" rx="8" fill="rgba(38,149,83,0.14)" stroke="currentColor" stroke-width="2"/><path d="M14 24h11" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><path d="M21 18l7 6-7 6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M30 18h4M32 24h6M30 30h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
  }
  if (type === "thermal") {
    return `<svg class="asset-icon-svg" ${common}><rect x="18" y="10" width="12" height="20" rx="6" fill="rgba(38,149,83,0.14)" stroke="currentColor" stroke-width="2"/><circle cx="24" cy="35" r="7" fill="rgba(38,149,83,0.14)" stroke="currentColor" stroke-width="2"/><path d="M24 16v14" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M32 14c3 2 4 5 3 8M16 14c-3 2-4 5-3 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
  }
  if (type === "water") {
    return `<svg class="asset-icon-svg" ${common}><path d="M24 10c6 8 10 13 10 18a10 10 0 1 1-20 0c0-5 4-10 10-18Z" fill="rgba(38,149,83,0.14)" stroke="currentColor" stroke-width="2"/><path d="M29 30c-1 3-3 4-6 4" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>`;
  }
  if (type === "humidification") {
    return `<svg class="asset-icon-svg" ${common}><circle cx="18" cy="18" r="4" fill="currentColor"/><circle cx="28" cy="14" r="3" fill="currentColor" opacity="0.85"/><circle cx="32" cy="24" r="5" fill="currentColor" opacity="0.7"/><path d="M10 34c3-4 7-6 14-6s11 2 14 6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><path d="M14 39h20" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>`;
  }
  if (type === "lighting") {
    return `<svg class="asset-icon-svg" ${common}><path d="M24 10c6 0 10 4 10 10 0 4-2 7-5 9-2 2-3 3-3 5h-4c0-2-1-3-3-5-3-2-5-5-5-9 0-6 4-10 10-10Z" fill="rgba(38,149,83,0.14)" stroke="currentColor" stroke-width="2"/><path d="M20 38h8M21 34h6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><path d="M24 15v6M18 21l3 2M30 21l-3 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
  }
  if (type === "gas") {
    return `<svg class="asset-icon-svg" ${common}><rect x="12" y="16" width="24" height="18" rx="9" fill="rgba(38,149,83,0.14)" stroke="currentColor" stroke-width="2"/><circle cx="20" cy="25" r="2.5" fill="currentColor"/><circle cx="28" cy="25" r="2.5" fill="currentColor"/><path d="M16 13c2-2 4-3 8-3s6 1 8 3" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>`;
  }
  return `<svg class="asset-icon-svg" ${common}><circle cx="24" cy="24" r="14" fill="rgba(38,149,83,0.14)" stroke="currentColor" stroke-width="2"/></svg>`;
}

function assetSelectionGraphic(asset, zone) {
  const ring = `${Math.round((asset.load ?? 0) * 100)}`;
  return `<svg class="asset-selection-graphic" viewBox="0 0 280 132" aria-hidden="true">
    <rect x="1" y="1" width="278" height="130" rx="18" fill="rgba(11,28,18,0.92)" stroke="rgba(121,255,187,0.14)" />
    <rect x="24" y="28" width="232" height="76" rx="18" fill="rgba(34,124,68,0.12)" stroke="rgba(121,255,187,0.24)" stroke-dasharray="5 5"/>
    <circle cx="66" cy="66" r="26" fill="rgba(23,202,119,0.18)" stroke="rgba(121,255,187,0.3)" stroke-width="2"/>
    <foreignObject x="42" y="42" width="48" height="48">${assetTypeIcon(asset.type)}</foreignObject>
    <g transform="translate(144 66)">
      <circle cx="0" cy="0" r="18" fill="none" stroke="rgba(121,255,187,0.12)" stroke-width="6"/>
      <circle cx="0" cy="0" r="18" fill="none" stroke="#1f8f3a" stroke-width="6" stroke-linecap="round" stroke-dasharray="${ring} 100" pathLength="100" transform="rotate(-90)"/>
      <text x="0" y="3.5" text-anchor="middle" fill="#effff5" font-size="11" font-weight="800">${ring}%</text>
    </g>
    <text x="240" y="45" text-anchor="end" fill="#b7e7ca" font-size="10" font-weight="700" letter-spacing="1.4">SELECTED</text>
    <text x="240" y="66" text-anchor="end" fill="#effff5" font-size="15" font-weight="800">${zone.name}</text>
    <text x="240" y="86" text-anchor="end" fill="#b7e7ca" font-size="11">${asset.metricLabel || "Control load"}</text>
  </svg>`;
}

function sensorMetricIcon(metricType, status) {
  const tone = status === "offline"
    ? "#cc5d51"
    : status === "stale" || status === "degraded"
      ? "#c98b1f"
      : "#84f1b2";
  const common = `viewBox="0 0 40 40" fill="none" stroke="${tone}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"`;

  if (metricType === "temperature") {
    return `<svg class="sensor-icon-svg" ${common}><rect x="16" y="7" width="8" height="18" rx="4"/><circle cx="20" cy="29" r="7"/><path d="M20 11v13"/></svg>`;
  }
  if (metricType === "humidity") {
    return `<svg class="sensor-icon-svg" ${common}><path d="M20 8c5 7 8 11 8 16a8 8 0 1 1-16 0c0-5 3-9 8-16Z"/><path d="M24 28c-1 2-2 3-4 3"/></svg>`;
  }
  if (metricType === "soil moisture") {
    return `<svg class="sensor-icon-svg" ${common}><path d="M20 7v9"/><path d="M15 14h10"/><path d="M13 20c3-3 6-4 7-4s4 1 7 4"/><path d="M12 25c4 5 7 7 8 7s4-2 8-7"/></svg>`;
  }
  if (metricType === "flow") {
    return `<svg class="sensor-icon-svg" ${common}><path d="M8 20h11"/><path d="M16 14l6 6-6 6"/><path d="M25 13h5"/><path d="M25 20h7"/><path d="M25 27h5"/></svg>`;
  }
  return `<svg class="sensor-icon-svg" ${common}><circle cx="20" cy="20" r="11"/><circle cx="20" cy="20" r="3" fill="${tone}" stroke="none"/></svg>`;
}

function renderEdgeTopology(device) {
  const count = Math.max(device.sensors.length, 1);
  const sensorNodes = device.sensors.map((sensor, index) => {
    const x = 186 + (index * (170 / Math.max(count - 1, 1)));
    const y = count === 1 ? 78 : 38 + (index % 2) * 80;
    const tone = sensor.status === "offline"
      ? "#cc5d51"
      : sensor.status === "stale" || sensor.status === "degraded"
        ? "#c98b1f"
        : "#84f1b2";
    return `
      <line x1="112" y1="78" x2="${x}" y2="${y}" stroke="${tone}" stroke-opacity="0.55" stroke-width="2.5" stroke-dasharray="${sensor.status === "offline" ? "5 5" : "none"}" />
      <circle cx="${x}" cy="${y}" r="16" fill="rgba(10, 26, 17, 0.95)" stroke="${tone}" stroke-width="2.5" />
      <foreignObject x="${x - 13}" y="${y - 13}" width="26" height="26">${sensorMetricIcon(sensor.metricType, sensor.status)}</foreignObject>
      <text x="${x}" y="${y + 30}" text-anchor="middle" fill="#b7e7ca" font-size="9.5" font-weight="700">${sensor.name}</text>
    `;
  }).join("");

  const gatewayTone = device.status === "offline"
    ? "#cc5d51"
    : device.status === "degraded"
      ? "#c98b1f"
      : "#84f1b2";

  return `
    <div class="edge-topology-card">
      <div class="edge-topology-copy">
        <div>
          <div class="section-label">Gateway Topology</div>
          <strong>${device.name}</strong>
        </div>
        <span class="pill ${edgeSeverityClass(device.status)}">${device.sensors.length} sensors</span>
      </div>
      <svg class="edge-topology-svg" viewBox="0 0 380 156" role="img" aria-label="Gateway connected to downstream sensors">
        <rect x="12" y="18" width="100" height="120" rx="18" fill="rgba(17, 41, 27, 0.98)" stroke="${gatewayTone}" stroke-width="2" />
        <rect x="32" y="42" width="60" height="44" rx="10" fill="rgba(121,255,187,0.08)" stroke="${gatewayTone}" stroke-width="2" />
        <path d="M44 98h36" stroke="${gatewayTone}" stroke-width="2.5" />
        <path d="M52 108h20" stroke="${gatewayTone}" stroke-width="2.5" />
        <circle cx="78" cy="50" r="3" fill="${gatewayTone}" />
        <text x="62" y="122" text-anchor="middle" fill="#effff5" font-size="11" font-weight="800">Gateway</text>
        <text x="62" y="134" text-anchor="middle" fill="#9edab8" font-size="9.5">${device.zoneName}</text>
        ${sensorNodes}
      </svg>
    </div>
  `;
}



function normalizeZone(zone, index = 0) {
  const base = zoneBase.find((item) => item.id === (zone.deviceId || zone.zoneId)) || zoneBase[index] || zoneBase[0];
  const indoor = zone.indoor || {};
  const soil = zone.soil || {};
  const actuators = zone.actuators || {};
  const derived = zone.derived || {};

  return {
    id: zone.deviceId || zone.zoneId || base.id,
    name: zoneNames[zone.zoneId] || zoneNames[zone.deviceId] || base.name,
    scenario: zone.scenario || state.scenario,
    severity: zone.severity || "normal",
    alerts: Array.isArray(zone.alerts) ? zone.alerts : [],
    outdoor: zone.outdoor || {},
    indoor,
    soil,
    actuators,
    derived,
    x: base.x,
    y: base.y,
    width: base.width,
    height: base.height,
    assets: base.assets.map((asset) => ({
      ...asset,
      load: assetLoadForType(asset.type, actuators)
    }))
  };
}

function createFallbackEdgeDevices(tick = 0) {
  const pulse = Math.sin(tick / 3);

  return [
    {
      id: "edge-north-1",
      name: "North Edge Gateway",
      zoneId: "greenhouse-a-north",
      zoneName: "North Bay",
      status: pulse > 0.55 ? "degraded" : "healthy",
      lastSeenMs: pulse > 0.55 ? 42000 : 4000,
      uptimeHours: 312,
      firmwareVersion: "1.8.2",
      brokerLink: pulse > 0.55 ? "unstable" : "linked",
      signalRssi: pulse > 0.55 ? -81 : -62,
      packetLossPct: pulse > 0.55 ? 4.2 : 0.3,
      sensors: [
        { id: "north-temp-1", name: "Canopy Temp", metricType: "temperature", status: "healthy", lastReading: "23.6 C", lastSeenMs: 3000, batteryPct: 91 },
        { id: "north-hum-1", name: "Humidity Probe", metricType: "humidity", status: "healthy", lastReading: "68 %", lastSeenMs: 5000, batteryPct: 88 },
        { id: "north-soil-1", name: "Soil Sensor", metricType: "soil moisture", status: pulse > 0.55 ? "stale" : "healthy", lastReading: "0.31", lastSeenMs: pulse > 0.55 ? 52000 : 4000, batteryPct: 54 }
      ]
    },
    {
      id: "edge-south-1",
      name: "South Edge Gateway",
      zoneId: "greenhouse-a-south",
      zoneName: "South Bay",
      status: "offline",
      lastSeenMs: 185000,
      uptimeHours: 17,
      firmwareVersion: "1.7.9",
      brokerLink: "down",
      signalRssi: -96,
      packetLossPct: 100,
      sensors: [
        { id: "south-temp-1", name: "Canopy Temp", metricType: "temperature", status: "offline", lastReading: "--", lastSeenMs: 185000, batteryPct: 0 },
        { id: "south-flow-1", name: "Irrigation Flow", metricType: "flow", status: "offline", lastReading: "--", lastSeenMs: 185000, batteryPct: 0 }
      ]
    }
  ];
}

function createFallbackData(tick) {
  const drift = Math.sin(tick / 4);
  const createZone = (base, offset, severity) => {
    const temp = 23.4 + offset * 1.6 + drift * 1.2;
    const humidity = 67 - offset * 4 + Math.cos(tick / 5 + offset) * 6;
    const moisture = 0.34 - offset * 0.04 + Math.sin(tick / 6 + offset) * 0.025;
    const vpd = clamp(0.9 + offset * 0.35 + (temp - 24) * 0.08, 0.4, 2.3);
    const co2 = 540 + offset * 120 + Math.sin(tick / 3 + offset) * 90;
    const irrigationLoad = clamp(0.25 + offset * 0.12 + Math.cos(tick / 5 + offset) * 0.15, 0, 1);
    const ventLoad = clamp(0.22 + offset * 0.18 + Math.sin(tick / 4 + offset) * 0.2, 0, 1);
    const fanLoad = clamp(0.28 + offset * 0.16 + Math.cos(tick / 3 + offset) * 0.18, 0, 1);
    const heaterLoad = clamp(offset === 2 ? 0.06 : 0.18 + Math.cos(tick / 8 + offset) * 0.1, 0, 1);
    const faultAlerts = severity === "critical"
      ? ["Irrigation pressure unstable", "Heat drift beyond setpoint"]
      : severity === "warning"
        ? ["Humidity plume near ridge vent"]
        : [];

    return {
      zoneId: base.id,
      deviceId: base.id,
      scenario: tick % 18 > 12 ? "high-radiation-stress" : "baseline-day",
      severity,
      indoor: {
        temperature: temp,
        humidity,
        co2,
        par: 620 + offset * 80,
        pressure: 1012
      },
      soil: {
        moisture,
        temperature: 20.4 + offset * 0.7,
        ec: 1.7 + offset * 0.12,
        ph: 6.1 + offset * 0.05,
        tankLevel: 76 - offset * 11 + Math.cos(tick / 7 + offset) * 5,
        irrigationFlow: 1.2 + irrigationLoad * 2.4
      },
      outdoor: {
        temperature: 18 + tick * 0.03,
        humidity: 62,
        solar: clamp(0.58 + Math.sin(tick / 7) * 0.18, 0, 1),
        wind: 2.1 + Math.cos(tick / 6) * 0.4
      },
      actuators: {
        vent: ventLoad,
        heater: heaterLoad,
        fan: fanLoad,
        mister: clamp(0.12 + offset * 0.1, 0, 1),
        irrigation: irrigationLoad,
        growLight: 0.06
      },
      derived: {
        dewPoint: temp - ((100 - humidity) / 5),
        vpd,
        evapotranspiration: 2 + offset * 0.4 + Math.sin(tick / 8 + offset) * 0.25,
        irrigationDemand: 48 + offset * 14 + Math.sin(tick / 4) * 8
      },
      alerts: faultAlerts
    };
  };

  const zones = [
    createZone(zoneBase[0], 0, "normal"),
    createZone(zoneBase[1], 1, "warning"),
    createZone(zoneBase[2], 2, "critical"),
    createZone(zoneBase[3], 3, "normal"),
    createZone(zoneBase[4], 4, "warning"),
    createZone(zoneBase[5], 5, "normal")
  ];

  const alerts = [
    {
      receivedAt: new Date(Date.now() - 90_000).toISOString(),
      type: "fault",
      payload: { zoneId: zones[2].zoneId, severity: "critical", message: "Irrigation dosing pressure collapse at south manifold" }
    },
    {
      receivedAt: new Date(Date.now() - 180_000).toISOString(),
      type: "warning",
      payload: { zoneId: zones[1].zoneId, severity: "warning", message: "Humidity plume detected below center ridge vent" }
    },
    {
      receivedAt: new Date(Date.now() - 420_000).toISOString(),
      type: "notice",
      payload: { zoneId: zones[0].zoneId, severity: "normal", message: "Night energy profile drifting toward daytime recipe" }
    }
  ];

  const history = Array.from({ length: 18 }, (_, idx) => ({
    ts: new Date(Date.now() - (17 - idx) * 5 * 60_000).toISOString(),
    temperature: 22 + Math.sin((tick + idx) / 4) * 1.8,
    humidity: 68 + Math.cos((tick + idx) / 5) * 6,
    co2: 590 + Math.sin((tick + idx) / 3) * 80,
    soilMoisture: 0.31 + Math.sin((tick + idx) / 7) * 0.03,
    irrigationFlow: 1.4 + Math.cos((tick + idx) / 6) * 0.4,
    vpd: 1.1 + Math.sin((tick + idx) / 5) * 0.18
  }));

  return {
    health: { mqttConnected: true },
    summary: {
      zones: zones.length,
      online: zones.length,
      warning: 1,
      critical: 1,
      avgTemperature: zones.reduce((sum, zone) => sum + zone.indoor.temperature, 0) / zones.length,
      avgHumidity: zones.reduce((sum, zone) => sum + zone.indoor.humidity, 0) / zones.length,
      avgCo2: zones.reduce((sum, zone) => sum + zone.indoor.co2, 0) / zones.length,
      avgSoilMoisture: zones.reduce((sum, zone) => sum + zone.soil.moisture, 0) / zones.length,
      avgVpd: zones.reduce((sum, zone) => sum + zone.derived.vpd, 0) / zones.length
    },
    devices: zones,
    alerts,
    history,
    scenario: zones[1].scenario
  };
}

function sparkline(values, color) {
  const width = 160;
  const height = 36;
  const padding = 2;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 0.001);
  const points = values.map((value, index) => {
    const x = (index / Math.max(values.length - 1, 1)) * width;
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  return `<svg class="spark" viewBox="0 0 ${width} ${height}" role="img" aria-hidden="true">
    <polyline fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${points}" />
  </svg>`;
}

function trendChart(values, color) {
  const width = 400;
  const height = 128;
  const padding = 4;
  const leftAxisWidth = 28;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 0.001);
  const chartLeft = leftAxisWidth;
  const chartRight = width - padding;
  const chartTop = padding;
  const chartBottom = height - padding;
  const chartWidth = chartRight - chartLeft;
  const chartHeight = chartBottom - chartTop;
  const coords = values.map((value, index) => {
    const x = chartLeft + (index / Math.max(values.length - 1, 1)) * chartWidth;
    const y = chartBottom - ((value - min) / range) * chartHeight;
    return [x, y];
  });
  const line = coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${chartLeft},${chartBottom} ${line} ${chartRight},${chartBottom}`;
  const tickValues = [max, min + range / 2, min];
  const tickMarkup = tickValues.map((tickValue) => {
    const y = chartBottom - ((tickValue - min) / range) * chartHeight;
    return `
      <line x1="${chartLeft}" y1="${y.toFixed(1)}" x2="${chartRight}" y2="${y.toFixed(1)}" stroke="rgba(79,97,79,0.16)" stroke-width="1" />
      <text x="${chartLeft - 8}" y="${(y + 4).toFixed(1)}" text-anchor="end" class="chart-y-label">${tickValue.toFixed(range >= 10 ? 0 : range >= 1 ? 1 : 2)}</text>
    `;
  }).join("");

  return `<svg class="trend-chart" viewBox="0 0 ${width} ${height}" role="img" aria-hidden="true">
    ${tickMarkup}
    <polygon points="${area}" fill="${color}22"></polygon>
    <line x1="${chartLeft}" y1="${chartBottom}" x2="${chartRight}" y2="${chartBottom}" stroke="rgba(79,97,79,0.28)" stroke-width="1" />
    <polyline fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${line}" />
  </svg>`;
}

function historySlice(history) {
  if (state.graphRange === "short") return history.slice(-6);
  if (state.graphRange === "medium") return history.slice(-12);
  return history;
}

function formatTimeLabel(ts) {
  if (!ts) return "--";
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function graphTimeLabels(history) {
  if (!history.length) return ["--", "--", "--"];
  const first = history[0];
  const middle = history[Math.floor((history.length - 1) / 2)];
  const last = history[history.length - 1];
  return [formatTimeLabel(first.ts), formatTimeLabel(middle.ts), formatTimeLabel(last.ts)];
}

function renderGraphRangeToggle() {
  if (!graphRangeToggleEl) return;
  const ranges = [
    ["short", "6 pts"],
    ["medium", "12 pts"],
    ["long", "All"]
  ];

  graphRangeToggleEl.innerHTML = ranges.map(([value, label]) => `
    <button
      type="button"
      class="range-chip ${state.graphRange === value ? "active" : ""}"
      data-graph-range="${value}"
      aria-pressed="${state.graphRange === value ? "true" : "false"}"
    >
      ${label}
    </button>
  `).join("");

  graphRangeToggleEl.querySelectorAll("[data-graph-range]").forEach((element) => {
    element.addEventListener("click", () => {
      state.graphRange = element.dataset.graphRange;
      renderGraphs();
    });
  });
}

function renderGraphMetricToggle() {
  if (!graphMetricToggleEl) return;
  const groups = [
    ["all", "All metrics"],
    ["climate", "Climate"],
    ["root", "Root zone"]
  ];

  graphMetricToggleEl.innerHTML = groups.map(([value, label]) => `
    <button
      type="button"
      class="range-chip ${state.graphMetricGroup === value ? "active" : ""}"
      data-graph-metric="${value}"
      aria-pressed="${state.graphMetricGroup === value ? "true" : "false"}"
    >
      ${label}
    </button>
  `).join("");

  graphMetricToggleEl.querySelectorAll("[data-graph-metric]").forEach((element) => {
    element.addEventListener("click", () => {
      state.graphMetricGroup = element.dataset.graphMetric;
      renderGraphs();
    });
  });
}

function renderGraphComparisonToggle() {
  if (!graphCompareToggleEl) return;
  const modes = [
    ["managed", "Managed zones"],
    ["focused", "Focused zone"]
  ];

  graphCompareToggleEl.innerHTML = modes.map(([value, label]) => `
    <button
      type="button"
      class="range-chip ${state.graphComparisonMode === value ? "active" : ""}"
      data-graph-compare="${value}"
      aria-pressed="${state.graphComparisonMode === value ? "true" : "false"}"
    >
      ${label}
    </button>
  `).join("");

  graphCompareToggleEl.querySelectorAll("[data-graph-compare]").forEach((element) => {
    element.addEventListener("click", () => {
      state.graphComparisonMode = element.dataset.graphCompare;
      renderGraphs();
    });
  });
}

function renderEdgeFleetSummary() {
  if (!edgeFleetSummaryEl) return;

  const offline = state.edgeDevices.filter((device) => device.status === "offline").length;
  const degraded = state.edgeDevices.filter((device) => device.status === "degraded").length;

  edgeFleetSummaryEl.innerHTML = `
    <div class="summary-card compact-summary">
      <div class="summary-top">
        <strong>Edge Fleet</strong>
        <span class="pill ${offline ? "critical" : degraded ? "warning" : "normal"}">
          ${offline ? "action" : degraded ? "watch" : "stable"}
        </span>
      </div>
      <div class="summary-grid compact-grid">
        <div class="mini"><div class="telemetry-label">Devices</div><strong>${state.edgeDevices.length}</strong></div>
        <div class="mini"><div class="telemetry-label">Offline</div><strong>${offline}</strong></div>
        <div class="mini"><div class="telemetry-label">Degraded</div><strong>${degraded}</strong></div>
        <div class="mini"><div class="telemetry-label">Healthy</div><strong>${state.edgeDevices.length - offline - degraded}</strong></div>
      </div>
    </div>
  `;
}

function renderEdgeDeviceList() {
  if (!edgeDeviceListEl) return;

  edgeDeviceListEl.innerHTML = state.edgeDevices.map((device) => `
    <div class="zone-card ${state.selectedEdgeDeviceId === device.id ? "active" : ""}" data-edge-device-id="${device.id}">
      <div class="zone-card-top">
        <div class="zone-title-row">
          <span class="zone-select-indicator" aria-hidden="true"></span>
          <strong>${device.name}</strong>
        </div>
        <span class="pill ${edgeSeverityClass(device.status)}">${device.status}</span>
      </div>
      <div class="zone-subline">
        <span>${device.zoneName}</span>
        <span>${device.sensors.length} sensors</span>
        <span>${Math.round(device.lastSeenMs / 1000)}s ago</span>
      </div>
      <div class="zone-metrics">
        <div class="mini"><div class="telemetry-label">Signal</div><strong>${device.signalRssi} dBm</strong></div>
        <div class="mini"><div class="telemetry-label">Loss</div><strong>${device.packetLossPct}%</strong></div>
      </div>
    </div>
  `).join("");

  edgeDeviceListEl.querySelectorAll("[data-edge-device-id]").forEach((element) => {
    element.addEventListener("click", () => {
      state.selectedEdgeDeviceId = element.dataset.edgeDeviceId;
      render();
    });
  });
}

function renderEdgeSummary() {
  if (!edgeSummaryEl) return;
  const device = selectedEdgeDevice();
  if (!device) return;

  const healthySensors = device.sensors.filter((sensor) => sensor.status === "healthy").length;
  const unhealthySensors = device.sensors.length - healthySensors;

  edgeSummaryEl.innerHTML = `
    <div class="summary-card">
      <div class="summary-top">
        <strong>Selected Device</strong>
        <span class="pill ${edgeSeverityClass(device.status)}">${device.status}</span>
      </div>
      <div class="muted-value">${device.name} in ${device.zoneName}</div>
    </div>
    <div class="summary-card">
      <div class="summary-top">
        <strong>Broker Link</strong>
        <span class="pill ${device.brokerLink === "down" ? "critical" : device.brokerLink === "unstable" ? "warning" : "normal"}">${device.brokerLink}</span>
      </div>
      <div class="muted-value">Last seen ${Math.round(device.lastSeenMs / 1000)} seconds ago</div>
    </div>
    <div class="summary-card">
      <div class="summary-top">
        <strong>Firmware / Uptime</strong>
        <span class="pill normal">gateway</span>
      </div>
      <div class="muted-value">v${device.firmwareVersion} | ${device.uptimeHours}h uptime</div>
    </div>
    <div class="summary-card">
      <div class="summary-top">
        <strong>Sensor Health</strong>
        <span class="pill ${unhealthySensors ? "warning" : "normal"}">${unhealthySensors} impacted</span>
      </div>
      <div class="muted-value">${healthySensors}/${device.sensors.length} sensors healthy</div>
    </div>
  `;
}

function renderEdgeSensorDetail() {
  if (!edgeSensorDetailEl) return;
  const device = selectedEdgeDevice();
  if (!device) return;

  edgeSensorDetailEl.innerHTML = `
    <div class="detail-card asset-detail-panel">
      <div class="alert-top">
        <strong>${device.name}</strong>
        <span class="pill ${edgeSeverityClass(device.status)}">${device.status}</span>
      </div>
      <div class="muted" style="margin-top:6px">${device.zoneName} sensor batch</div>
      <div class="asset-dataset">
        ${renderEdgeTopology(device)}
        <div class="section-label">Downstream Sensors</div>
        <div class="asset-selector-list">
          ${device.sensors.map((sensor) => `
            <div class="asset-selector edge-sensor-row">
              <span class="asset-selector-icon sensor-icon-wrap">
                ${sensorMetricIcon(sensor.metricType, sensor.status)}
              </span>
              <span class="asset-selector-copy">
                <strong>${sensor.name}</strong>
                <span class="sensor-meta">
                  <span class="sensor-type">${sensor.metricType}</span>
                  <span class="sensor-state ${edgeSeverityClass(sensor.status)}">${sensor.status}</span>
                  <span>seen ${Math.round(sensor.lastSeenMs / 1000)}s ago</span>
                </span>
              </span>
              <span class="asset-selector-metric sensor-reading">${sensor.lastReading}</span>
            </div>
          `).join("")}
        </div>
      </div>
    </div>
  `;
}

function renderEdgeAlerts() {
  if (!edgeAlertListEl) return;

  const rows = state.edgeAlerts.map((event) => `
    <div class="alert-card ${severityClass(event.payload.severity)}">
      <div class="alert-time">${new Date(event.receivedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
      <div class="alert-zone">${zoneNames[event.payload.zoneId] || event.payload.zoneId}</div>
      <div class="alert-severity"><span class="pill ${severityClass(event.payload.severity)}">${event.payload.severity}</span></div>
      <div class="alert-message">${event.payload.message}</div>
      <div class="alert-actions"></div>
    </div>
  `).join("");

  edgeAlertListEl.innerHTML = `
    <div class="incident-table">
      <div class="incident-head">
        <span>Time</span>
        <span>Zone</span>
        <span>State</span>
        <span>Incident</span>
        <span></span>
      </div>
      ${rows || '<div class="muted" style="padding:10px">No active edge incidents.</div>'}
    </div>
  `;
}

function renderSensorFleetSummary() {
  if (!sensorFleetSummaryEl) return;
  const sensors = allSensors();
  const offline = sensors.filter((sensor) => sensor.status === "offline").length;
  const stale = sensors.filter((sensor) => sensor.status === "stale" || sensor.status === "degraded").length;
  const healthy = sensors.length - offline - stale;

  sensorFleetSummaryEl.innerHTML = `
    <div class="summary-card compact-summary">
      <div class="summary-top">
        <strong>Sensor Fleet</strong>
        <span class="pill ${offline ? "critical" : stale ? "warning" : "normal"}">
          ${offline ? "action" : stale ? "watch" : "stable"}
        </span>
      </div>
      <div class="summary-grid compact-grid">
        <div class="mini"><div class="telemetry-label">Sensors</div><strong>${sensors.length}</strong></div>
        <div class="mini"><div class="telemetry-label">Healthy</div><strong>${healthy}</strong></div>
        <div class="mini"><div class="telemetry-label">Stale</div><strong>${stale}</strong></div>
        <div class="mini"><div class="telemetry-label">Offline</div><strong>${offline}</strong></div>
      </div>
    </div>
  `;
}

function renderSensorList() {
  if (!sensorListEl) return;
  const sensors = allSensors();
  sensorListEl.innerHTML = sensors.map((sensor) => `
    <button class="asset-selector ${state.selectedSensorId === sensor.id ? "active" : ""}" data-sensor-id="${sensor.id}" type="button">
      <span class="asset-selector-icon sensor-icon-wrap">
        ${sensorMetricIcon(sensor.metricType, sensor.status)}
      </span>
      <span class="asset-selector-copy">
        <strong>${sensor.name}</strong>
        <span class="sensor-meta">
          <span class="sensor-type">${sensor.zoneName}</span>
          <span class="sensor-state ${edgeSeverityClass(sensor.status)}">${sensor.status}</span>
          <span>${sensor.deviceName}</span>
        </span>
      </span>
      <span class="asset-selector-metric sensor-reading">${sensor.lastReading}</span>
    </button>
  `).join("");

  sensorListEl.querySelectorAll('[data-sensor-id]').forEach((element) => {
    element.addEventListener('click', () => {
      state.selectedSensorId = element.dataset.sensorId;
      render();
    });
  });
}

function renderSensorSummary() {
  if (!sensorSummaryEl) return;
  const sensor = selectedSensor();
  if (!sensor) return;

  sensorSummaryEl.innerHTML = `
    <div class="summary-card">
      <div class="summary-top">
        <strong>Selected Sensor</strong>
        <span class="pill ${edgeSeverityClass(sensor.status)}">${sensor.status}</span>
      </div>
      <div class="muted-value">${sensor.name} in ${sensor.zoneName}</div>
    </div>
    <div class="summary-card">
      <div class="summary-top">
        <strong>Last Reading</strong>
        <span class="pill normal">live</span>
      </div>
      <div class="muted-value">${sensor.lastReading}</div>
    </div>
    <div class="summary-card">
      <div class="summary-top">
        <strong>Freshness / Battery</strong>
        <span class="pill ${sensor.lastSeenMs > 60000 ? "warning" : "normal"}">${Math.round(sensor.lastSeenMs / 1000)}s</span>
      </div>
      <div class="muted-value">${sensor.batteryPct}% battery remaining</div>
    </div>
    <div class="summary-card">
      <div class="summary-top">
        <strong>Gateway Path</strong>
        <span class="pill ${edgeSeverityClass(sensor.deviceStatus)}">${sensor.deviceStatus}</span>
      </div>
      <div class="muted-value">${sensor.deviceName}</div>
    </div>
  `;
}

function renderSensorDetail() {
  if (!sensorDetailEl) return;
  const sensor = selectedSensor();
  if (!sensor) return;

  sensorDetailEl.innerHTML = `
    <div class="detail-card asset-detail-panel">
      <div class="alert-top">
        <strong>${sensor.name}</strong>
        <span class="pill ${edgeSeverityClass(sensor.status)}">${sensor.metricType}</span>
      </div>
      <div class="muted" style="margin-top:6px">${sensor.zoneName} | attached to ${sensor.deviceName}</div>
      <div class="asset-dataset">
        <div class="edge-topology-card">
          <div class="edge-topology-copy">
            <div>
              <div class="section-label">Sensor Path</div>
              <strong>${sensor.metricType}</strong>
            </div>
            <span class="pill ${edgeSeverityClass(sensor.status)}">${sensor.status}</span>
          </div>
          <svg class="edge-topology-svg" viewBox="0 0 380 120" role="img" aria-label="Gateway to sensor path">
            <rect x="16" y="28" width="120" height="64" rx="16" fill="rgba(17, 41, 27, 0.98)" stroke="rgba(132,241,178,0.6)" stroke-width="2" />
            <text x="76" y="56" text-anchor="middle" fill="#effff5" font-size="11" font-weight="800">${sensor.deviceName}</text>
            <text x="76" y="72" text-anchor="middle" fill="#9edab8" font-size="9.5">gateway</text>
            <line x1="136" y1="60" x2="242" y2="60" stroke="${sensor.status === "offline" ? "#cc5d51" : sensor.status === "stale" ? "#c98b1f" : "#84f1b2"}" stroke-width="3" stroke-dasharray="${sensor.status === "offline" ? "6 6" : "none"}" />
            <circle cx="296" cy="60" r="24" fill="rgba(10, 26, 17, 0.95)" stroke="${sensor.status === "offline" ? "#cc5d51" : sensor.status === "stale" ? "#c98b1f" : "#84f1b2"}" stroke-width="2.5" />
            <foreignObject x="283" y="47" width="26" height="26">${sensorMetricIcon(sensor.metricType, sensor.status)}</foreignObject>
            <text x="296" y="100" text-anchor="middle" fill="#b7e7ca" font-size="9.5" font-weight="700">${sensor.name}</text>
          </svg>
        </div>
        <div class="asset-row"><span>Latest reading</span><strong>${sensor.lastReading}</strong></div>
        <div class="asset-row"><span>Battery</span><strong>${sensor.batteryPct}%</strong></div>
        <div class="asset-row"><span>Last seen</span><strong>${Math.round(sensor.lastSeenMs / 1000)} seconds ago</strong></div>
        <div class="asset-row"><span>Gateway signal</span><strong>${sensor.signalRssi} dBm</strong></div>
        <div class="asset-row"><span>Gateway packet loss</span><strong>${sensor.packetLossPct}%</strong></div>
        <div class="asset-row"><span>Broker path</span><strong>${sensor.brokerLink}</strong></div>
      </div>
    </div>
  `;
}

function renderSensorAlerts() {
  if (!sensorAlertListEl) return;
  const sensor = selectedSensor();
  if (!sensor) {
    sensorAlertListEl.innerHTML = '';
    return;
  }

  const incidents = [];
  if (sensor.status !== 'healthy') {
    incidents.push({
      receivedAt: new Date().toISOString(),
      severity: sensor.status === 'offline' ? 'critical' : 'warning',
      message: sensor.status === 'offline' ? `${sensor.name} stopped reporting` : `${sensor.name} is reporting stale data`
    });
  }
  if (sensor.batteryPct <= 25) {
    incidents.push({
      receivedAt: new Date(Date.now() - 120000).toISOString(),
      severity: 'warning',
      message: `${sensor.name} battery reserve is low`
    });
  }
  if (sensor.packetLossPct >= 5) {
    incidents.push({
      receivedAt: new Date(Date.now() - 240000).toISOString(),
      severity: 'warning',
      message: `${sensor.deviceName} is dropping packets on the upstream path`
    });
  }

  sensorAlertListEl.innerHTML = `
    <div class="incident-table">
      <div class="incident-head">
        <span>Time</span>
        <span>Zone</span>
        <span>State</span>
        <span>Incident</span>
        <span></span>
      </div>
      ${(incidents.map((event) => `
        <div class="alert-card ${severityClass(event.severity)}">
          <div class="alert-time">${new Date(event.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          <div class="alert-zone">${sensor.zoneName}</div>
          <div class="alert-severity"><span class="pill ${severityClass(event.severity)}">${event.severity}</span></div>
          <div class="alert-message">${event.message}</div>
          <div class="alert-actions"></div>
        </div>
      `).join('')) || '<div class="muted" style="padding:10px">No active incidents for this sensor.</div>'}
    </div>
  `;
}

function renderFleetSummary() {
  if (!state.summary) {
    setSlotHTML("fleet-summary", "");
    return;
  }
  const managed = managedZones();
  const managedAlerts = managed.reduce((sum, zone) => sum + zone.alerts.length, 0);

  setSlotHTML("fleet-summary", `
    <div class="summary-card compact-summary">
      <div class="summary-top">
        <strong>Greenhouse A</strong>
        <span class="pill ${state.summary.critical ? "critical" : state.summary.warning ? "warning" : "normal"}">
          ${state.summary.critical ? "attention" : state.summary.warning ? "watch" : "stable"}
        </span>
      </div>
      <div class="summary-grid compact-grid">
        <div class="mini">
          <div class="telemetry-label">Zones</div>
          <strong>${state.summary.zones ?? "--"}</strong>
        </div>
        <div class="mini">
          <div class="telemetry-label">Managed</div>
          <strong>${managed.length}</strong>
        </div>
        <div class="mini">
          <div class="telemetry-label">Avg Air</div>
          <strong>${fmt(state.summary.avgTemperature, 1, " C")}</strong>
        </div>
        <div class="mini">
          <div class="telemetry-label">Alerts</div>
          <strong>${managedAlerts}</strong>
        </div>
      </div>
    </div>
  `);
}

function renderZoneList() {
  const html = state.zones.map((zone) => `
    <div class="zone-card ${isManagedZone(zone.id) ? "managed" : ""} ${state.selectedZoneId === zone.id ? "active" : ""}" data-zone-id="${zone.id}">
      <div class="zone-card-top">
        <div class="zone-title-row">
          <span class="zone-select-indicator" aria-hidden="true"></span>
          <strong>${zone.name}</strong>
        </div>
        <span class="pill ${severityClass(zone.severity)}">${state.selectedZoneId === zone.id ? "focused" : isManagedZone(zone.id) ? "managed" : zone.severity}</span>
      </div>
      <div class="zone-subline">
        <span>${fmt(zone.indoor.temperature, 1, " C")}</span>
        <span>${fmt(zone.indoor.humidity, 0, " %")} RH</span>
        <span>${zone.alerts.length} alerts</span>
      </div>
      <div class="zone-metrics">
        <div class="mini"><div class="telemetry-label">Moisture</div><strong>${fmt(zone.soil.moisture, 2, "")}</strong></div>
        <div class="mini"><div class="telemetry-label">Demand</div><strong>${fmt(zone.derived.irrigationDemand, 0, "")}</strong></div>
      </div>
    </div>
  `).join("");

  setSlotHTML("zone-list", html);

  slotEls("zone-list").forEach((container) => container.querySelectorAll("[data-zone-id]").forEach((element) => {
    element.addEventListener("click", async () => {
      if (currentPage === "twin") {
        await focusZone(element.dataset.zoneId, { ensureManaged: true });
        return;
      }
      await toggleManagedZone(element.dataset.zoneId);
    });
  }));
}

function renderSceneBadges(zone) {
  if (!sceneBadgesEl) return;
  const managed = managedZones();
  sceneBadgesEl.innerHTML = `
    <div class="scene-badge">
      <div class="telemetry-label">Focused Zone</div>
      <strong>${zone.name}</strong>
      <div class="muted-value">${fmt(zone.indoor.temperature, 1, " C")} air · ${fmt(zone.soil.moisture, 2, "")} root water</div>
    </div>
    <div class="scene-badge">
      <div class="telemetry-label">Managed Set</div>
      <strong>${managed.length} zones</strong>
      <div class="muted-value">${managed.map((item) => item.name).join(" · ")}</div>
    </div>
  `;
}

function renderSchematic() {
  const zone = selectedZone();
  schematicEl.innerHTML = `
    <div class="schematic-photo-wrap">
      <img
        class="schematic-photo"
        src="${greenhousePhotoUrl}"
        alt="Greenhouse interior with rows of plants and visible growing infrastructure"
      />
      <div class="schematic-hotspots" aria-label="Greenhouse zones">
        ${state.zones.map((item) => `
          <button
            type="button"
            class="zone-hotspot ${isManagedZone(item.id) ? "managed" : ""} ${item.id === state.selectedZoneId ? "active" : ""}"
            data-zone-hotspot="${item.id}"
            style="
              left:${((item.x + item.width / 2) / 980 * 100).toFixed(2)}%;
              top:${((item.y + item.height / 2) / 640 * 100).toFixed(2)}%;
            "
            aria-pressed="${item.id === state.selectedZoneId ? "true" : "false"}"
          >
            <span class="zone-hotspot-dot" aria-hidden="true"></span>
            <span class="zone-hotspot-label">${item.name}</span>
          </button>
        `).join("")}
      </div>
      <div class="schematic-selected-zone">
        <div class="telemetry-label">Image focus</div>
        <strong>${zone.name}</strong>
        <span>${fmt(zone.indoor.temperature, 1, " C")} air · ${fmt(zone.soil.moisture, 2, "")} moisture</span>
      </div>
      <div class="schematic-photo-caption">
        <strong>Facility reference</strong>
        <span>Click a zone marker to sync the twin selection.</span>
      </div>
    </div>
  `;

  schematicEl.querySelectorAll("[data-zone-hotspot]").forEach((element) => {
    element.addEventListener("click", async () => {
      await focusZone(element.dataset.zoneHotspot, { ensureManaged: true });
    });
  });
}

function renderAlerts() {
  const severityRank = { critical: 0, warning: 1, normal: 2 };
  const focusedZoneId = selectedZone()?.id;
  const scopedAlerts = currentPage === "operations"
    ? state.alerts.filter((event) => {
      const payload = event.payload || {};
      const zoneId = payload.zoneId || payload.deviceId || "";
      return zoneId === focusedZoneId;
    })
    : state.alerts;
  const rows = [...scopedAlerts]
    .sort((left, right) => {
      const leftSeverity = severityClass(left.payload?.severity);
      const rightSeverity = severityClass(right.payload?.severity);
      const severityDelta = (severityRank[leftSeverity] ?? 99) - (severityRank[rightSeverity] ?? 99);
      if (severityDelta !== 0) return severityDelta;
      return new Date(right.receivedAt).getTime() - new Date(left.receivedAt).getTime();
    })
    .slice(0, 20)
    .map((event) => {
    const payload = event.payload || {};
    const zoneId = payload.zoneId || payload.deviceId || "";
    return `
      <div class="alert-card ${severityClass(payload.severity)}" data-alert-zone-id="${zoneId}">
        <div class="alert-time">${new Date(event.receivedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
        <div class="alert-zone">${zoneNames[zoneId] || zoneId || "System"}</div>
        <div class="alert-severity"><span class="pill ${severityClass(payload.severity)}">${payload.severity || "normal"}</span></div>
        <div class="alert-message">${payload.message || event.type}</div>
        <div class="alert-actions">${zoneId ? `<a class="alert-link" href="/graphs?zone=${encodeURIComponent(zoneId)}">Graph</a>` : ""}</div>
      </div>
    `;
  }).join("");

  setSlotHTML("alert-list", `
    <div class="incident-table">
      <div class="incident-head">
        <span>Time</span>
        <span>Zone</span>
        <span>State</span>
        <span>Incident</span>
        <span>View</span>
      </div>
      ${rows || `<div class="muted" style="padding:10px">No current events for ${selectedZone()?.name || "focused zone"}.</div>`}
    </div>
  `);

  slotEls("alert-list").forEach((container) => {
    container.querySelectorAll("[data-alert-zone-id]").forEach((element) => {
      const zoneId = element.dataset.alertZoneId;
      if (!zoneId) return;
      element.addEventListener("click", async (event) => {
        if (event.target.closest(".alert-link")) return;
        await selectZone(zoneId);
      });
    });
  });
}

function selectedZone() {
  return state.zones.find((zone) => zone.id === state.selectedZoneId) || state.zones[0];
}

function scopedAssetsForCurrentPage() {
  const zone = selectedZone();
  if (currentPage === "operations") {
    return (zone?.assets || []).map((asset) => ({
      ...asset,
      zoneId: zone.id,
      zoneName: zone.name,
      zoneSeverity: zone.severity,
      faultContext: zone.alerts[0] || "Nominal"
    }));
  }
  return managedAssets();
}

function selectedAsset() {
  const assets = scopedAssetsForCurrentPage();
  return assets.find((asset) => asset.id === state.selectedAssetId) || assets[0];
}

function selectAsset(assetId) {
  state.selectedAssetId = assetId;
  render();
}

function renderAssetDetail() {
  const zone = selectedZone();
  const asset = selectedAsset();
  const assets = scopedAssetsForCurrentPage();
  const load = asset.load ?? 0;
  const datasetHtml = assets.map((candidate) => `
    <button class="asset-selector ${candidate.id === asset.id ? "active" : ""}" data-asset-id="${candidate.id}" type="button">
      <span class="asset-selector-icon" aria-hidden="true">${assetTypeIcon(candidate.type)}</span>
      <span class="asset-selector-copy">
        <strong>${candidate.name}</strong>
        <span>${candidate.zoneName} · ${candidate.type}</span>
      </span>
      <span class="asset-selector-metric">${fmt((candidate.load ?? 0) * 100, 0, " %")}</span>
    </button>
  `).join("");

  setSlotHTML("asset-detail", `
    <div class="detail-card asset-detail-panel">
      <div class="alert-top">
        <strong>${asset.name}</strong>
        <span class="pill ${severityClass(asset.zoneSeverity || zone.severity)}">${asset.type}</span>
      </div>
      <div class="muted" style="margin-top:6px">${asset.zoneName || zone.name} spatial anchor</div>
      <div class="asset-selection-visual">${assetSelectionGraphic(asset, { name: asset.zoneName || zone.name })}</div>
      <div class="asset-row"><span>${asset.metricLabel || "Control load"}</span><strong>${fmt(load * 100, 0, asset.metricUnit || " %")}</strong></div>
      <div class="asset-row"><span>Fault context</span><strong>${asset.faultContext || "Nominal"}</strong></div>
      <div class="asset-row"><span>Dataset size</span><strong>${currentPage === "operations" ? `${assets.length} assets in ${zone.name}` : `${assets.length} assets across ${managedZones().length} zones`}</strong></div>
      <div class="asset-dataset">
        <div class="section-label">${currentPage === "operations" ? `${zone.name} Assets` : "Asset Dataset"}</div>
        <div class="asset-selector-list">${datasetHtml}</div>
      </div>
    </div>
  `);

  slotEls("asset-detail").forEach((container) => {
    container.querySelectorAll("[data-asset-id]").forEach((element) => {
      element.addEventListener("click", () => {
        selectAsset(element.dataset.assetId);
      });
    });
  });
}

function renderOperationsSummary() {
  const root = document.getElementById("ops-summary");
  if (!root || !state.zones.length) return;
  const managed = managedZones();
  const focused = selectedZone();
  const avgTemp = managed.reduce((sum, zone) => sum + (zone.indoor.temperature ?? 0), 0) / managed.length;
  const avgHumidity = managed.reduce((sum, zone) => sum + (zone.indoor.humidity ?? 0), 0) / managed.length;
  const totalAssets = managed.reduce((sum, zone) => sum + zone.assets.length, 0);
  const totalAlerts = managed.reduce((sum, zone) => sum + zone.alerts.length, 0);

  root.innerHTML = `
    <div class="summary-card">
      <div class="summary-top">
        <strong>Managed Zones</strong>
        <span class="pill normal">${managed.length} active</span>
      </div>
      <div class="muted-value">${managed.map((zone) => zone.name).join(" · ")}</div>
    </div>
    <div class="summary-card">
      <div class="summary-top">
        <strong>Focused Zone</strong>
        <span class="pill ${severityClass(focused.severity)}">${focused.severity}</span>
      </div>
      <div class="muted-value">${focused.name}</div>
    </div>
    <div class="summary-card">
      <div class="summary-top">
        <strong>Average Climate</strong>
        <span class="pill normal">managed</span>
      </div>
      <div class="muted-value">${fmt(avgTemp, 1, " C")} air · ${fmt(avgHumidity, 0, " %")} RH</div>
    </div>
    <div class="summary-card">
      <div class="summary-top">
        <strong>Assets / Alerts</strong>
        <span class="pill ${totalAlerts ? "warning" : "normal"}">${totalAlerts} alerts</span>
      </div>
      <div class="muted-value">${totalAssets} addressable assets</div>
    </div>
  `;
}

function renderGraphs() {
  if (!graphGridEl) return;
  const zone = selectedZone();
  const managed = managedZones();
  const baseHistory = state.history.length ? state.history : createFallbackData(4).history;
  const history = historySlice(baseHistory);
  const [startLabel, middleLabel, endLabel] = graphTimeLabels(history);
  renderGraphRangeToggle();
  renderGraphMetricToggle();
  renderGraphComparisonToggle();

  const metricDefinitions = [
    {
      group: "climate",
      label: "Air temperature",
      color: "#1f8f3a",
      digits: 1,
      suffix: " C",
      currentValue: (entry) => entry.indoor.temperature,
      historyValue: (point) => point.temperature
    },
    {
      group: "climate",
      label: "Humidity",
      color: "#2d6f7c",
      digits: 0,
      suffix: " %",
      currentValue: (entry) => entry.indoor.humidity,
      historyValue: (point) => point.humidity
    },
    {
      group: "root",
      label: "Soil moisture",
      color: "#4f9a3d",
      digits: 2,
      suffix: "",
      currentValue: (entry) => entry.soil.moisture,
      historyValue: (point) => point.soilMoisture
    },
    {
      group: "root",
      label: "Irrigation flow",
      color: "#2b8890",
      digits: 1,
      suffix: " L/min",
      currentValue: (entry) => entry.soil.irrigationFlow,
      historyValue: (point) => point.irrigationFlow
    },
    {
      group: "climate",
      label: "VPD",
      color: "#b37a14",
      digits: 2,
      suffix: " kPa",
      currentValue: (entry) => entry.derived.vpd,
      historyValue: (point) => point.vpd
    }
  ];

  const visibleMetrics = state.graphMetricGroup === "all"
    ? metricDefinitions
    : metricDefinitions.filter((metric) => metric.group === state.graphMetricGroup);

  graphGridEl.innerHTML = visibleMetrics.map((metric) => {
    const values = history.map((point) => metric.historyValue(point)).filter((value) => typeof value === "number");
    const min = Math.min(...values);
    const max = Math.max(...values);
    const focusedValue = metric.currentValue(zone);
    const comparisonRows = state.graphComparisonMode === "managed"
      ? managed.map((item) => `
        <div class="graph-compare-row">
          <span>${item.name}</span>
          <strong>${fmt(metric.currentValue(item), metric.digits, metric.suffix)}</strong>
        </div>
      `).join("")
      : "";

    return `
    <article class="graph-card">
      <div class="graph-card-head">
        <div class="telemetry-label">${state.graphComparisonMode === "managed" ? `${managed.length} zone compare` : `Focused trend: ${zone.name}`}</div>
        <strong>${metric.label}</strong>
      </div>
      <div class="graph-axis-meta">
        <span>Max ${fmt(max, metric.digits, metric.suffix)}</span>
        <span>Min ${fmt(min, metric.digits, metric.suffix)}</span>
      </div>
      ${trendChart(values, metric.color)}
      ${state.graphComparisonMode === "managed" ? `
        <div class="graph-compare-list">
          ${comparisonRows}
        </div>
      ` : `
        <div class="graph-focus-note">Focused trend: ${zone.name}</div>
      `}
      <div class="graph-time-meta">
        <span>${startLabel}</span>
        <span>${middleLabel}</span>
        <span>${endLabel}</span>
      </div>
    </article>
  `;
  }).join("");
}

function render() {
  if (currentPage === "edge-devices") {
    scenarioLabelEl.textContent = selectedScenarioLabel();
    if (selectedZoneLabelEl) selectedZoneLabelEl.textContent = selectedEdgeDevice()?.zoneName || "--";
    if (selectedAssetHeadingEl) selectedAssetHeadingEl.textContent = "Edge";
    if (selectedAssetLabelEl) selectedAssetLabelEl.textContent = selectedEdgeDevice()?.name || "--";
    renderEdgeFleetSummary();
    renderEdgeDeviceList();
    renderEdgeSummary();
    renderEdgeSensorDetail();
    renderEdgeAlerts();
    return;
  }

  if (currentPage === "sensors") {
    scenarioLabelEl.textContent = selectedScenarioLabel();
    if (selectedZoneLabelEl) selectedZoneLabelEl.textContent = selectedSensor()?.zoneName || "--";
    if (selectedAssetHeadingEl) selectedAssetHeadingEl.textContent = "Sensor";
    if (selectedAssetLabelEl) selectedAssetLabelEl.textContent = selectedSensor()?.name || "--";
    renderSensorFleetSummary();
    renderSensorList();
    renderSensorSummary();
    renderSensorDetail();
    renderSensorAlerts();
    return;
  }

  if (!state.zones.length) return;
  const zone = selectedZone();
  const asset = selectedAsset();
  const managed = managedZones();
  scenarioLabelEl.textContent = selectedScenarioLabel();
  if (selectedZoneLabelEl) selectedZoneLabelEl.textContent = selectedZoneLabel();
  if (currentPage === "graphs") {
    if (selectedAssetHeadingEl) selectedAssetHeadingEl.textContent = "Mode";
    if (selectedAssetLabelEl) {
      selectedAssetLabelEl.textContent = state.graphComparisonMode === "managed"
        ? "Zone compare"
        : "Focused trend";
    }
  } else {
    if (selectedAssetHeadingEl) selectedAssetHeadingEl.textContent = "Asset";
    if (selectedAssetLabelEl && asset) {
      selectedAssetLabelEl.textContent = currentPage === "operations"
        ? asset.name
        : managed.length > 1 ? `${asset.name} (${asset.zoneName})` : asset.name;
    }
  }
  const statusHtml = `
    <strong>${state.summary?.critical ? "Intervention priority" : state.summary?.warning ? "Adaptive correction" : "Nominal coordination"}</strong>
  `;
  if (sceneStatusEl) sceneStatusEl.innerHTML = statusHtml;
  if (opsStatusEl) opsStatusEl.innerHTML = statusHtml;
  if (graphsStatusEl) graphsStatusEl.innerHTML = statusHtml;
  renderFleetSummary();
  renderZoneList();
  renderSceneBadges(zone);
  renderOperationsSummary();
  if (currentPage === "twin") {
    renderSchematic();
  }
  renderAlerts();
  renderAssetDetail();
  if (currentPage === "graphs") {
    renderGraphs();
  }
}

async function loadLiveData() {
  const [health, devices, summary, alerts, scenario] = await Promise.all([
    fetch(apiBase + "/health").then((response) => response.json()),
    fetch(apiBase + "/devices").then((response) => response.json()),
    fetch(apiBase + "/summary").then((response) => response.json()),
    fetch(apiBase + "/alerts").then((response) => response.json()),
    fetch(simulatorBase + "/scenario").then((response) => response.json()).catch(() => ({ scenario: "baseline-day" }))
  ]);

  const primaryId = pendingZoneId || state.selectedZoneId;
  state.summary = summary;
  state.zones = devices.map(normalizeZone);
  state.alerts = alerts;
  state.scenario = scenario.scenario || state.scenario;
  state.selectedZoneId = state.zones.find((zone) => zone.id === primaryId)?.id || state.selectedZoneId || state.zones[0]?.id;
  if (pendingZoneId) {
    state.managedZoneIds = [pendingZoneId];
  }
  pendingZoneId = null;
  syncManagedState();
  const currentZone = selectedZone();

  if (currentZone) {
    await loadHistoryForZone(currentZone.id);
  }

  brokerPillEl.className = "pill " + (health.mqttConnected ? "normal" : "critical");
  brokerPillEl.textContent = health.mqttConnected ? "Broker linked" : "Broker lost";
}

function loadFallback(tick) {
  const fallback = createFallbackData(tick);
  state.summary = fallback.summary;
  state.zones = fallback.devices.map(normalizeZone);
  state.alerts = fallback.alerts;
  state.history = fallback.history;
  state.scenario = fallback.scenario;
  brokerPillEl.className = "pill normal";
  brokerPillEl.textContent = "Synthetic stream";
}

let fallbackTick = 0;

async function refresh() {
  try {
    await loadLiveData();
  } catch (error) {
    fallbackTick += 1;
    loadFallback(fallbackTick);
  }

  if (currentPage === "edge-devices" || currentPage === "sensors") {
    fallbackTick += 1;
    loadEdgeFallback(fallbackTick);
  }

  if (!selectedZone()) {
    state.selectedZoneId = state.zones[0]?.id || state.selectedZoneId;
  }
  syncManagedState();

  const zone = selectedZone();
  if (zone && !managedAssets().find((asset) => asset.id === state.selectedAssetId)) {
    state.selectedAssetId = managedAssets()[0]?.id || zone.assets[0]?.id || state.selectedAssetId;
  }

  render();
}

await refresh();
setInterval(refresh, 3500);


