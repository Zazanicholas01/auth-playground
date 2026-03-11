const config = window.__IOT_CONFIG__ || {};
const apiBase = config.apiBase || (window.location.origin + "/api");
const simulatorBase = config.simulatorBase || (window.location.origin + "/simulator");
const currentPage = window.location.pathname === "/operations"
  ? "operations"
  : window.location.pathname === "/graphs"
    ? "graphs"
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
  scenario: "baseline-day",
  graphRange: "medium",
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
const selectedAssetLabelEl = document.getElementById("selected-asset-label");
const sceneStatusEl = document.getElementById("scene-status");
const opsStatusEl = document.getElementById("ops-status");
const graphsStatusEl = document.getElementById("graphs-status");
const schematicEl = document.getElementById("schematic");
const sceneBadgesEl = document.getElementById("scene-badges");
const graphGridEl = document.getElementById("graph-grid");
const graphRangeToggleEl = document.getElementById("graph-range-toggle");
const greenhousePhotoUrl = "/dev-assets/greenhouse-twin.png";

function severityClass(severity) {
  if (severity === "critical") return "critical";
  if (severity === "warning") return "warning";
  return "normal";
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
    <rect x="1" y="1" width="278" height="130" rx="18" fill="rgba(16,33,19,0.04)" stroke="rgba(18,56,26,0.10)" />
    <rect x="24" y="28" width="232" height="76" rx="18" fill="rgba(34,124,68,0.08)" stroke="rgba(34,124,68,0.18)" stroke-dasharray="5 5"/>
    <circle cx="66" cy="66" r="26" fill="rgba(23,202,119,0.16)" stroke="rgba(24,111,64,0.35)" stroke-width="2"/>
    <foreignObject x="42" y="42" width="48" height="48">${assetTypeIcon(asset.type)}</foreignObject>
    <g transform="translate(144 66)">
      <circle cx="0" cy="0" r="18" fill="none" stroke="rgba(18,56,26,0.12)" stroke-width="6"/>
      <circle cx="0" cy="0" r="18" fill="none" stroke="#1f8f3a" stroke-width="6" stroke-linecap="round" stroke-dasharray="${ring} 100" pathLength="100" transform="rotate(-90)"/>
      <text x="0" y="3.5" text-anchor="middle" fill="#17311a" font-size="11" font-weight="800">${ring}%</text>
    </g>
    <text x="240" y="45" text-anchor="end" fill="#5d715f" font-size="10" font-weight="700" letter-spacing="1.4">SELECTED</text>
    <text x="240" y="66" text-anchor="end" fill="#17311a" font-size="15" font-weight="800">${zone.name}</text>
    <text x="240" y="86" text-anchor="end" fill="#5d715f" font-size="11">${asset.metricLabel || "Control load"}</text>
  </svg>`;
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
  const width = 360;
  const height = 128;
  const padding = 8;
  const leftAxisWidth = 42;
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
  const rows = [...state.alerts]
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
      ${rows}
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

function selectedAsset() {
  const assets = managedAssets();
  return assets.find((asset) => asset.id === state.selectedAssetId) || assets[0];
}

function selectAsset(assetId) {
  state.selectedAssetId = assetId;
  render();
}

function renderAssetDetail() {
  const zone = selectedZone();
  const asset = selectedAsset();
  const assets = managedAssets();
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
      <div class="asset-row"><span>Dataset size</span><strong>${assets.length} assets across ${managedZones().length} zones</strong></div>
      <div class="asset-dataset">
        <div class="section-label">Asset Dataset</div>
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
  const baseHistory = state.history.length ? state.history : createFallbackData(4).history;
  const history = historySlice(baseHistory);
  const [startLabel, middleLabel, endLabel] = graphTimeLabels(history);
  renderGraphRangeToggle();

  const cards = [
    ["Air temperature", fmt(zone.indoor.temperature, 1, " C"), "#1f8f3a", history.map((point) => point.temperature), 1, " C"],
    ["Humidity", fmt(zone.indoor.humidity, 0, " %"), "#2d6f7c", history.map((point) => point.humidity), 0, " %"],
    ["Soil moisture", fmt(zone.soil.moisture, 2, ""), "#4f9a3d", history.map((point) => point.soilMoisture), 2, ""],
    ["VPD", fmt(zone.derived.vpd, 2, " kPa"), "#b37a14", history.map((point) => point.vpd), 2, " kPa"]
  ];

  graphGridEl.innerHTML = cards.map(([label, value, color, values, digits, suffix]) => {
    const min = Math.min(...values);
    const max = Math.max(...values);
    return `
    <article class="graph-card">
      <div class="graph-card-head">
        <div class="telemetry-label">${label}</div>
        <strong>${value}</strong>
      </div>
      <div class="graph-axis-meta">
        <span>Max ${fmt(max, digits, suffix)}</span>
        <span>Min ${fmt(min, digits, suffix)}</span>
      </div>
      ${trendChart(values, color)}
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
  if (!state.zones.length) return;
  const zone = selectedZone();
  const asset = selectedAsset();
  const managed = managedZones();
  scenarioLabelEl.textContent = selectedScenarioLabel();
  if (selectedZoneLabelEl) selectedZoneLabelEl.textContent = selectedZoneLabel();
  if (selectedAssetLabelEl && asset) selectedAssetLabelEl.textContent = managed.length > 1 ? `${asset.name} (${asset.zoneName})` : asset.name;
  const statusHtml = `
    <span class="muted">${managed.length > 1 ? "Managed zones" : "Facility mode"}</span>
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
