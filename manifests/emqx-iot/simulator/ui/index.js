import { activateNavigation, applyWorkspaceChrome, resolveCurrentPage } from "./workspace-shell.js";
import {
  allTwinGateways,
  createFallbackData,
  createFallbackEdgeDevices,
  normalizeZone,
  zoneNames
} from "./workspace-data.js";
import {
  allSensors as getAllSensors,
  assetLoadBand,
  calcZoneHealthScore,
  deriveProvenance,
  edgeSeverityClass,
  fmt,
  focusPathLabel,
  managedAssets,
  managedZones,
  selectedEdgeDevice as getSelectedEdgeDevice,
  selectedScenarioLabel,
  selectedSensor as getSelectedSensor,
  selectedZone,
  selectedZoneLabel,
  severityClass,
  surfaceClass,
  surfaceTextToneClass,
  zoneDeviationSummary
} from "./workspace-helpers.js";

import {
  renderMapWorkspacePage,
  renderOperationsCommandPriorityRail,
  renderOperationsWorkspacePage,
  renderTwinWorkspacePage
} from "./workspace-pages.js";

const config = window.__IOT_CONFIG__ || {};
const apiBase = config.apiBase || (window.location.origin + "/api");
const simulatorBase = config.simulatorBase || (window.location.origin + "/simulator");
const dbgateBase = config.dbgateBase || "http://127.0.0.1:3000";
const grafanaDashboards =
  config.grafanaDashboards ||
  [
    {
      id: "iot-observability",
      label: "Overview",
      url:
        window.location.origin +
        "/grafana/d/iot-observability/iot-observability?orgId=1&kiosk&from=now-6h&to=now",
    },
  ];

const defaultGrafanaDashboard =
  grafanaDashboards.find((dashboard) => dashboard.url === config.grafanaDashboardUrl) ||
  grafanaDashboards[0] ||
  {
    id: "iot-observability",
    label: "Overview",
    url:
      config.grafanaDashboardUrl ||
      (window.location.origin + "/grafana/d/iot-observability/iot-observability?orgId=1&kiosk&from=now-6h&to=now"),
  };

const GRAFANA_DASHBOARD_STORAGE_KEY = "iot-selected-grafana-dashboard";

const currentPage = resolveCurrentPage(window.location.pathname);

let pendingZoneId = new URLSearchParams(window.location.search).get("zone");
const ZONE_STORAGE_KEY = "iot-selected-zone-id";

function loadPersistedZoneId() {
  try {
    return window.localStorage.getItem(ZONE_STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

function persistSelectedZoneId(zoneId) {
  if (!zoneId) return;
  try {
    window.localStorage.setItem(ZONE_STORAGE_KEY, zoneId);
  } catch {}
}

const persistedZoneId = loadPersistedZoneId();
activateNavigation(currentPage);

function loadPersistedGrafanaDashboardId() {
  try {
    return window.localStorage.getItem(GRAFANA_DASHBOARD_STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

function persistGrafanaDashboardId(dashboardId) {
  if (!dashboardId) return;
  try {
    window.localStorage.setItem(GRAFANA_DASHBOARD_STORAGE_KEY, dashboardId);
  } catch {}
}

function selectedGrafanaDashboard() {
  return (
    grafanaDashboards.find((dashboard) => dashboard.id === state.selectedGrafanaDashboardId) ||
    defaultGrafanaDashboard
  );
}

function updateGrafanaFrame() {
  if (!grafanaFrameEl) return;
  const dashboard = selectedGrafanaDashboard();
  if (dashboard?.url) {
    grafanaFrameEl.src = dashboard.url;
  }
}


const state = {
  summary: null,
  zones: [],
  alerts: [],
  edgeDevices: [],
  edgeAlerts: [],
  provenance: "live",
  selectedEdgeDeviceId: null,
  selectedSensorId: null,
  scenario: "baseline-day",
  selectedZoneId: pendingZoneId || persistedZoneId || "greenhouse-a-north",
  selectedAssetId: "north-fans",
  selectedGrafanaDashboardId: loadPersistedGrafanaDashboardId() || defaultGrafanaDashboard.id
};

const selectedEdgeDevice = () => getSelectedEdgeDevice(state);
const allSensors = () => getAllSensors(state);
const selectedSensor = () => getSelectedSensor(state);

function slotEls(name) {
  return [...document.querySelectorAll(`[data-slot="${name}"]`)];
}

function setSlotHTML(name, html) {
  slotEls(name).forEach((element) => {
    element.innerHTML = html;
  });
}

const brokerPillEl = document.getElementById("broker-pill");
const databasePillEl = document.getElementById("database-pill");
const scenarioPillEl = document.getElementById("scenario-pill");
const selectedZonePillEl = document.getElementById("selected-zone-pill");
const provenancePillEl = document.getElementById("provenance-pill");
const timePillEl = document.getElementById("time-pill");
const provenanceCardEl = document.getElementById("provenance-card");

const workspaceEyebrowEl = document.getElementById("workspace-eyebrow");
const workspaceTitleEl = document.getElementById("workspace-title");
const workspaceCopyEl = document.getElementById("workspace-copy");
const workspaceModeLabelEl = document.getElementById("workspace-mode-label");
const workspacePillarLabelEl = document.getElementById("workspace-pillar-label");
const workspaceFocusLabelEl = document.getElementById("workspace-focus-label");
const workspaceFocusPathEl = document.getElementById("workspace-focus-path");
const scopeEyebrowEl = document.getElementById("scope-eyebrow");
const scopeTitleEl = document.getElementById("scope-title");
const scopeCopyEl = document.getElementById("scope-copy");
const contextEyebrowEl = document.getElementById("context-eyebrow");
const contextTitleEl = document.getElementById("context-title");
const contextCopyEl = document.getElementById("context-copy");

const overviewKpisEl = document.getElementById("overview-kpis");
const sceneBadgesEl = document.getElementById("scene-badges");
const schematicEl = document.getElementById("schematic");
const mapZonePanelEl = document.getElementById("map-zone-panel");
const twinZoneSummaryEl = document.getElementById("twin-zone-summary");
const zoneNetworkMapEl = document.getElementById("zone-network-map");
const zoneNetworkBadgesEl = document.getElementById("zone-network-badges");
const opsSummaryEl = document.getElementById("ops-summary");
const operationsBoardEl = document.getElementById("operations-board");
const twinGatewayListEl = document.getElementById("twin-gateway-list");
const dbgateFrameEl = document.getElementById("dbgate-frame");
const grafanaFrameEl = document.getElementById("grafana-frame");

const mapPhotoUrl = "/dev-assets/map.png";
const twinPhotoUrl = "/dev-assets/greenhouse-twin.png";

const twinZonePanelEl = document.getElementById("twin-zone-panel");
const commandPriorityRailEls = () => slotEls("command-priority-rail");

const grafanaDashboardTriggerEl = document.getElementById("grafana-dashboard-trigger");
const grafanaDashboardTriggerLabelEl = document.getElementById("grafana-dashboard-trigger-label");
const grafanaDashboardMenuEl = document.getElementById("grafana-dashboard-menu");

if (currentPage === "dbgate" && dbgateFrameEl) {
  dbgateFrameEl.src = dbgateBase;
}

function closeGrafanaDashboardMenu() {
  if (!grafanaDashboardMenuEl || !grafanaDashboardTriggerEl) return;
  grafanaDashboardMenuEl.hidden = true;
  grafanaDashboardTriggerEl.setAttribute("aria-expanded", "false");
}

function openGrafanaDashboardMenu() {
  if (!grafanaDashboardMenuEl || !grafanaDashboardTriggerEl) return;
  grafanaDashboardMenuEl.hidden = false;
  grafanaDashboardTriggerEl.setAttribute("aria-expanded", "true");
}

function renderGrafanaDashboardMenu() {
  if (!grafanaDashboardMenuEl || !grafanaDashboardTriggerLabelEl) return;

  const selected = selectedGrafanaDashboard();
  grafanaDashboardTriggerLabelEl.textContent = selected.label;

  grafanaDashboardMenuEl.innerHTML = grafanaDashboards
    .map((dashboard) => {
      const active = dashboard.id === selected.id ? "active" : "";
      const selectedAttr = dashboard.id === selected.id ? "true" : "false";
      return `
        <button
          type="button"
          class="observability-selector-option ${active}"
          data-dashboard-id="${dashboard.id}"
          role="option"
          aria-selected="${selectedAttr}"
        >
          ${dashboard.label}
        </button>
      `;
    })
    .join("");

  grafanaDashboardMenuEl.querySelectorAll("[data-dashboard-id]").forEach((element) => {
    element.addEventListener("click", () => {
      state.selectedGrafanaDashboardId = element.dataset.dashboardId;
      persistGrafanaDashboardId(state.selectedGrafanaDashboardId);
      renderGrafanaDashboardMenu();
      updateGrafanaFrame();
      closeGrafanaDashboardMenu();
    });
  });
}

if (grafanaDashboardTriggerEl && grafanaDashboardMenuEl) {
  renderGrafanaDashboardMenu();
  closeGrafanaDashboardMenu();

  grafanaDashboardTriggerEl.addEventListener("click", () => {
    const isOpen = !grafanaDashboardMenuEl.hidden;
    if (isOpen) {
      closeGrafanaDashboardMenu();
    } else {
      openGrafanaDashboardMenu();
    }
  });

  document.addEventListener("click", (event) => {
    if (
      grafanaDashboardMenuEl.hidden ||
      grafanaDashboardMenuEl.contains(event.target) ||
      grafanaDashboardTriggerEl.contains(event.target)
    ) {
      return;
    }
    closeGrafanaDashboardMenu();
  });
}



if (currentPage === "observability" && grafanaFrameEl) {
  updateGrafanaFrame();
}

function renderMetrics() {
  return [
    "# HELP iot_simulator_publish_success_total Total successful MQTT publishes",
    "# TYPE iot_simulator_publish_success_total counter",
    `iot_simulator_publish_success_total ${publishSuccessTotal}`,

    "# HELP iot_simulator_publish_failure_total Total failed MQTT publishes",
    "# TYPE iot_simulator_publish_failure_total counter",
    `iot_simulator_publish_failure_total ${publishFailureTotal}`,

    "# HELP iot_simulator_scenario_changes_total Total scenario changes",
    "# TYPE iot_simulator_scenario_changes_total counter",
    `iot_simulator_scenario_changes_total ${scenarioChangesTotal}`,

    "# HELP iot_simulator_loop_last_started_at_ms Last loop start timestamp in ms",
    "# TYPE iot_simulator_loop_last_started_at_ms gauge",
    `iot_simulator_loop_last_started_at_ms ${lastLoopStartedAt}`,
  ].join("\n");
}

function incidentCardHtml({ timeLabel, scopeLabel, severity, message, actionHtml = "", dataAttrs = "" }) {
  const severityTone = severityClass(severity);
  const surface = "light";

  return `
    <article class="event-card ${surfaceClass(surface)} ${severityTone}" ${dataAttrs}>
      <div class="event-rail"></div>
      <div class="event-main">
        <div class="event-topline">
          <strong class="${surfaceTextToneClass(surface, "strong")}">${scopeLabel}</strong>
          <span class="event-time ${surfaceTextToneClass(surface, "soft")}">${timeLabel}</span>
        </div>
        <p class="${surfaceTextToneClass(surface, "muted")}">${message}</p>
      </div>
    </article>
  `;
}


function incidentEmptyHtml(message) {
  return `<div class="empty-state">${message}</div>`;
}

function assetTypeIcon(type) {
  const common = 'viewBox="0 0 48 48" aria-hidden="true"';
  if (type === "air handling") return `<svg class="asset-icon-svg" ${common}><circle cx="24" cy="24" r="16" fill="rgba(97,208,149,0.12)" stroke="currentColor" stroke-width="2"/><circle cx="24" cy="24" r="4" fill="currentColor"/><path d="M24 10c5 0 9 4 9 9-5 1-9-2-9-7v-2Z" fill="currentColor"/><path d="M36 24c0 5-4 9-9 9-1-5 2-9 7-9h2Z" fill="currentColor"/><path d="M24 38c-5 0-9-4-9-9 5-1 9 2 9 7v2Z" fill="currentColor"/><path d="M12 24c0-5 4-9 9-9 1 5-2 9-7 9h-2Z" fill="currentColor"/></svg>`;
  if (type === "ventilation") return `<svg class="asset-icon-svg" ${common}><rect x="8" y="12" width="32" height="24" rx="8" fill="rgba(97,208,149,0.12)" stroke="currentColor" stroke-width="2"/><path d="M14 24h11" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><path d="M21 18l7 6-7 6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  if (type === "thermal") return `<svg class="asset-icon-svg" ${common}><rect x="18" y="10" width="12" height="20" rx="6" fill="rgba(97,208,149,0.12)" stroke="currentColor" stroke-width="2"/><circle cx="24" cy="35" r="7" fill="rgba(97,208,149,0.12)" stroke="currentColor" stroke-width="2"/><path d="M24 16v14" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>`;
  if (type === "water") return `<svg class="asset-icon-svg" ${common}><path d="M24 10c6 8 10 13 10 18a10 10 0 1 1-20 0c0-5 4-10 10-18Z" fill="rgba(97,208,149,0.12)" stroke="currentColor" stroke-width="2"/></svg>`;
  if (type === "lighting") return `<svg class="asset-icon-svg" ${common}><path d="M24 10c6 0 10 4 10 10 0 4-2 7-5 9-2 2-3 3-3 5h-4c0-2-1-3-3-5-3-2-5-5-5-9 0-6 4-10 10-10Z" fill="rgba(97,208,149,0.12)" stroke="currentColor" stroke-width="2"/></svg>`;
  return `<svg class="asset-icon-svg" ${common}><circle cx="24" cy="24" r="14" fill="rgba(97,208,149,0.12)" stroke="currentColor" stroke-width="2"/></svg>`;
}

function circularLoadGauge(load, tone = "currentColor", track = "rgba(255,255,255,0.12)") {
  const safeLoad = Math.max(0, Math.min(load ?? 0, 1));
  const percent = Math.round(safeLoad * 100);

  return `
    <span class="asset-gauge-body">
      <svg width="54" height="54" viewBox="0 0 54 54" fill="none" aria-hidden="true">
        <circle
          cx="27"
          cy="27"
          r="18"
          stroke="${track}"
          stroke-width="6"
          pathLength="100"
        />
        <circle
          cx="27"
          cy="27"
          r="18"
          stroke="${tone}"
          stroke-width="6"
          stroke-linecap="round"
          pathLength="100"
          stroke-dasharray="${percent} 100"
          transform="rotate(-90 27 27)"
        />
      </svg>
      <strong class="asset-gauge-value" style="color:${tone}">${percent}%</strong>
    </span>
  `;
}

function assetSelectionGraphic(asset, zone) {
  const ring = Math.round((asset.load ?? 0) * 100);
  return `
    <svg class="asset-selection-graphic" viewBox="0 0 280 132" aria-hidden="true">
      <rect x="1" y="1" width="278" height="130" rx="18" fill="#111a1d" stroke="rgba(255,255,255,0.08)" />
      <rect x="24" y="28" width="232" height="76" rx="18" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.08)" stroke-dasharray="5 5"/>
      <circle cx="66" cy="66" r="26" fill="rgba(97,208,149,0.30)" stroke="rgba(97,208,149,0.35)" stroke-width="2"/>
      <foreignObject x="42" y="42" width="48" height="48">${assetTypeIcon(asset.type)}</foreignObject>
      <g transform="translate(144 66)">
        <circle cx="0" cy="0" r="18" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="6"/>
        <circle cx="0" cy="0" r="18" fill="none" stroke="#61d095" stroke-width="6" stroke-linecap="round" stroke-dasharray="${ring} 100" pathLength="100" transform="rotate(-90)"/>
        <text x="0" y="4" text-anchor="middle" fill="#f4f7f8" font-size="11" font-weight="800">${ring}%</text>
      </g>
      <text x="240" y="45" text-anchor="end" fill="#95a6ae" font-size="10" font-weight="700" letter-spacing="1.4">SELECTED</text>
      <text x="240" y="66" text-anchor="end" fill="#f4f7f8" font-size="15" font-weight="800">${zone.name}</text>
      <text x="240" y="86" text-anchor="end" fill="#95a6ae" font-size="11">${asset.metricLabel || "Control load"}</text>
    </svg>`;
}


function selectAsset(assetId) {
  state.selectedAssetId = assetId;
  render();
}

function selectEdgeDevice(deviceId) {
  state.selectedEdgeDeviceId = deviceId;
  const allDevices = allTwinGateways(state);
  const device = allDevices.find((item) => item.id === deviceId);
  if (device?.zoneId) {
    state.selectedZoneId = device.zoneId;
    persistSelectedZoneId(device.zoneId);
  }
  render();
}

function selectSensor(sensorId) {
  state.selectedSensorId = sensorId;
  const sensor = allSensors().find((item) => item.id === sensorId);
  if (sensor?.deviceId) state.selectedEdgeDeviceId = sensor.deviceId;
  if (sensor?.zoneId) {
    state.selectedZoneId = sensor.zoneId;
    persistSelectedZoneId(sensor.zoneId);
  }
  render();
}

function focusZone(zoneId) {
  state.selectedZoneId = zoneId;
  persistSelectedZoneId(zoneId);

  const zone = selectedZone(state);
  if (zone && !(zone.assets || []).find((asset) => asset.id === state.selectedAssetId)) {
    state.selectedAssetId = zone.assets[0]?.id || state.selectedAssetId;
  }

  render();
}

function loadEdgeFallback(tick) {
  state.edgeDevices = createFallbackEdgeDevices(tick);
  state.edgeAlerts = state.edgeDevices.flatMap((device) => {
    if (device.status === "healthy") return [];
    return [{
      receivedAt: new Date().toISOString(),
      payload: {
        severity: device.status === "offline" ? "critical" : "warning",
        message: device.status === "offline" ? `${device.name} heartbeat lost` : `${device.name} sensor freshness degraded`,
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

function selectedAsset() {
  const zone = selectedZone(state);
  const assets = zone?.assets || [];
  return assets.find((asset) => asset.id === state.selectedAssetId) || assets[0] || null;
}


function renderZoneList() {
  const zone = selectedZone(state);

  const listHtml = state.zones.map((item) => {
    const health = calcZoneHealthScore(item);
    const tone = severityClass(item.severity);
    const surface = "light";

    return `
      <button
        type="button"
        class="entity-card ${surfaceClass(surface)} ${item.id === zone?.id ? "active" : ""}"
        data-zone-id="${item.id}"
      >
        <div class="entity-header">
          <strong class="${surfaceTextToneClass(surface, "strong")}">${item.name}</strong>
          <span class="pill ${tone}">${item.severity}</span>
        </div>

        <div class="entity-meta ${surfaceTextToneClass(surface, "muted")}">
          <div class="zone-health-block ${tone}">
            <div class="asset-load-meta">
              <span class="${surfaceTextToneClass(surface, "soft")}">Health</span>
              <strong class="${surfaceTextToneClass(surface, "strong")}">${health}%</strong>
            </div>
            <div class="asset-load-bar">
              <span style="width:${health}%"></span>
            </div>
          </div>
        </div>
      </button>
    `;

  }).join("");

  setSlotHTML("zone-list", listHtml);
  slotEls("zone-list").forEach((container) => {
    container.querySelectorAll("[data-zone-id]").forEach((element) => {
      element.addEventListener("click", () => {
        focusZone(element.dataset.zoneId);
      });
    });
  });
}


function renderAssetDetail() {
  const zone = selectedZone(state);
  const assets = zone?.assets || [];

  if (!zone || !assets.length) {
    setSlotHTML("asset-detail", incidentEmptyHtml("No assets available."));
    return;
  }

  const html = `
    <div class="entity-list">
      ${assets.map((asset) => {
        const load = asset.load ?? 0;
        const tone =
          load >= 0.8 ? "critical" :
          load >= 0.55 ? "warning" :
          "normal";

        return `
          <article class="entity-card ${surfaceClass("light")} ${tone}">
            <div class="asset-overview-grid">
              <strong class="asset-overview-name ${surfaceTextToneClass("dark", "strong")}">${asset.name}</strong>

              <div class="asset-overview-icon">
                <span class="asset-type-badge asset-type-badge-xl ${tone}" aria-label="${asset.type}">
                  ${assetTypeIcon(asset.type)}
                </span>
              </div>

              <div class="asset-overview-gauge">
                <span class="asset-load-ring ${tone}" aria-label="Current asset load">
                  ${circularLoadGauge(
                    load,
                    tone === "critical" ? "rgba(214,127,127,1)" :
                    tone === "warning" ? "rgba(217,161,79,1)" :
                    "rgba(97,208,149,1)",
                    "rgba(255,255,255,0.2)"
                  )}
                </span>
              </div>
            </div>
          </article>
        `;

      }).join("")}
    </div>
  `;

  setSlotHTML("asset-detail", html);
}




function renderAlerts() {
  const scopedAlerts = currentPage === "operations"
    ? state.alerts.filter((event) => (event.payload?.zoneId || event.payload?.deviceId || "") === state.selectedZoneId)
    : state.alerts;

  const rows = [...scopedAlerts]
    .sort((left, right) => new Date(right.receivedAt).getTime() - new Date(left.receivedAt).getTime())
    .slice(0, 12)
    .map((event) => {
      const zoneId = event.payload?.zoneId || event.payload?.deviceId || "";
      return incidentCardHtml({
        timeLabel: new Date(event.receivedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        scopeLabel: zoneNames[zoneId] || zoneId || "System",
        severity: event.payload?.severity || "normal",
        message: event.payload?.message || event.type,
        actionHtml: "",
        dataAttrs: zoneId ? `data-alert-zone-id="${zoneId}"` : ""
      });
    }).join("");

  setSlotHTML("alert-list", `<div class="incident-list">${rows || incidentEmptyHtml("No active incidents in the current scope.")}</div>`);
  slotEls("alert-list").forEach((container) => {
    container.querySelectorAll("[data-alert-zone-id]").forEach((element) => {
      element.addEventListener("click", (event) => {
        if (event.target.closest(".text-link")) return;
        focusZone(element.dataset.alertZoneId);
      });
    });
  });
}

function renderProvenance() {
  const provenance = deriveProvenance(state);
  if (provenancePillEl) {
    provenancePillEl.className = `pill ${provenance.tone}`;
    provenancePillEl.textContent = provenance.label;
  }
  if (provenanceCardEl) {
    provenanceCardEl.innerHTML = `
      <article class="provenance-summary-card surface-dark">
        <div class="provenance-card-head">
          <span class="section-label surface-text-soft">Source</span>
          <strong class="provenance-card-value surface-text-strong">${provenance.label}</strong>
        </div>
        <p class="provenance-card-detail surface-text-muted">${provenance.description}</p>
      </article>
    `;
  }
}

function renderClock() {
  if (!timePillEl) return;
  timePillEl.textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function renderStatus() {
  if (scenarioPillEl) scenarioPillEl.textContent = `Scenario ${selectedScenarioLabel(state)}`;

  const zone = selectedZone(state);
  const twinDevice = allTwinGateways(state).find((device) => device.id === state.selectedEdgeDeviceId) || allTwinGateways(state)[0] || null;
  const sensor = selectedSensor();
  const activeAsset = selectedAsset();
  const focusPath = focusPathLabel({ currentPage, zone, edgeDevice: twinDevice, sensor, asset: activeAsset });

  if (selectedZonePillEl) {
    selectedZonePillEl.textContent = `Zone ${selectedZoneLabel(state)}`;
  }

  applyWorkspaceChrome({
    currentPage,
    elements: {
      workspaceEyebrowEl,
      workspaceTitleEl,
      workspaceCopyEl,
      workspaceModeLabelEl,
      workspacePillarLabelEl,
      workspaceFocusLabelEl,
      workspaceFocusPathEl,
      scopeEyebrowEl,
      scopeTitleEl,
      scopeCopyEl,
      contextEyebrowEl,
      contextTitleEl,
      contextCopyEl
    },
    selectedZoneName: zone?.name || "--",
    selectedEdgeDeviceName: twinDevice?.name || "--",
    selectedSensorName: sensor?.name || "--",
    focusPath
  });
}


function render() {
  renderClock();
  renderProvenance();
  renderStatus();

  if (currentPage !== "operations") renderZoneList();

  if (currentPage === "map") {
    renderMapWorkspacePage({
      state,
      overviewKpisEl,
      sceneBadgesEl,
      schematicEl,
      mapZonePanelEl,
      selectedZone: () => selectedZone(state),
      focusZone,
      mapPhotoUrl
    });
  }

  renderTwinWorkspacePage({
    state,
    twinZoneSummaryEl,
    twinGatewayListEl,
    twinZonePanelEl,
    zoneNetworkMapEl,
    zoneNetworkBadgesEl,
    selectedZone: () => selectedZone(state),
    allTwinGateways,
    render,
    focusZone,
    selectEdgeDevice,
    twinPhotoUrl
  });

  if (currentPage === "operations") {
    commandPriorityRailEls().forEach((element) => {
      renderOperationsCommandPriorityRail({
        state,
        railEl: element,
        managedZones: () => managedZones(state)
      });
    });

    renderOperationsWorkspacePage({
      state,
      opsSummaryEl,
      operationsBoardEl,
      managedZones: () => managedZones(state),
      selectedZone: () => selectedZone(state),
      incidentCardHtml
    });
  }


  if (["map", "twin", "operations"].includes(currentPage)) {
    renderAssetDetail();
    renderAlerts();
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

  state.summary = summary;
  state.zones = devices.map((zone, index) => normalizeZone(zone, scenario.scenario || state.scenario, index));
  state.alerts = alerts;
  state.scenario = scenario.scenario || state.scenario;
  state.provenance = "live";

  const primaryId = pendingZoneId || loadPersistedZoneId() || state.selectedZoneId;
  state.selectedZoneId = state.zones.find((zone) => zone.id === primaryId)?.id || state.zones[0]?.id || state.selectedZoneId;
  persistSelectedZoneId(state.selectedZoneId);
  pendingZoneId = null;


  brokerPillEl.className = `pill ${health.mqttConnected ? "normal" : "critical"}`;
  brokerPillEl.textContent = health.mqttConnected ? "Broker linked" : "Broker lost";
  databasePillEl.className = `pill ${health.dbConnected ? "normal" : "critical"}`;
  databasePillEl.textContent = health.dbConnected ? "DB linked" : "DB lost";
}

function loadFallback(tick) {
  const fallback = createFallbackData(tick);
  state.summary = fallback.summary;
  state.zones = fallback.devices.map((zone, index) => normalizeZone(zone, fallback.scenario, index));
  state.alerts = fallback.alerts;
  state.scenario = fallback.scenario;
  state.provenance = "synthetic";
  brokerPillEl.className = "pill warning";
  brokerPillEl.textContent = "Synthetic stream";
  databasePillEl.className = "pill warning";
  databasePillEl.textContent = "DB unavailable";
}

let fallbackTick = 0;

async function refresh() {
  try {
    await loadLiveData();
  } catch (error) {
    fallbackTick += 1;
    loadFallback(fallbackTick);
  }

  fallbackTick += 1;
  loadEdgeFallback(fallbackTick);

  if (!selectedZone(state)) state.selectedZoneId = state.zones[0]?.id || state.selectedZoneId;
  persistSelectedZoneId(state.selectedZoneId);
  const zone = selectedZone(state);
  const assets = zone?.assets || [];
  if (zone && !assets.find((asset) => asset.id === state.selectedAssetId)) {
    state.selectedAssetId = assets[0]?.id || zone.assets[0]?.id || state.selectedAssetId;
  }

  render();
}

await refresh();
setInterval(refresh, 3500);
setInterval(renderClock, 1000);

























