import { activateNavigation, applyWorkspaceChrome, resolveCurrentPage } from "./workspace-shell.js";
import {
  allTwinGateways,
  createFallbackData,
  createFallbackEdgeDevices,
  mapHistoryPoint,
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
  graphTimeLabels,
  historySlice,
  isManagedZone,
  managedAssets,
  managedZones,
  selectedEdgeDevice as getSelectedEdgeDevice,
  selectedScenarioLabel,
  selectedSensor as getSelectedSensor,
  selectedZone,
  selectedZoneLabel,
  severityClass,
  zoneDeviationSummary
} from "./workspace-helpers.js";
import {
  renderGraphWorkspacePage,
  renderMapWorkspacePage,
  renderOperationsWorkspacePage,
  renderTwinWorkspacePage
} from "./workspace-pages.js";
import { renderEdgeWorkspacePage, renderSensorWorkspacePage } from "./workspace-edge.js";

const config = window.__IOT_CONFIG__ || {};
const apiBase = config.apiBase || (window.location.origin + "/api");
const simulatorBase = config.simulatorBase || (window.location.origin + "/simulator");
const currentPage = resolveCurrentPage(window.location.pathname);

let pendingZoneId = new URLSearchParams(window.location.search).get("zone");
activateNavigation(currentPage);


const state = {
  summary: null,
  zones: [],
  alerts: [],
  history: [],
  edgeDevices: [],
  edgeAlerts: [],
  provenance: "live",
  selectedEdgeDeviceId: null,
  selectedSensorId: null,
  scenario: "baseline-day",
  graphRange: "medium",
  graphMetricGroup: "all",
  graphComparisonMode: "managed",
  selectedZoneId: "greenhouse-a-north",
  managedZoneIds: ["greenhouse-a-north"],
  selectedAssetId: "north-fans"
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
const scopeSummaryEl = document.getElementById("scope-summary");
const provenanceCardEl = document.getElementById("provenance-card");
const focusPathNoteEl = document.getElementById("focus-path-note");

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
const graphGridEl = document.getElementById("graph-grid");
const graphRangeToggleEl = document.getElementById("graph-range-toggle");
const graphMetricToggleEl = document.getElementById("graph-metric-toggle");
const graphCompareToggleEl = document.getElementById("graph-compare-toggle");
const opsSummaryEl = document.getElementById("ops-summary");
const operationsBoardEl = document.getElementById("operations-board");
const twinGatewayListEl = document.getElementById("twin-gateway-list");
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

const mapPhotoUrl = "/dev-assets/map.png";
const twinPhotoUrl = "/dev-assets/greenhouse-twin.png";

function incidentCardHtml({ timeLabel, scopeLabel, severity, message, actionHtml = "", dataAttrs = "" }) {
  const severityTone = severityClass(severity);
  return `
    <article class="event-card ${severityTone}" ${dataAttrs}>
      <div class="event-rail"></div>
      <div class="event-main">
        <div class="event-topline">
          <span class="event-time">${timeLabel}</span>
          <span class="pill ${severityTone}">${severity || "normal"}</span>
        </div>
        <strong>${scopeLabel}</strong>
        <p>${message}</p>
      </div>
      <div class="event-actions">${actionHtml}</div>
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

function assetSelectionGraphic(asset, zone) {
  const ring = Math.round((asset.load ?? 0) * 100);
  return `
    <svg class="asset-selection-graphic" viewBox="0 0 280 132" aria-hidden="true">
      <rect x="1" y="1" width="278" height="130" rx="18" fill="#111a1d" stroke="rgba(255,255,255,0.08)" />
      <rect x="24" y="28" width="232" height="76" rx="18" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.08)" stroke-dasharray="5 5"/>
      <circle cx="66" cy="66" r="26" fill="rgba(97,208,149,0.18)" stroke="rgba(97,208,149,0.35)" stroke-width="2"/>
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

function syncManagedState() {
  const zoneIds = new Set(state.zones.map((zone) => zone.id));
  state.managedZoneIds = state.managedZoneIds.filter((zoneId) => zoneIds.has(zoneId));
  if (!state.managedZoneIds.length && state.zones[0]) state.managedZoneIds = [state.zones[0].id];
  if (!zoneIds.has(state.selectedZoneId)) state.selectedZoneId = state.managedZoneIds[0] || state.zones[0]?.id || state.selectedZoneId;
  if (state.selectedZoneId && !isManagedZone(state, state.selectedZoneId)) state.managedZoneIds = [...state.managedZoneIds, state.selectedZoneId];
}

async function loadHistoryForZone(zoneId) {
  const history = await fetch(apiBase + "/history/" + zoneId).then((response) => response.json()).catch(() => []);
  state.history = history.map(mapHistoryPoint);
}

function selectAsset(assetId) {
  state.selectedAssetId = assetId;
  render();
}

function selectEdgeDevice(deviceId) {
  state.selectedEdgeDeviceId = deviceId;
  const allDevices = allTwinGateways(state);
  const device = allDevices.find((item) => item.id === deviceId);
  if (device?.zoneId) state.selectedZoneId = device.zoneId;
  render();
}

function selectSensor(sensorId) {
  state.selectedSensorId = sensorId;
  const sensor = allSensors().find((item) => item.id === sensorId);
  if (sensor?.deviceId) state.selectedEdgeDeviceId = sensor.deviceId;
  if (sensor?.zoneId) state.selectedZoneId = sensor.zoneId;
  render();
}

async function focusZone(zoneId, { ensureManaged = true, updateHistory = true } = {}) {
  state.selectedZoneId = zoneId;
  if (ensureManaged && !isManagedZone(state, zoneId)) state.managedZoneIds = [...state.managedZoneIds, zoneId];
  syncManagedState();
  const zone = selectedZone(state);
  if (zone && !managedAssets(state).find((asset) => asset.id === state.selectedAssetId)) {
    state.selectedAssetId = zone.assets[0]?.id || state.selectedAssetId;
  }
  if (updateHistory && zone?.id) await loadHistoryForZone(zone.id);
  render();
}

async function toggleManagedZone(zoneId, { updateHistory = true } = {}) {
  const currentlyManaged = isManagedZone(state, zoneId);
  if (currentlyManaged && state.managedZoneIds.length > 1 && state.selectedZoneId !== zoneId) {
    state.selectedZoneId = zoneId;
  } else if (currentlyManaged && state.managedZoneIds.length > 1) {
    state.managedZoneIds = state.managedZoneIds.filter((id) => id !== zoneId);
    if (state.selectedZoneId === zoneId) state.selectedZoneId = state.managedZoneIds[0];
  } else if (!currentlyManaged) {
    state.managedZoneIds = [...state.managedZoneIds, zoneId];
    state.selectedZoneId = zoneId;
  } else {
    state.selectedZoneId = zoneId;
  }

  syncManagedState();
  const zone = selectedZone(state);
  if (zone && !managedAssets(state).find((asset) => asset.id === state.selectedAssetId)) state.selectedAssetId = zone.assets[0]?.id || state.selectedAssetId;
  if (updateHistory && zone?.id) await loadHistoryForZone(zone.id);
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
  const assets = currentPage === "operations"
    ? (zone?.assets || []).map((asset) => ({ ...asset, zoneId: zone.id, zoneName: zone.name, zoneSeverity: zone.severity, faultContext: zone.alerts[0] || "Nominal" }))
    : managedAssets(state);
  return assets.find((asset) => asset.id === state.selectedAssetId) || assets[0] || null;
}

function renderScopeSummary() {
  const managed = managedZones(state);
  const focused = selectedZone(state);
  const critical = managed.filter((zone) => zone.severity === "critical").length;
  const warning = managed.filter((zone) => zone.severity === "warning").length;
  if (!scopeSummaryEl || !focused) return;
  scopeSummaryEl.innerHTML = `
    <article class="summary-stack-card">
      <div><span class="section-label">Managed</span><strong>${managed.length} zones</strong></div>
      <p>${managed.map((zone) => zone.name).join(" � ")}</p>
    </article>
    <article class="summary-stack-card">
      <div><span class="section-label">Focused</span><strong>${focused.name}</strong></div>
      <p>${calcZoneHealthScore(focused)} health � ${zoneDeviationSummary(focused)}</p>
    </article>
    <article class="summary-stack-card">
      <div><span class="section-label">Risk mix</span><strong>${critical} critical / ${warning} warning</strong></div>
      <p>${state.alerts.length} active incidents across the managed command picture.</p>
    </article>
  `;
}

function renderZoneList() {
  const zone = selectedZone(state);
  const listHtml = state.zones.map((item) => `
    <button type="button" class="entity-card ${item.id === zone?.id ? "active" : ""} ${isManagedZone(state, item.id) ? "managed" : ""}" data-zone-id="${item.id}">
      <div class="entity-header">
        <strong>${item.name}</strong>
        <span class="pill ${severityClass(item.severity)}">${item.severity}</span>
      </div>
      <div class="entity-meta">${calcZoneHealthScore(item)} health � ${zoneDeviationSummary(item)}</div>
      <div class="metric-chip-row">
        <span class="metric-chip"><label>Air</label><strong>${fmt(item.indoor.temperature, 1, " C")}</strong></span>
        <span class="metric-chip"><label>Root</label><strong>${fmt(item.soil.moisture, 2, "")}</strong></span>
      </div>
      <div class="entity-actions">
        <button type="button" class="scope-toggle ${isManagedZone(state, item.id) ? "active" : ""}" data-zone-manage="${item.id}">${isManagedZone(state, item.id) ? "Managed" : "Add to scope"}</button>
      </div>
    </button>
  `).join("");

  setSlotHTML("zone-list", listHtml);
  slotEls("zone-list").forEach((container) => {
    container.querySelectorAll("[data-zone-id]").forEach((element) => {
      element.addEventListener("click", async (event) => {
        if (event.target.closest("[data-zone-manage]")) return;
        await focusZone(element.dataset.zoneId, { ensureManaged: true });
      });
    });
    container.querySelectorAll("[data-zone-manage]").forEach((element) => {
      element.addEventListener("click", async (event) => {
        event.stopPropagation();
        await toggleManagedZone(element.dataset.zoneManage);
      });
    });
  });
}

function renderAssetDetail() {
  const zone = selectedZone(state);
  const asset = selectedAsset();
  const assets = currentPage === "operations"
    ? (zone?.assets || []).map((item) => ({ ...item, zoneId: zone.id, zoneName: zone.name, zoneSeverity: zone.severity, faultContext: zone.alerts[0] || "Nominal" }))
    : managedAssets(state);

  if (!zone || !asset) {
    setSlotHTML("asset-detail", incidentEmptyHtml("No asset selected."));
    return;
  }

  const datasetHtml = assets.map((candidate) => `
    <button class="asset-selector ${candidate.id === asset.id ? "active" : ""}" data-asset-id="${candidate.id}" type="button">
      <span class="asset-selector-icon" aria-hidden="true">${assetTypeIcon(candidate.type)}</span>
      <span class="asset-selector-copy">
        <strong>${candidate.name}</strong>
        <span>${candidate.zoneName} � ${candidate.type}</span>
      </span>
      <span class="asset-selector-metric">${fmt((candidate.load ?? 0) * 100, 0, " %")}</span>
    </button>
  `).join("");

  const html = `
    <article class="detail-card">
      <div class="detail-head">
        <div>
          <span class="section-label">Selected Asset</span>
          <strong>${asset.name}</strong>
        </div>
        <span class="pill ${severityClass(asset.zoneSeverity || zone.severity)}">${asset.type}</span>
      </div>
      <p class="detail-copy">${asset.zoneName || zone.name} � ${asset.metricLabel || "Control load"} � ${assetLoadBand(asset.load ?? 0)}</p>
      ${assetSelectionGraphic(asset, { name: asset.zoneName || zone.name })}
      <div class="mini-metric-grid">
        <div class="mini-metric"><span>Current load</span><strong>${fmt((asset.load ?? 0) * 100, 0, asset.metricUnit || " %")}</strong></div>
        <div class="mini-metric"><span>Fault context</span><strong>${asset.faultContext || "Nominal"}</strong></div>
        <div class="mini-metric"><span>Dataset</span><strong>${assets.length} assets</strong></div>
        <div class="mini-metric"><span>Health</span><strong>${calcZoneHealthScore(zone)}</strong></div>
      </div>
      <div class="asset-selector-list">${datasetHtml}</div>
    </article>
  `;

  setSlotHTML("asset-detail", html);
  slotEls("asset-detail").forEach((container) => {
    container.querySelectorAll("[data-asset-id]").forEach((element) => {
      element.addEventListener("click", () => {
        selectAsset(element.dataset.assetId);
      });
    });
  });
}

function renderAlerts() {
  const managedZoneIds = new Set(managedZones(state).map((zone) => zone.id));
  const scopedAlerts = currentPage === "operations"
    ? state.alerts.filter((event) => managedZoneIds.has(event.payload?.zoneId || event.payload?.deviceId || ""))
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
        actionHtml: zoneId ? `<a class="text-link" href="/graphs?zone=${encodeURIComponent(zoneId)}">Graph</a>` : "",
        dataAttrs: zoneId ? `data-alert-zone-id="${zoneId}"` : ""
      });
    }).join("");

  setSlotHTML("alert-list", `<div class="incident-list">${rows || incidentEmptyHtml("No active incidents in the current scope.")}</div>`);
  slotEls("alert-list").forEach((container) => {
    container.querySelectorAll("[data-alert-zone-id]").forEach((element) => {
      element.addEventListener("click", async (event) => {
        if (event.target.closest(".text-link")) return;
        await focusZone(element.dataset.alertZoneId, { ensureManaged: true });
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
      <article class="summary-stack-card">
        <div><span class="section-label">Source</span><strong>${provenance.label}</strong></div>
        <p>${provenance.description}</p>
      </article>
    `;
  }
}

function renderToggleGroup(root, options, activeValue, dataAttr, onSelect) {
  if (!root) return;
  root.innerHTML = options.map(([value, label]) => `
    <button type="button" class="toggle-chip ${activeValue === value ? "active" : ""}" ${dataAttr}="${value}">${label}</button>
  `).join("");
  root.querySelectorAll(`[${dataAttr}]`).forEach((element) => {
    element.addEventListener("click", () => onSelect(element.getAttribute(dataAttr)));
  });
}

function renderGraphControls() {
  renderToggleGroup(graphRangeToggleEl, [["short", "6 points"], ["medium", "12 points"], ["long", "All"]], state.graphRange, "data-graph-range", (value) => {
    state.graphRange = value;
    render();
  });
  renderToggleGroup(graphMetricToggleEl, [["all", "All metrics"], ["climate", "Climate"], ["root", "Root zone"]], state.graphMetricGroup, "data-graph-metric", (value) => {
    state.graphMetricGroup = value;
    render();
  });
  renderToggleGroup(graphCompareToggleEl, [["managed", "Managed zones"], ["focused", "Focused zone"]], state.graphComparisonMode, "data-graph-compare", (value) => {
    state.graphComparisonMode = value;
    render();
  });
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
    if (currentPage === "edge-devices") selectedZonePillEl.textContent = `Zone ${selectedEdgeDevice()?.zoneName || zone?.name || "--"}`;
    else if (currentPage === "sensors") selectedZonePillEl.textContent = `Zone ${sensor?.zoneName || zone?.name || "--"}`;
    else selectedZonePillEl.textContent = `Zone ${selectedZoneLabel(state)}`;
  }

  if (focusPathNoteEl) focusPathNoteEl.textContent = `${managedZones(state).length} managed zone${managedZones(state).length === 1 ? "" : "s"} contributing to the current command context.`;

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

function renderFleetPages() {
  if (currentPage === "edge-devices") {
    renderEdgeWorkspacePage({
      state,
      edgeFleetSummaryEl,
      edgeDeviceListEl,
      edgeSummaryEl,
      edgeSensorDetailEl,
      edgeAlertListEl,
      selectedEdgeDevice,
      render,
      zoneNames,
      incidentCardHtml,
      incidentEmptyHtml,
      selectEdgeDevice
    });
  }

  if (currentPage === "sensors") {
    renderSensorWorkspacePage({
      state,
      sensorFleetSummaryEl,
      sensorListEl,
      sensorSummaryEl,
      sensorDetailEl,
      sensorAlertListEl,
      allSensors,
      selectedSensor,
      incidentCardHtml,
      incidentEmptyHtml,
      selectSensor
    });
  }
}

function render() {
  renderClock();
  renderProvenance();
  renderScopeSummary();
  renderStatus();

  if (currentPage === "operations" || currentPage === "graphs") renderGraphControls();
  if (!["edge-devices", "sensors"].includes(currentPage)) renderZoneList();

  if (currentPage === "map") {
    renderMapWorkspacePage({
      state,
      overviewKpisEl,
      sceneBadgesEl,
      schematicEl,
      mapZonePanelEl,
      managedZones: () => managedZones(state),
      selectedZone: () => selectedZone(state),
      isManagedZone: (zoneId) => isManagedZone(state, zoneId),
      focusZone,
      mapPhotoUrl
    });
  }

  if (currentPage === "twin") {
    renderTwinWorkspacePage({
      state,
      twinZoneSummaryEl,
      twinGatewayListEl,
      zoneNetworkMapEl,
      zoneNetworkBadgesEl,
      selectedZone: () => selectedZone(state),
      allTwinGateways,
      render,
      focusZone,
      selectEdgeDevice,
      twinPhotoUrl
    });
  }

  if (currentPage === "operations") {
    renderOperationsWorkspacePage({
      state,
      opsSummaryEl,
      operationsBoardEl,
      managedZones: () => managedZones(state),
      selectedZone: () => selectedZone(state),
      incidentCardHtml
    });
  }

  if (currentPage === "graphs") {
    renderGraphWorkspacePage({
      state,
      graphGridEl,
      managedZones: () => managedZones(state),
      selectedZone: () => selectedZone(state),
      historySlice,
      graphTimeLabels,
      createFallbackData
    });
  }

  if (["map", "twin", "operations", "graphs"].includes(currentPage)) {
    renderAssetDetail();
    renderAlerts();
  }

  renderFleetPages();
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

  const primaryId = pendingZoneId || state.selectedZoneId;
  state.selectedZoneId = state.zones.find((zone) => zone.id === primaryId)?.id || state.zones[0]?.id || state.selectedZoneId;
  if (pendingZoneId) state.managedZoneIds = [pendingZoneId];
  pendingZoneId = null;
  syncManagedState();

  const zone = selectedZone(state);
  if (zone?.id) await loadHistoryForZone(zone.id);

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
  state.history = fallback.history;
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
  syncManagedState();
  const zone = selectedZone(state);
  const assets = managedAssets(state);
  if (zone && !assets.find((asset) => asset.id === state.selectedAssetId)) {
    state.selectedAssetId = assets[0]?.id || zone.assets[0]?.id || state.selectedAssetId;
  }

  render();
}

await refresh();
setInterval(refresh, 3500);
setInterval(renderClock, 1000);


