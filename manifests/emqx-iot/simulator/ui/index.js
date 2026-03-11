const config = window.__IOT_CONFIG__ || {};
const apiBase = config.apiBase || (window.location.origin + "/api");
const simulatorBase = config.simulatorBase || (window.location.origin + "/simulator");
const currentPage = window.location.pathname === "/operations" ? "operations" : "twin";

document.body.dataset.page = currentPage;
document.querySelectorAll("[data-nav]").forEach((link) => {
  if (link.dataset.nav === currentPage) link.classList.add("active");
});

const overlayLabels = {
  airflow: "Airflow",
  irrigation: "Irrigation",
  heat: "Heat",
  humidity: "Humidity",
  faults: "Faults"
};

const zoneNames = {
  "greenhouse-a-north": "North Bay",
  "greenhouse-a-center": "Center Bay",
  "greenhouse-a-south": "South Bay",
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
      { id: "north-fans", name: "Supply fan bank", type: "air handling", x: 112, y: 135, width: 50, height: 24 },
      { id: "north-vent", name: "Roof vent array", type: "ventilation", x: 250, y: 112, width: 65, height: 14 },
      { id: "north-heater", name: "Pipe heater loop", type: "thermal", x: 102, y: 388, width: 210, height: 14 },
      { id: "north-irrigation", name: "Irrigation manifold", type: "water", x: 140, y: 336, width: 140, height: 18 }
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
      { id: "center-fans", name: "Circulation fans", type: "air handling", x: 390, y: 135, width: 54, height: 24 },
      { id: "center-vent", name: "Thermal ridge vent", type: "ventilation", x: 520, y: 112, width: 66, height: 14 },
      { id: "center-heater", name: "Hydronic pipe loop", type: "thermal", x: 376, y: 388, width: 210, height: 14 },
      { id: "center-irrigation", name: "Root drip manifold", type: "water", x: 414, y: 336, width: 140, height: 18 }
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
      { id: "south-fans", name: "Exhaust fan bank", type: "air handling", x: 664, y: 135, width: 52, height: 24 },
      { id: "south-vent", name: "South ridge vent", type: "ventilation", x: 794, y: 112, width: 64, height: 14 },
      { id: "south-heater", name: "Perimeter heat loop", type: "thermal", x: 648, y: 388, width: 212, height: 14 },
      { id: "south-irrigation", name: "Nutrient dosing bar", type: "water", x: 687, y: 336, width: 142, height: 18 }
    ]
  }
];

const state = {
  summary: null,
  zones: [],
  alerts: [],
  history: [],
  scenario: "baseline-day",
  overlays: {
    airflow: true,
    irrigation: true,
    heat: true,
    humidity: true,
    faults: true
  },
  selectedZoneId: "greenhouse-a-north",
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

const brokerPillEl = document.getElementById("broker-pill");
const scenarioLabelEl = document.getElementById("scenario-label");
const sceneStatusEl = document.getElementById("scene-status");
const opsStatusEl = document.getElementById("ops-status");
const schematicEl = document.getElementById("schematic");
const sceneBadgesEl = document.getElementById("scene-badges");
const climateStripEl = document.getElementById("climate-strip");

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

function normalizeZone(zone, index = 0) {
  const base = zoneBase[index] || zoneBase[0];
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
      load: asset.type === "air handling"
        ? actuators.fan ?? 0
        : asset.type === "ventilation"
          ? actuators.vent ?? 0
          : asset.type === "thermal"
            ? actuators.heater ?? 0
            : actuators.irrigation ?? 0
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
    createZone(zoneBase[2], 2, "critical")
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

function renderFleetSummary() {
  setSlotHTML("fleet-summary", "");
}

function renderZoneList() {
  const html = state.zones.map((zone) => `
    <div class="zone-card ${state.selectedZoneId === zone.id ? "active" : ""}" data-zone-id="${zone.id}">
      <div class="zone-card-top">
        <strong>${zone.name}</strong>
        <span class="pill ${severityClass(zone.severity)}">${zone.severity}</span>
      </div>
      <div class="muted" style="margin-top:6px">Scenario: ${zone.scenario.replace(/-/g, " ")}</div>
      <div class="zone-metrics">
        <div class="mini"><div class="telemetry-label">Air</div><strong>${fmt(zone.indoor.temperature, 1, " C")}</strong></div>
        <div class="mini"><div class="telemetry-label">RH</div><strong>${fmt(zone.indoor.humidity, 0, " %")}</strong></div>
        <div class="mini"><div class="telemetry-label">Moisture</div><strong>${fmt(zone.soil.moisture, 2, "")}</strong></div>
        <div class="mini"><div class="telemetry-label">Alerts</div><strong>${zone.alerts.length}</strong></div>
      </div>
    </div>
  `).join("");

  setSlotHTML("zone-list", html);

  slotEls("zone-list").forEach((container) => container.querySelectorAll("[data-zone-id]").forEach((element) => {
    element.addEventListener("click", () => {
      state.selectedZoneId = element.dataset.zoneId;
      const zone = selectedZone();
      state.selectedAssetId = zone.assets[0]?.id || state.selectedAssetId;
      render();
    });
  }));
}

function renderOverlayToggles() {
  const html = Object.entries(overlayLabels).map(([key, label]) => `
    <div class="toggle-chip ${state.overlays[key] ? "active" : ""}" data-overlay="${key}">
      <div>
        <strong>${label}</strong>
        <div class="muted">Scene layer</div>
      </div>
      <div class="toggle-state"></div>
    </div>
  `).join("");

  setSlotHTML("overlay-toggles", html);

  slotEls("overlay-toggles").forEach((container) => container.querySelectorAll("[data-overlay]").forEach((element) => {
    element.addEventListener("click", () => {
      const key = element.dataset.overlay;
      state.overlays[key] = !state.overlays[key];
      render();
    });
  }));
}

function renderSceneBadges(zone) {
  if (!sceneBadgesEl) return;
  sceneBadgesEl.innerHTML = `
    <div class="scene-badge">
      <div class="telemetry-label">Selected Zone</div>
      <strong>${zone.name}</strong>
      <div class="muted-value">${fmt(zone.indoor.temperature, 1, " C")} air · ${fmt(zone.soil.moisture, 2, "")} root water</div>
    </div>
  `;
}

function airflowOverlay(zone) {
  if (!state.overlays.airflow) return "";
  const fanLoad = zone.actuators.fan ?? 0;
  const path = `M ${zone.x + 30} ${zone.y + 70} C ${zone.x + 110} ${zone.y + 20}, ${zone.x + 170} ${zone.y + 20}, ${zone.x + zone.width - 24} ${zone.y + 82}`;
  return `
    <path d="${path}" class="flow-pulse" fill="none" stroke="rgba(45, 111, 124, 0.74)" stroke-width="${4 + fanLoad * 8}" stroke-dasharray="8 10" stroke-linecap="round" />
    <polygon points="${zone.x + zone.width - 22},${zone.y + 82} ${zone.x + zone.width - 38},${zone.y + 74} ${zone.x + zone.width - 38},${zone.y + 90}" fill="rgba(45, 111, 124, 0.8)" />
  `;
}

function irrigationOverlay(zone) {
  if (!state.overlays.irrigation) return "";
  const irrigation = zone.actuators.irrigation ?? 0;
  return `
    <path d="M ${zone.x + 46} ${zone.y + zone.height - 78} H ${zone.x + zone.width - 42}" fill="none" stroke="rgba(45, 111, 124, 0.36)" stroke-width="10" stroke-linecap="round" />
    <path d="M ${zone.x + 46} ${zone.y + zone.height - 78} H ${zone.x + zone.width - 42}" class="flow-pulse" fill="none" stroke="rgba(71, 168, 190, 0.88)" stroke-width="${2 + irrigation * 7}" stroke-dasharray="6 12" stroke-linecap="round" />
    ${[0, 1, 2, 3].map((idx) => {
      const dx = zone.x + 72 + idx * 44;
      return `<line x1="${dx}" y1="${zone.y + zone.height - 78}" x2="${dx}" y2="${zone.y + zone.height - 28}" stroke="rgba(71, 168, 190, 0.64)" stroke-width="${1.5 + irrigation * 3}" stroke-linecap="round" />`;
    }).join("")}
  `;
}

function heatOverlay(zone) {
  if (!state.overlays.heat) return "";
  const opacity = clamp((zone.actuators.heater ?? 0) * 0.7, 0.08, 0.55);
  return `
    <rect x="${zone.x + 20}" y="${zone.y + zone.height - 46}" width="${zone.width - 40}" height="24" rx="12" class="heat-band" fill="rgba(210, 104, 52, ${opacity})" />
    <rect x="${zone.x + 34}" y="${zone.y + 78}" width="${zone.width - 68}" height="160" rx="30" fill="rgba(210, 104, 52, ${opacity * 0.42})" />
  `;
}

function humidityOverlay(zone) {
  if (!state.overlays.humidity) return "";
  const humidityAlpha = clamp((zone.indoor.humidity - 50) / 120, 0.1, 0.42);
  return `
    <ellipse class="humidity-haze" cx="${zone.x + zone.width * 0.54}" cy="${zone.y + 154}" rx="${zone.width * 0.34}" ry="84" fill="rgba(141, 207, 223, ${humidityAlpha})" />
    <ellipse class="humidity-haze" cx="${zone.x + zone.width * 0.42}" cy="${zone.y + 236}" rx="${zone.width * 0.24}" ry="66" fill="rgba(141, 207, 223, ${humidityAlpha * 0.74})" />
  `;
}

function faultOverlay(zone) {
  if (!state.overlays.faults || zone.severity === "normal") return "";
  const beaconColor = zone.severity === "critical" ? "rgba(178, 59, 59, 0.92)" : "rgba(179, 122, 20, 0.92)";
  const target = zone.assets[zone.severity === "critical" ? 3 : 1] || zone.assets[0];
  return `
    <circle class="fault-beacon" cx="${target.x + target.width - 2}" cy="${target.y - 10}" r="10" fill="${beaconColor}" />
    <line x1="${target.x + target.width - 2}" y1="${target.y - 3}" x2="${target.x + target.width - 2}" y2="${target.y + 6}" stroke="white" stroke-width="2.2" />
    <circle cx="${target.x + target.width - 2}" cy="${target.y + 11}" r="1.8" fill="white" />
  `;
}

function assetShape(asset) {
  const selected = asset.id === state.selectedAssetId ? "selected" : "";
  const fill = asset.type === "thermal"
    ? "rgba(178, 122, 20, 0.32)"
    : asset.type === "water"
      ? "rgba(45, 111, 124, 0.28)"
      : "rgba(31, 143, 58, 0.22)";

  return `
    <g class="asset-hit ${selected}" data-asset-id="${asset.id}">
      <rect x="${asset.x}" y="${asset.y}" width="${asset.width}" height="${asset.height}" rx="7" fill="${fill}" stroke="rgba(34, 67, 38, 0.22)" />
    </g>
  `;
}

function zoneBlock(zone) {
  const canopyHeight = 120 + clamp(zone.indoor.par / 12, 18, 60);
  return `
    <g>
      <rect x="${zone.x}" y="${zone.y}" width="${zone.width}" height="${zone.height}" rx="24" fill="rgba(255, 255, 255, 0.34)" stroke="rgba(56, 122, 64, 0.22)" stroke-width="2" />
      <path d="M ${zone.x + 20} ${zone.y + 46} Q ${zone.x + zone.width / 2} ${zone.y - 6} ${zone.x + zone.width - 20} ${zone.y + 46}" fill="none" stroke="rgba(56, 122, 64, 0.26)" stroke-width="4" />
      <rect x="${zone.x + 24}" y="${zone.y + zone.height - 116}" width="${zone.width - 48}" height="84" rx="18" fill="rgba(112, 169, 71, 0.22)" />
      ${[0, 1, 2, 3, 4].map((idx) => {
        const stemX = zone.x + 46 + idx * 38;
        const stemTop = zone.y + zone.height - canopyHeight - (idx % 2 ? 16 : 0);
        return `
          <path d="M ${stemX} ${zone.y + zone.height - 32} C ${stemX - 4} ${zone.y + zone.height - 74}, ${stemX + 6} ${stemTop + 26}, ${stemX} ${stemTop}" stroke="rgba(63, 125, 51, 0.74)" stroke-width="4" fill="none" />
          <ellipse cx="${stemX - 10}" cy="${stemTop + 22}" rx="16" ry="7" fill="rgba(104, 172, 73, 0.82)" />
          <ellipse cx="${stemX + 12}" cy="${stemTop + 12}" rx="16" ry="7" fill="rgba(122, 186, 84, 0.84)" />
        `;
      }).join("")}
      <rect x="${zone.x + 14}" y="${zone.y + zone.height - 28}" width="${zone.width - 28}" height="14" rx="7" fill="rgba(141, 112, 72, 0.76)" />
      <text x="${zone.x + 18}" y="${zone.y + 26}" font-size="15" font-weight="700" fill="#17311a">${zone.name}</text>
      ${humidityOverlay(zone)}
      ${heatOverlay(zone)}
      ${irrigationOverlay(zone)}
      ${airflowOverlay(zone)}
      ${faultOverlay(zone)}
      ${zone.assets.map(assetShape).join("")}
    </g>
  `;
}

function renderSchematic() {
  schematicEl.innerHTML = `
    <svg class="svg-scene" viewBox="0 0 980 640" role="img" aria-label="Greenhouse digital twin scene">
      <defs>
        <linearGradient id="glassGlow" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="rgba(255,255,255,0.72)" />
          <stop offset="100%" stop-color="rgba(255,255,255,0.12)" />
        </linearGradient>
      </defs>
      <rect x="50" y="72" width="862" height="410" rx="36" fill="url(#glassGlow)" stroke="rgba(56, 122, 64, 0.26)" stroke-width="3" />
      <rect x="74" y="92" width="816" height="370" rx="28" fill="rgba(255, 255, 255, 0.16)" stroke="rgba(56, 122, 64, 0.08)" />
      <path d="M 74 452 H 890" stroke="rgba(56, 122, 64, 0.28)" stroke-width="2" stroke-dasharray="8 12" />
      ${state.zones.map(zoneBlock).join("")}
      <rect x="110" y="510" width="720" height="64" rx="16" fill="rgba(243, 248, 239, 0.82)" stroke="rgba(95, 114, 99, 0.12)" />
      <text x="136" y="536" font-size="11" fill="#5d7560">PLANT SERVICE SPINE</text>
      <text x="136" y="560" font-size="16" font-weight="700" fill="#17311a">HVAC headers, nutrient dosing, ridge ventilation, and fault beacons remain spatially pinned to the greenhouse scene.</text>
    </svg>
  `;

  schematicEl.querySelectorAll("[data-asset-id]").forEach((element) => {
    element.addEventListener("click", () => {
      state.selectedAssetId = element.dataset.assetId;
      render();
    });
  });
}

function renderAlerts() {
  setSlotHTML("alert-list", state.alerts.slice(0, 6).map((event) => {
    const payload = event.payload || {};
    return `
      <div class="alert-card ${severityClass(payload.severity)}">
        <div class="alert-top">
          <strong>${zoneNames[payload.zoneId] || payload.zoneId || "System"}</strong>
          <span class="pill ${severityClass(payload.severity)}">${payload.severity || "normal"}</span>
        </div>
        <div class="muted" style="margin-top:6px">${new Date(event.receivedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
        <div style="margin-top:8px;font-weight:600">${payload.message || event.type}</div>
      </div>
    `;
  }).join(""));
}

function selectedZone() {
  return state.zones.find((zone) => zone.id === state.selectedZoneId) || state.zones[0];
}

function selectedAsset() {
  const zone = selectedZone();
  return zone.assets.find((asset) => asset.id === state.selectedAssetId) || zone.assets[0];
}

function renderAssetDetail() {
  const zone = selectedZone();
  const asset = selectedAsset();
  const load = asset.load ?? 0;

  setSlotHTML("asset-detail", `
    <div class="detail-card">
      <div class="alert-top">
        <strong>${asset.name}</strong>
        <span class="pill ${severityClass(zone.severity)}">${asset.type}</span>
      </div>
      <div class="muted" style="margin-top:6px">${zone.name} spatial anchor</div>
      <div class="asset-row"><span>Control load</span><strong>${fmt(load * 100, 0, " %")}</strong></div>
      <div class="asset-row"><span>Fault context</span><strong>${zone.alerts[0] || "Nominal"}</strong></div>
    </div>
  `);
}

function renderTelemetryStrip() {
  const zone = selectedZone();
  const history = state.history.length ? state.history : createFallbackData(4).history;

  const climateCards = [
    ["Air temp", fmt(zone.indoor.temperature, 1, " C"), "#1f8f3a", history.map((point) => point.temperature)],
    ["Humidity", fmt(zone.indoor.humidity, 0, " %"), "#2d6f7c", history.map((point) => point.humidity)],
    ["Moisture", fmt(zone.soil.moisture, 2, ""), "#4f9a3d", history.map((point) => point.soilMoisture)],
    ["VPD", fmt(zone.derived.vpd, 2, " kPa"), "#b37a14", history.map((point) => point.vpd)]
  ];

  const renderCards = (items) => items.map(([label, value, color, values]) => `
    <div class="telemetry-card">
      <div class="telemetry-label">${label}</div>
      <strong>${value}</strong>
      ${sparkline(values, color)}
    </div>
  `).join("");

  climateStripEl.innerHTML = renderCards(climateCards);
}

function render() {
  if (!state.zones.length) return;
  const zone = selectedZone();
  scenarioLabelEl.textContent = zone.scenario.replace(/-/g, " ");
  const statusHtml = `
    <span class="muted">Facility mode</span>
    <strong>${state.summary?.critical ? "Intervention priority" : state.summary?.warning ? "Adaptive correction" : "Nominal coordination"}</strong>
  `;
  if (sceneStatusEl) sceneStatusEl.innerHTML = statusHtml;
  if (opsStatusEl) opsStatusEl.innerHTML = statusHtml;
  renderFleetSummary();
  renderZoneList();
  renderOverlayToggles();
  renderSceneBadges(zone);
  if (currentPage === "twin") {
    renderSchematic();
  }
  renderAlerts();
  renderAssetDetail();
  if (currentPage === "operations") {
    renderTelemetryStrip();
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

  const primaryId = state.selectedZoneId;
  state.summary = summary;
  state.zones = devices.slice(0, 3).map(normalizeZone);
  state.alerts = alerts;
  state.scenario = scenario.scenario || state.scenario;

  const nextSelected = state.zones.find((zone) => zone.id === primaryId) || state.zones[0];
  state.selectedZoneId = nextSelected?.id || state.selectedZoneId;
  const currentZone = selectedZone();

  if (currentZone) {
    const history = await fetch(apiBase + "/history/" + currentZone.id).then((response) => response.json()).catch(() => []);
    state.history = history.map((point) => ({
      temperature: point.temperature ?? 0,
      humidity: point.humidity ?? 0,
      co2: point.co2 ?? 0,
      soilMoisture: point.soilMoisture ?? 0,
      irrigationFlow: point.irrigationFlow ?? 0,
      vpd: point.vpd ?? 0
    }));
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

  const zone = selectedZone();
  if (zone && !zone.assets.find((asset) => asset.id === state.selectedAssetId)) {
    state.selectedAssetId = zone.assets[0]?.id || state.selectedAssetId;
  }

  render();
}

await refresh();
setInterval(refresh, 3500);
