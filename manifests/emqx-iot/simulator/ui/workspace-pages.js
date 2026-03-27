import {
  calcZoneHealthScore,
  edgeSeverityClass,
  fmt,
  severityClass,
  surfaceClass,
  surfaceTextToneClass,
  textToneClass,
  zoneDeviationSummary
} from "./workspace-helpers.js";



function percent(value) {
  return Math.round((value ?? 0) * 100);
}

function severityCount(zones, level) {
  return zones.filter((zone) => zone.severity === level).length;
}

function metricCard(label, value, note, tone = "normal") {
  const surface = "light";

  return `
    <article class="kpi-card ${surfaceClass(surface)}">
      <div class="kpi-label ${surfaceTextToneClass(surface, "strong")}">${label}</div>
      <div class="kpi-value-row">
        <strong class="${surfaceTextToneClass(surface, "strong")}">${value}</strong>
        <span class="pill ${tone}">${tone}</span>
      </div>
    </article>
  `;
}


function zoneStageBadge(title, value, note, tone = "normal") {
  const surface = "dark";

  return `
    <article class="badge-card ${surfaceClass(surface)}">
      <div class="badge-card-top">
        <span class="section-label ${surfaceTextToneClass(surface, "soft")}">${title}</span>
        <span class="pill ${tone}">${tone}</span>
      </div><div class="badge-card-main">
        <strong class="badge-card-value ${surfaceTextToneClass(surface, "strong")}">${value}</strong>
        <p class="badge-card-note ${surfaceTextToneClass(surface, "muted")}">${note}</p>
      </div>
    </article>
  `;
}




function mapHotspot(zone, active) {
  return `
    <button
      type="button"
      class="map-hotspot ${surfaceClass("light")} ${active ? "active" : ""} ${severityClass(zone.severity)}"
      data-zone-hotspot="${zone.id}"
      style="left:${((zone.x + zone.width / 2) / 980 * 100).toFixed(2)}%; top:${((zone.y + zone.height / 2) / 640 * 100).toFixed(2)}%;"
      aria-pressed="${active ? "true" : "false"}"
    >
      <span class="map-hotspot-dot"></span>
      <span class="map-hotspot-copy">
        <strong class="${textToneClass("strong")}">${zone.name}</strong>
        <span class="${textToneClass("muted")}">${calcZoneHealthScore(zone)} health</span>
      </span>
    </button>
  `;
}


function renderGatewayFocus(devices, activeDevice) {
  const surface = "light";

  return `
    <div class="gateway-cluster">
      ${devices.map((device) => `
        <button
          type="button"
          class="gateway-chip ${surfaceClass(surface)} ${device.id === activeDevice.id ? "active" : ""}"
          data-gateway-hotspot="${device.id}"
        >
          <span class="pill ${edgeSeverityClass(device.status)}">${device.status}</span>
          <strong class="${surfaceTextToneClass(surface, "strong")}">${device.name}</strong>
          <span class="${surfaceTextToneClass(surface, "muted")}">${device.sensors.length} sensors</span>
        </button>
      `).join("")}
    </div>
  `;
}


export function renderMapWorkspacePage({
  state,
  overviewKpisEl,
  sceneBadgesEl,
  schematicEl,
  mapZonePanelEl,
  selectedZone,
  focusZone,
  mapPhotoUrl
}) {
  if (!state.zones.length) return;
  const zone = selectedZone();
  if (!zone) return;

  const warningCount = severityCount(state.zones, "warning");
  const criticalCount = severityCount(state.zones, "critical");
  const normalCount = Math.max(state.zones.length - warningCount - criticalCount, 0);
  const totalZones = Math.max(state.zones.length, 1);
  const normalPct = ((normalCount / totalZones) * 100).toFixed(1);
  const warningPct = ((warningCount / totalZones) * 100).toFixed(1);
  const criticalPct = ((criticalCount / totalZones) * 100).toFixed(1);
  const avgTemp = state.zones.reduce((sum, item) => sum + (item.indoor.temperature ?? 0), 0) / state.zones.length;
  const avgMoisture = state.zones.reduce((sum, item) => sum + (item.soil.moisture ?? 0), 0) / state.zones.length;

  const warningAlerts = state.alerts.filter((event) => (event.payload?.severity || "normal") === "warning").length;
  const criticalAlerts = state.alerts.filter((event) => (event.payload?.severity || "normal") === "critical").length;

  const actionableAlerts = Math.max(warningAlerts + criticalAlerts, 1);
  const warningAlertPct = ((warningAlerts / actionableAlerts) * 100).toFixed(1);
  const criticalAlertPct = ((criticalAlerts / actionableAlerts) * 100).toFixed(1);


  if (overviewKpisEl) {
    overviewKpisEl.innerHTML = `
      <section class="overview-strip">
        <article class="overview-metric">
          <span class="overview-label">Zones in warning</span>
          <strong class="overview-value">${warningCount}</strong>
          <div class="overview-severity-bar">
            <span class="normal" style="width:${normalPct}%"></span>
            <span class="warning" style="width:${warningPct}%"></span>
            <span class="critical" style="width:${criticalPct}%"></span>
          </div>
          <span class="overview-note">${normalCount} normal ? ${warningCount} warning ? ${criticalCount} critical</span>
        </article>

        <article class="overview-metric">
          <span class="overview-label">Incidents</span>
          <strong class="overview-value">${state.alerts.length}</strong>
          <div class="overview-incident-split">
            <span class="warning" style="width:${warningAlertPct}%"></span>
            <span class="critical" style="width:${criticalAlertPct}%"></span>
          </div>
          <span class="overview-note">${warningAlerts} warning · ${criticalAlerts} critical</span>
        </article>


        <article class="overview-metric">
          <span class="overview-label">Focused zone</span>
          <strong class="overview-value">${zone.name}</strong>
        </article>
      </section>
    `;
  }

  if (schematicEl) {

    schematicEl.innerHTML = `
      <div class="facility-map">
        <img class="facility-map-photo" src="${mapPhotoUrl}" alt="Greenhouse digital twin facility map" />
        <div class="facility-map-hotspots" aria-label="Greenhouse zones">
          ${state.zones.map((item) => mapHotspot(item, item.id === state.selectedZoneId)).join("")}
        </div>
      </div>
    `;

    schematicEl.querySelectorAll("[data-zone-hotspot]").forEach((element) => {
      element.addEventListener("click", async () => {
        await focusZone(element.dataset.zoneHotspot);
      });
    });
  }

  if (mapZonePanelEl) {
    mapZonePanelEl.innerHTML = `
      <article class="zone-summary-card ${surfaceClass("dark")} ${severityClass(zone.severity)}">
        <div class="zone-summary-head">
          <div>
            <h3 class="${textToneClass("strong")}">${zone.name}</h3>
          </div>
        </div>  
        <div class="mini-metric-grid">
          <div class="mini-metric ${surfaceClass("light")} mini-metric--air">
            <div class="mini-metric-copy">
              <span class="${textToneClass("soft")}">Air</span>
              <strong class="${textToneClass("strong")}">${fmt(zone.indoor.temperature, 1, " C")}</strong>
            </div>
            <span class="mini-metric-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" class="mini-metric-svg">
                <path d="M12 3v10" />
                <path d="M9 6a3 3 0 1 1 6 0v7a5 5 0 1 1-6 0V6" />
              </svg>
            </span>
          </div>    <div class="mini-metric ${surfaceClass("light")} mini-metric--humidity">
            <div class="mini-metric-copy">
              <span class="${textToneClass("soft")}">Humidity</span>
              <strong class="${textToneClass("strong")}">${fmt(zone.indoor.humidity, 0, " %")}</strong>
            </div>
            <span class="mini-metric-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" class="mini-metric-svg">
                <path d="M12 3C9 7 7 9.5 7 13a5 5 0 0 0 10 0c0-3.5-2-6-5-10Z" />
              </svg>
            </span>
          </div>    <div class="mini-metric ${surfaceClass("light")} mini-metric--root">
            <div class="mini-metric-copy">
              <span class="${textToneClass("soft")}">Root moisture</span>
              <strong class="${textToneClass("strong")}">${fmt(zone.soil.moisture, 2, "")}</strong>
            </div>
            <span class="mini-metric-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" class="mini-metric-svg">
                <path d="M12 4v8" />
                <path d="M12 12c-4 0-6 2-6 5" />
                <path d="M12 12c4 0 6 2 6 5" />
                <path d="M12 12c0 4-1 6-3 8" />
                <path d="M12 12c0 4 1 6 3 8" />
              </svg>
            </span>
          </div>    <div class="mini-metric ${surfaceClass("light")} mini-metric--irrigation">
            <div class="mini-metric-copy">
              <span class="${textToneClass("soft")}">Irrigation</span>
              <strong class="${textToneClass("strong")}">${fmt(zone.soil.irrigationFlow, 1, " L/min")}</strong>
            </div>
            <span class="mini-metric-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" class="mini-metric-svg">
                <path d="M4 13h8" />
                <path d="M12 10v6" />
                <path d="M15 8c3 2 5 4 5 7a3 3 0 0 1-6 0c0-2 1-4 1-7Z" />
              </svg>
            </span>
          </div>
  </div>
      </article>
    `;
  }
}

export function renderTwinWorkspacePage({
  state,
  twinZoneSummaryEl,
  twinGatewayListEl,
  twinZonePanelEl,
  zoneNetworkMapEl,
  zoneNetworkBadgesEl,
  selectedZone,
  allTwinGateways,
  render,
  focusZone,
  selectEdgeDevice,
  twinPhotoUrl
}) {
  if (!state.zones.length) return;
  const zone = selectedZone();
  if (!zone) return;

  const devices = allTwinGateways(state).filter((device) => device.zoneId === zone.id);
  const activeDevice = devices.find((device) => device.id === state.selectedEdgeDeviceId) || devices[0];
  if (!activeDevice) return;

  if (twinZoneSummaryEl) {
    twinZoneSummaryEl.innerHTML = `
      <section class="overview-strip">
        <article class="overview-metric">
          <span class="overview-label">Focused zone</span>
          <strong class="overview-value">${zone.name}</strong>
          <span class="overview-note">${zoneDeviationSummary(zone)}</span>
        </article>
        <article class="overview-metric">
          <span class="overview-label">Zone health</span>
          <strong class="overview-value">${calcZoneHealthScore(zone)}</strong>
          <span class="overview-note">${devices.length} gateways in this zone</span>
        </article>
        <article class="overview-metric">
          <span class="overview-label">Sensors online</span>
          <strong class="overview-value">${devices.reduce((sum, device) => sum + device.sensors.length, 0)}</strong>
          <span class="overview-note">${activeDevice.name} currently selected</span>
        </article>
      </section>
    `;
  }

  if (twinGatewayListEl) {
    twinGatewayListEl.innerHTML = devices.map((device) => `
      <button
        type="button"
        class="entity-card ${surfaceClass("light")} ${device.id === activeDevice.id ? "active" : ""} ${edgeSeverityClass(device.status)}"
        data-twin-gateway-id="${device.id}"
      >
        <div class="entity-header">
          <strong class="${textToneClass("strong")}">${device.name}</strong>
          <span class="pill ${edgeSeverityClass(device.status)}">${device.status}</span>
        </div>

        <div class="entity-meta ${surfaceTextToneClass("light", "muted")}">
          <div class="zone-health-block ${edgeSeverityClass(device.status)}">
            <div class="asset-load-meta">
              <span class="${surfaceTextToneClass("light", "soft")}">Health</span>
              <strong class="${surfaceTextToneClass("light", "strong")}">${device.healthScore ?? "--"}%</strong>
            </div>
            <div class="asset-load-bar" aria-label="Gateway health">
              <span style="width:${device.healthScore ?? 0}%"></span>
            </div>
          </div>
        </div>

      </button>
    `).join("");

    twinGatewayListEl.querySelectorAll("[data-twin-gateway-id]").forEach((element) => {
      element.addEventListener("click", () => {
        selectEdgeDevice(element.dataset.twinGatewayId);
        render();
      });
    });
  }



  if (zoneNetworkMapEl) {
    zoneNetworkMapEl.innerHTML = `
      <article class="topology-panel">
        <div class="topology-stage">
          <img class="facility-map-photo twin-photo" src="${twinPhotoUrl}" alt="Focused greenhouse twin view" />
        </div>
      </article>
    `;

    zoneNetworkMapEl.querySelectorAll("[data-gateway-hotspot]").forEach((element) => {
      element.addEventListener("click", () => {
        selectEdgeDevice(element.dataset.gatewayHotspot);
        render();
      });
    });
  }

  if (twinZonePanelEl) {
    twinZonePanelEl.innerHTML = `
      <article class="zone-summary-card ${surfaceClass("dark")} ${severityClass(zone.severity)}">
        <div class="zone-summary-head">
          <div>
            <h3 class="${textToneClass("strong", true)}">${activeDevice.name}</h3>
          </div>
        </div>

        <div class="twin-metric-grid">
          <div class="sensor-row twin-mini-metric ${surfaceClass("light")}">
            <div class="sensor-row-copy">
              <span class="${textToneClass("soft")}">Signal</span>
              <strong class="${textToneClass("strong")}">${activeDevice.signalRssi} dBm</strong>
            </div>
          </div>

          <div class="sensor-row twin-mini-metric ${surfaceClass("light")}">
            <div class="sensor-row-copy">
              <span class="${textToneClass("soft")}">Loss</span>
              <strong class="${textToneClass("strong")}">${activeDevice.packetLossPct}%</strong>
            </div>
          </div>

          <div class="sensor-row twin-mini-metric ${surfaceClass("light")}">
            <div class="sensor-row-copy">
              <span class="${textToneClass("soft")}">Sensors</span>
              <strong class="${textToneClass("strong")}">${activeDevice.sensors.length}</strong>
            </div>
          </div>
        </div>

        <div class="panel-subsection">
          <div class="asset-load-head">
            <span class="${textToneClass("soft", true)}">Sensors</span>
          </div>

          <div class="sensor-list-compact">
            ${activeDevice.sensors.map((sensor) => `
              <article class="sensor-row twin-mini-metric ${surfaceClass("light")} ${edgeSeverityClass(sensor.status)}">
                <div class="sensor-row-copy">
                  <span class="${textToneClass("soft")}">${sensor.name}</span>
                  <strong class="${textToneClass("strong")}">${sensor.lastReading || sensor.metricType || "--"}</strong>
                </div>
                <span class="pill ${edgeSeverityClass(sensor.status)}">${sensor.status}</span>
              </article>
            `).join("")}
          </div>
        </div>
      </article>
    `;
  }

}


export function renderOperationsWorkspacePage({ state, opsSummaryEl, operationsBoardEl, managedZones, selectedZone, incidentCardHtml }) {
  const focused = selectedZone();
  const totalAssets = managed.reduce((sum, zone) => sum + zone.assets.length, 0);
  const avgTemp = managed.reduce((sum, zone) => sum + (zone.indoor.temperature ?? 0), 0) / Math.max(managed.length, 1);
  const avgHumidity = managed.reduce((sum, zone) => sum + (zone.indoor.humidity ?? 0), 0) / Math.max(managed.length, 1);
  const riskQueue = [...managed].sort((left, right) => calcZoneHealthScore(left) - calcZoneHealthScore(right));

  if (opsSummaryEl) {
    opsSummaryEl.innerHTML = [
      metricCard("Managed zones", `${managed.length}`, managed.map((zone) => zone.name).join(" - "), "normal"),
      metricCard("Focused zone", focused.name, zoneDeviationSummary(focused), severityClass(focused.severity)),
      metricCard("Average climate", fmt(avgTemp, 1, " C"), `${fmt(avgHumidity, 0, " %")} RH across command scope`, "normal"),
      metricCard("Assets / alerts", `${totalAssets}`, `${state.alerts.length} active incidents in the command picture`, state.alerts.length ? "warning" : "normal")
    ].join("");
  }

  if (operationsBoardEl) {
    operationsBoardEl.innerHTML = `
      <section class="command-strip">
        <article class="command-card ${surfaceClass("light")} ${severityClass(riskQueue[0]?.severity || "normal")}">
          <span class="section-label ${textToneClass("soft")}">Highest-risk zone</span>
          <strong class="${textToneClass("strong")}">${riskQueue[0]?.name || "--"}</strong>
          <p class="${textToneClass("muted")}">
            ${riskQueue[0] ? zoneDeviationSummary(riskQueue[0]) : "No zone selected"}
          </p>
        </article>  <article class="command-card ${surfaceClass("light")} ${state.alerts.length ? "warning" : "normal"}">
          <span class="section-label ${textToneClass("soft")}">Incident queue</span>
          <strong class="${textToneClass("strong")}">${state.alerts.length}</strong>
          <p class="${textToneClass("muted")}">
            ${state.alerts.length ? "Use the evidence rail to pivot into graph and asset context." : "No active incidents in managed scope."}
          </p>
        </article>  <article class="command-card ${surfaceClass("light")} ${severityClass(focused.severity)}">
          <span class="section-label ${textToneClass("soft")}">Focused response</span>
          <strong class="${textToneClass("strong")}">${focused.name}</strong>
          <p class="${textToneClass("muted")}">
            ${focused.alerts[0] || "No explicit alarms, continue monitoring asset load and drift."}
          </p>
        </article>
      </section>
      <section class="operations-layout-grid">
        <article class="priority-board">
          <div class="panel-head-inline">
            <div>
              <span class="section-label">Priority zones</span>
              <h3>Command ranking</h3>
            </div>
            <span class="pill warning">triage</span>
          </div>
          <div class="priority-list">
            ${riskQueue.map((zone, index) => `
              <article class="priority-item ${severityClass(zone.severity)}">
                <div>
                  <span class="priority-rank">0${index + 1}</span>
                  <strong>${zone.name}</strong>
                </div>
                <div>
                  <span>${calcZoneHealthScore(zone)} health</span>
                  <span>${zoneDeviationSummary(zone)}</span>
                </div>
              </article>
            `).join("")}
          </div>
        </article>
        <article class="priority-board">
          <div class="panel-head-inline">
            <div>
              <span class="section-label">Recommended drilldowns</span>
              <h3>Subsystem pressure</h3>
            </div>
            <span class="pill ${severityClass(focused.severity)}">${focused.severity}</span>
          </div>
          <div class="asset-matrix compact-assets">
            ${focused.assets.map((asset) => `
              <article class="asset-load-card ${asset.load >= 0.8 ? "critical" : asset.load >= 0.55 ? "warning" : "normal"}">
                <div class="asset-load-head"><strong>${asset.name}</strong><span>${asset.type}</span></div>
                <div class="asset-load-bar"><span style="width:${percent(asset.load)}%"></span></div>
                <div class="asset-load-meta"><span>${asset.metricLabel}</span><strong>${percent(asset.load)}%</strong></div>
              </article>
            `).join("")}
          </div>
        </article>
      </section>
      <section class="operations-incident-preview">
        <div class="panel-head-inline">
          <div>
            <span class="section-label">Escalation preview</span>
            <h3>Recent incidents in command scope</h3>
          </div>
          <span class="pill ${state.alerts.length ? "warning" : "normal"}">${state.alerts.length} tracked</span>
        </div>
        <div class="incident-list compact-incidents">
          ${(state.alerts.slice(0, 4).map((event) => incidentCardHtml({
            timeLabel: new Date(event.receivedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            scopeLabel: event.payload?.zoneId || "system",
            severity: event.payload?.severity || "normal",
            message: event.payload?.message || event.type
          })).join("")) || "<div class=\"empty-state\">No active incidents in the managed command picture.</div>"}
        </div>
      </section>
    `;
  }
}

function trendChart(values, color) {
  const width = 360;
  const height = 124;
  const padding = 6;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 0.001);
  const points = values.map((value, index) => {
    const x = padding + (index / Math.max(values.length - 1, 1)) * (width - padding * 2);
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return `<svg class="trend-chart" viewBox="0 0 ${width} ${height}" aria-hidden="true"><polyline fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${points}" /></svg>`;
}

export function renderGraphWorkspacePage({ state, graphGridEl, managedZones, selectedZone, historySlice, graphTimeLabels, createFallbackData }) {
  if (!graphGridEl) return;
  const zone = selectedZone();
  const baseHistory = state.history.length ? state.history : createFallbackData(4).history;
  const history = historySlice(state, baseHistory);
  const [startLabel, middleLabel, endLabel] = graphTimeLabels(history);

  const metricDefinitions = [
    { key: "temperature", group: "climate", label: "Air temperature", color: "#4f9cff", suffix: " C", digits: 1, getHistory: (point) => point.temperature, getCurrent: (item) => item.indoor.temperature },
    { key: "humidity", group: "climate", label: "Humidity", color: "#39b7a8", suffix: " %", digits: 0, getHistory: (point) => point.humidity, getCurrent: (item) => item.indoor.humidity },
    { key: "soilMoisture", group: "root", label: "Soil moisture", color: "#9bbf4b", suffix: "", digits: 2, getHistory: (point) => point.soilMoisture, getCurrent: (item) => item.soil.moisture },
    { key: "irrigationFlow", group: "root", label: "Irrigation flow", color: "#d6a145", suffix: " L/min", digits: 1, getHistory: (point) => point.irrigationFlow, getCurrent: (item) => item.soil.irrigationFlow },
    { key: "vpd", group: "climate", label: "VPD", color: "#ff7f5c", suffix: " kPa", digits: 2, getHistory: (point) => point.vpd, getCurrent: (item) => item.derived.vpd }
  ];

  const visibleMetrics = state.graphMetricGroup === "all"
    ? metricDefinitions
    : metricDefinitions.filter((metric) => metric.group === state.graphMetricGroup);

  graphGridEl.innerHTML = visibleMetrics.map((metric) => {
    const values = history.map((point) => metric.getHistory(point)).filter((value) => typeof value === "number");
    const min = Math.min(...values);
    const max = Math.max(...values);

    return `
      <article class="chart-card ${surfaceClass("light")}">
        <div class="chart-head">
          <div>
            <span class="section-label ${textToneClass("soft")}">
              ${state.graphComparisonMode === "managed" ? "Managed comparison" : `Focused trend / ${zone.name}`}
            </span>
            <h3 class="${textToneClass("strong")}">${metric.label}</h3>
          </div>
          <span class="pill normal">${history.length} pts</span>
        </div>  <div class="chart-meta">
          <span class="${textToneClass("muted")}">Min ${fmt(min, metric.digits, metric.suffix)}</span>
          <span class="${textToneClass("muted")}">Max ${fmt(max, metric.digits, metric.suffix)}</span>
        </div>  ${trendChart(values, metric.color)}  <div class="chart-comparisons">
          ${state.graphComparisonMode === "managed"
            ? managed.map((item) => `
                <div class="chart-row ${surfaceClass("light")}">
                  <span class="${textToneClass("muted")}">${item.name}</span>
                  <strong class="${textToneClass("strong")}">${fmt(metric.getCurrent(item), metric.digits, metric.suffix)}</strong>
                </div>
              `).join("")
            : `<div class="chart-note ${textToneClass("muted")}">Focused on ${zone.name} while keeping incidents and asset evidence visible.</div>`}
        </div>  <div class="chart-meta time-axis">
          <span class="${textToneClass("soft")}">${startLabel}</span>
          <span class="${textToneClass("soft")}">${middleLabel}</span>
          <span class="${textToneClass("soft")}">${endLabel}</span>
        </div>
      </article>
    `;
  }).join("");
}




