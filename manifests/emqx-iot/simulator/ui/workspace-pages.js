import { calcZoneHealthScore, edgeSeverityClass, fmt, severityClass, zoneDeviationSummary } from "./workspace-helpers.js";

function percent(value) {
  return Math.round((value ?? 0) * 100);
}

function severityCount(zones, level) {
  return zones.filter((zone) => zone.severity === level).length;
}

function metricCard(label, value, note, tone = "normal") {
  return `
    <article class="kpi-card">
      <div class="kpi-label">${label}</div>
      <div class="kpi-value-row">
        <strong>${value}</strong>
        <span class="pill ${tone}">${tone === "normal" ? "stable" : tone}</span>
      </div>
      <p>${note}</p>
    </article>
  `;
}

function zoneStageBadge(title, value, note, tone = "normal") {
  return `
    <article class="badge-card">
      <span class="section-label">${title}</span>
      <strong>${value}</strong>
      <span>${note}</span>
      <span class="pill ${tone}">${tone}</span>
    </article>
  `;
}

function mapHotspot(zone, active, managed) {
  return `
    <button
      type="button"
      class="map-hotspot ${active ? "active" : ""} ${managed ? "managed" : ""} ${severityClass(zone.severity)}"
      data-zone-hotspot="${zone.id}"
      style="left:${((zone.x + zone.width / 2) / 980 * 100).toFixed(2)}%; top:${((zone.y + zone.height / 2) / 640 * 100).toFixed(2)}%;"
      aria-pressed="${active ? "true" : "false"}"
    >
      <span class="map-hotspot-dot"></span>
      <span class="map-hotspot-copy">
        <strong>${zone.name}</strong>
        <span>${calcZoneHealthScore(zone)} health</span>
      </span>
    </button>
  `;
}

function renderAssetGrid(zone) {
  return `
    <div class="asset-matrix">
      ${zone.assets.map((asset) => `
        <article class="asset-load-card ${severityClass(zone.severity)}">
          <div class="asset-load-head">
            <strong>${asset.name}</strong>
            <span>${asset.type}</span>
          </div>
          <div class="asset-load-bar"><span style="width:${percent(asset.load)}%"></span></div>
          <div class="asset-load-meta">
            <span>${asset.metricLabel}</span>
            <strong>${percent(asset.load)}%</strong>
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

function renderGatewayFocus(devices, activeDevice) {
  return `
    <div class="gateway-cluster">
      ${devices.map((device) => `
        <button type="button" class="gateway-chip ${device.id === activeDevice.id ? "active" : ""}" data-gateway-hotspot="${device.id}">
          <span class="pill ${edgeSeverityClass(device.status)}">${device.status}</span>
          <strong>${device.name}</strong>
          <span>${device.sensors.length} sensors</span>
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
  managedZones,
  selectedZone,
  isManagedZone,
  focusZone,
  mapPhotoUrl
}) {
  if (!state.zones.length) return;
  const zone = selectedZone();
  const managed = managedZones();
  const warningCount = severityCount(state.zones, "warning");
  const criticalCount = severityCount(state.zones, "critical");
  const avgTemp = state.zones.reduce((sum, item) => sum + (item.indoor.temperature ?? 0), 0) / state.zones.length;
  const avgMoisture = state.zones.reduce((sum, item) => sum + (item.soil.moisture ?? 0), 0) / state.zones.length;

  if (overviewKpisEl) {
    overviewKpisEl.innerHTML = [
      metricCard("Managed scope", `${managed.length}/${state.zones.length}`, `${managed.map((item) => item.name).join(" � ")}`, "normal"),
      metricCard("Facility heat", fmt(avgTemp, 1, " C"), `${criticalCount} critical zone${criticalCount === 1 ? "" : "s"} in command view`, criticalCount ? "critical" : warningCount ? "warning" : "normal"),
      metricCard("Root-zone posture", fmt(avgMoisture, 2, ""), `${warningCount} warning zone${warningCount === 1 ? "" : "s"} drifting from recipe`, warningCount ? "warning" : "normal"),
      metricCard("Incident pressure", `${state.alerts.length}`, zoneDeviationSummary(zone), criticalCount ? "critical" : state.alerts.length ? "warning" : "normal")
    ].join("");
  }

  if (sceneBadgesEl) {
    sceneBadgesEl.innerHTML = [
      zoneStageBadge("Focused zone", zone.name, zoneDeviationSummary(zone), severityClass(zone.severity)),
      zoneStageBadge("Managed footprint", `${managed.length} zones`, `${managed.reduce((sum, item) => sum + item.assets.length, 0)} addressable assets`, "normal"),
      zoneStageBadge("Telemetry posture", `${calcZoneHealthScore(zone)} health`, `${fmt(zone.indoor.temperature, 1, " C")} air � ${fmt(zone.derived.vpd, 2, " kPa")} VPD`, severityClass(zone.severity))
    ].join("");
  }

  if (schematicEl) {
    schematicEl.innerHTML = `
      <div class="facility-map">
        <img class="facility-map-photo" src="${mapPhotoUrl}" alt="Greenhouse digital twin facility map" />
        <div class="facility-map-hotspots" aria-label="Greenhouse zones">
          ${state.zones.map((item) => mapHotspot(item, item.id === state.selectedZoneId, isManagedZone(item.id))).join("")}
        </div>
        <div class="map-caption">
          <div>
            <span class="section-label">Facility Overview</span>
            <strong>${zone.name}</strong>
          </div>
          <span>${zoneDeviationSummary(zone)}</span>
        </div>
      </div>
    `;

    schematicEl.querySelectorAll("[data-zone-hotspot]").forEach((element) => {
      element.addEventListener("click", async () => {
        await focusZone(element.dataset.zoneHotspot, { ensureManaged: true });
      });
    });
  }

  if (mapZonePanelEl) {
    mapZonePanelEl.innerHTML = `
      <article class="zone-summary-card ${severityClass(zone.severity)}">
        <div class="zone-summary-head">
          <div>
            <span class="section-label">Selected Zone</span>
            <h3>${zone.name}</h3>
          </div>
          <span class="pill ${severityClass(zone.severity)}">${zone.severity}</span>
        </div>
        <p>${zoneDeviationSummary(zone)}</p>
        <div class="mini-metric-grid">
          <div class="mini-metric"><span>Air</span><strong>${fmt(zone.indoor.temperature, 1, " C")}</strong></div>
          <div class="mini-metric"><span>Humidity</span><strong>${fmt(zone.indoor.humidity, 0, " %")}</strong></div>
          <div class="mini-metric"><span>Root moisture</span><strong>${fmt(zone.soil.moisture, 2, "")}</strong></div>
          <div class="mini-metric"><span>Irrigation</span><strong>${fmt(zone.soil.irrigationFlow, 1, " L/min")}</strong></div>
        </div>
        ${renderAssetGrid(zone)}
      </article>
    `;
  }
}

export function renderTwinWorkspacePage({
  state,
  twinZoneSummaryEl,
  twinGatewayListEl,
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
  const devices = allTwinGateways(state).filter((device) => device.zoneId === zone.id);
  const activeDevice = devices.find((device) => device.id === state.selectedEdgeDeviceId) || devices[0];
  if (!activeDevice) return;

  if (twinZoneSummaryEl) {
    twinZoneSummaryEl.innerHTML = `
      <article class="zone-hero ${severityClass(zone.severity)}">
        <div>
          <span class="section-label">Focused Zone</span>
          <h3>${zone.name}</h3>
          <p>${zoneDeviationSummary(zone)}</p>
        </div>
        <div class="zone-hero-metrics">
          <div><span>Health</span><strong>${calcZoneHealthScore(zone)}</strong></div>
          <div><span>Gateways</span><strong>${devices.length}</strong></div>
          <div><span>Sensors</span><strong>${devices.reduce((sum, device) => sum + device.sensors.length, 0)}</strong></div>
        </div>
      </article>
    `;
  }

  if (twinGatewayListEl) {
    twinGatewayListEl.innerHTML = devices.map((device) => `
      <button type="button" class="entity-card ${device.id === activeDevice.id ? "active" : ""}" data-twin-gateway-id="${device.id}">
        <div class="entity-header">
          <strong>${device.name}</strong>
          <span class="pill ${edgeSeverityClass(device.status)}">${device.status}</span>
        </div>
        <div class="entity-meta">${device.sensors.length} sensors � ${device.brokerLink}</div>
        <div class="metric-chip-row">
          <span class="metric-chip"><label>Signal</label><strong>${device.signalRssi} dBm</strong></span>
          <span class="metric-chip"><label>Loss</label><strong>${device.packetLossPct}%</strong></span>
        </div>
      </button>
    `).join("");

    twinGatewayListEl.querySelectorAll("[data-twin-gateway-id]").forEach((element) => {
      element.addEventListener("click", () => {
        selectEdgeDevice(element.dataset.twinGatewayId);
      });
    });
  }

  if (zoneNetworkBadgesEl) {
    zoneNetworkBadgesEl.innerHTML = [
      zoneStageBadge("Gateway focus", activeDevice.name, `${activeDevice.sensors.length} downstream sensors`, edgeSeverityClass(activeDevice.status)),
      zoneStageBadge("Broker path", activeDevice.brokerLink, `Last seen ${Math.round((activeDevice.lastSeenMs ?? 0) / 1000)}s ago`, activeDevice.brokerLink === "down" ? "critical" : activeDevice.brokerLink === "unstable" ? "warning" : "normal"),
      zoneStageBadge("Actuator load", `${zone.assets.filter((asset) => asset.load >= 0.55).length} elevated`, `${zone.assets.length} control surfaces tracked`, severityClass(zone.severity))
    ].join("");
  }

  if (zoneNetworkMapEl) {
    zoneNetworkMapEl.innerHTML = `
      <article class="topology-panel">
        <div class="topology-head">
          <div>
            <span class="section-label">Zone Topology</span>
            <h3>${zone.name}</h3>
          </div>
          <span class="pill ${severityClass(zone.severity)}">${zone.severity}</span>
        </div>
        <div class="topology-stage">
          <img class="facility-map-photo twin-photo" src="${twinPhotoUrl}" alt="Focused greenhouse twin view" />
          <div class="topology-overlay">
            ${renderGatewayFocus(devices, activeDevice)}
          </div>
        </div>
        <div class="sensor-flow-grid">
          ${activeDevice.sensors.map((sensor) => `
            <article class="sensor-flow-card ${edgeSeverityClass(sensor.status)}">
              <div>
                <span class="section-label">Sensor path</span>
                <strong>${sensor.name}</strong>
              </div>
              <span>${sensor.metricType}</span>
              <div class="sensor-flow-line"></div>
              <div class="sensor-flow-meta">
                <span>${sensor.lastReading || "--"}</span>
                <span class="pill ${edgeSeverityClass(sensor.status)}">${sensor.status}</span>
              </div>
            </article>
          `).join("")}
        </div>
      </article>
    `;

    zoneNetworkMapEl.querySelectorAll("[data-gateway-hotspot]").forEach((element) => {
      element.addEventListener("click", () => {
        selectEdgeDevice(element.dataset.gatewayHotspot);
        const nextDevice = devices.find((device) => device.id === element.dataset.gatewayHotspot);
        if (nextDevice?.zoneId && nextDevice.zoneId !== state.selectedZoneId) {
          focusZone(nextDevice.zoneId, { ensureManaged: true, updateHistory: false });
        } else {
          render();
        }
      });
    });
  }
}

export function renderOperationsWorkspacePage({ state, opsSummaryEl, operationsBoardEl, managedZones, selectedZone, incidentCardHtml }) {
  const managed = managedZones();
  const focused = selectedZone();
  const totalAssets = managed.reduce((sum, zone) => sum + zone.assets.length, 0);
  const avgTemp = managed.reduce((sum, zone) => sum + (zone.indoor.temperature ?? 0), 0) / Math.max(managed.length, 1);
  const avgHumidity = managed.reduce((sum, zone) => sum + (zone.indoor.humidity ?? 0), 0) / Math.max(managed.length, 1);
  const riskQueue = [...managed].sort((left, right) => calcZoneHealthScore(left) - calcZoneHealthScore(right));

  if (opsSummaryEl) {
    opsSummaryEl.innerHTML = [
      metricCard("Managed zones", `${managed.length}`, managed.map((zone) => zone.name).join(" � "), "normal"),
      metricCard("Focused zone", focused.name, zoneDeviationSummary(focused), severityClass(focused.severity)),
      metricCard("Average climate", fmt(avgTemp, 1, " C"), `${fmt(avgHumidity, 0, " %")} RH across command scope`, "normal"),
      metricCard("Assets / alerts", `${totalAssets}`, `${state.alerts.length} active incidents in the command picture`, state.alerts.length ? "warning" : "normal")
    ].join("");
  }

  if (operationsBoardEl) {
    operationsBoardEl.innerHTML = `
      <section class="command-strip">
        <article class="command-card ${severityClass(riskQueue[0]?.severity || "normal")}">
          <span class="section-label">Highest-risk zone</span>
          <strong>${riskQueue[0]?.name || "--"}</strong>
          <p>${riskQueue[0] ? zoneDeviationSummary(riskQueue[0]) : "No zone selected"}</p>
        </article>
        <article class="command-card ${state.alerts.length ? "warning" : "normal"}">
          <span class="section-label">Incident queue</span>
          <strong>${state.alerts.length}</strong>
          <p>${state.alerts.length ? "Use the evidence rail to pivot into graph and asset context." : "No active incidents in managed scope."}</p>
        </article>
        <article class="command-card ${severityClass(focused.severity)}">
          <span class="section-label">Focused response</span>
          <strong>${focused.name}</strong>
          <p>${focused.alerts[0] || "No explicit alarms, continue monitoring asset load and drift."}</p>
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
  const managed = managedZones();
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
      <article class="chart-card">
        <div class="chart-head">
          <div>
            <span class="section-label">${state.graphComparisonMode === "managed" ? "Managed comparison" : `Focused trend / ${zone.name}`}</span>
            <h3>${metric.label}</h3>
          </div>
          <span class="pill normal">${history.length} pts</span>
        </div>
        <div class="chart-meta"><span>Min ${fmt(min, metric.digits, metric.suffix)}</span><span>Max ${fmt(max, metric.digits, metric.suffix)}</span></div>
        ${trendChart(values, metric.color)}
        <div class="chart-comparisons">
          ${state.graphComparisonMode === "managed"
            ? managed.map((item) => `<div class="chart-row"><span>${item.name}</span><strong>${fmt(metric.getCurrent(item), metric.digits, metric.suffix)}</strong></div>`).join("")
            : `<div class="chart-note">Focused on ${zone.name} while keeping incidents and asset evidence visible.</div>`}
        </div>
        <div class="chart-meta time-axis"><span>${startLabel}</span><span>${middleLabel}</span><span>${endLabel}</span></div>
      </article>
    `;
  }).join("");
}
