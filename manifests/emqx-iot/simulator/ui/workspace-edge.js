import { edgeSeverityClass, surfaceClass, surfaceTextToneClass } from "./workspace-helpers.js";

function fleetSummaryCard(label, value, note, tone) {
  const surface = "light";

  return `
    <article class="kpi-card ${surfaceClass(surface)}">
      <div class="kpi-label ${surfaceTextToneClass(surface, "soft")}">${label}</div>
      <div class="kpi-value-row">
        <strong class="${surfaceTextToneClass(surface, "strong")}">${value}</strong>
        <span class="pill ${tone}">${tone}</span>
      </div>
      <p class="${surfaceTextToneClass(surface, "muted")}">${note}</p>
    </article>
  `;
}



function renderGatewayTopology(device) {
  const count = Math.max(device.sensors.length, 1);
  const nodes = device.sensors.map((sensor, index) => {
    const x = 188 + (index * (158 / Math.max(count - 1, 1)));
    const y = count === 1 ? 82 : 42 + (index % 2) * 80;
    const tone = sensor.status === "offline" ? "#ff6d6d" : sensor.status === "stale" || sensor.status === "degraded" ? "#ffc164" : "#61d095";
    return `
      <line x1="116" y1="82" x2="${x}" y2="${y}" stroke="${tone}" stroke-opacity="0.7" stroke-width="2.5" stroke-dasharray="${sensor.status === "offline" ? "5 5" : "none"}" />
      <circle cx="${x}" cy="${y}" r="16" fill="#0d1618" stroke="${tone}" stroke-width="2.5" />
      <text x="${x}" y="${y + 30}" text-anchor="middle" fill="#d4dde2" font-size="9.5" font-weight="700">${sensor.name}</text>
    `;
  }).join("");
  const tone = device.status === "offline" ? "#ff6d6d" : device.status === "degraded" ? "#ffc164" : "#61d095";

  return `
    <svg class="edge-topology-svg" viewBox="0 0 380 164" role="img" aria-label="Gateway connected to downstream sensors">
      <rect x="16" y="22" width="102" height="120" rx="20" fill="#111a1d" stroke="${tone}" stroke-width="2.5" />
      <rect x="36" y="44" width="60" height="44" rx="12" fill="rgba(255,255,255,0.03)" stroke="${tone}" stroke-width="2" />
      <text x="67" y="120" text-anchor="middle" fill="#f4f7f8" font-size="11" font-weight="800">Gateway</text>
      <text x="67" y="136" text-anchor="middle" fill="#95a6ae" font-size="9.5">${device.zoneName}</text>
      ${nodes}
    </svg>
  `;
}

export function renderEdgeWorkspacePage({
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
}) {
  const offline = state.edgeDevices.filter((device) => device.status === "offline").length;
  const degraded = state.edgeDevices.filter((device) => device.status === "degraded").length;

  if (edgeFleetSummaryEl) {
    edgeFleetSummaryEl.innerHTML = [
      fleetSummaryCard("Gateways", `${state.edgeDevices.length}`, `${offline} offline - ${degraded} degraded`, offline ? "critical" : degraded ? "warning" : "normal"),
      fleetSummaryCard("Broker path", `${state.edgeDevices.filter((device) => device.brokerLink === "linked").length}`, `${state.edgeDevices.length} total tracked`, degraded ? "warning" : "normal")
    ].join("");
  }

  if (edgeDeviceListEl) {
    const surface = "light";

    edgeDeviceListEl.innerHTML = state.edgeDevices.map((device) => `
      <button
        type="button"
        class="entity-card ${surfaceClass(surface)} ${state.selectedEdgeDeviceId === device.id ? "active" : ""}"
        data-edge-device-id="${device.id}"
      >
        <div class="entity-header">
          <strong class="${surfaceTextToneClass(surface, "strong")}">${device.name}</strong>
          <span class="pill ${edgeSeverityClass(device.status)}">${device.status}</span>
        </div>

        <div class="entity-meta ${surfaceTextToneClass(surface, "muted")}">
          ${device.zoneName} · ${device.sensors.length} sensors · ${Math.round(device.lastSeenMs / 1000)}s ago
        </div>

        <div class="metric-chip-row">
          <span class="metric-chip ${surfaceClass(surface)}">
            <label class="${surfaceTextToneClass(surface, "soft")}">RSSI</label>
            <strong class="${surfaceTextToneClass(surface, "strong")}">${device.signalRssi} dBm</strong>
          </span>
          <span class="metric-chip ${surfaceClass(surface)}">
            <label class="${surfaceTextToneClass(surface, "soft")}">Loss</label>
            <strong class="${surfaceTextToneClass(surface, "strong")}">${device.packetLossPct}%</strong>
          </span>
        </div>
      </button>
    `).join("");


    edgeDeviceListEl.querySelectorAll("[data-edge-device-id]").forEach((element) => {
      element.addEventListener("click", () => {
        selectEdgeDevice(element.dataset.edgeDeviceId);
      });
    });
  }

  const device = selectedEdgeDevice();
  if (!device) return;

  if (edgeSummaryEl) {
    const impacted = device.sensors.filter((sensor) => sensor.status !== "healthy").length;
    edgeSummaryEl.innerHTML = `
      <section class="fleet-hero-grid">
        ${fleetSummaryCard("Selected gateway", device.name, `${device.zoneName} - ${device.firmwareVersion}`, edgeSeverityClass(device.status))}
        ${fleetSummaryCard("Broker link", device.brokerLink, `Last seen ${Math.round(device.lastSeenMs / 1000)}s ago`, device.brokerLink === "down" ? "critical" : device.brokerLink === "unstable" ? "warning" : "normal")}
        ${fleetSummaryCard("Uptime", `${device.uptimeHours}h`, `${device.sensors.length} downstream sensors`, "normal")}
        ${fleetSummaryCard("Sensor impact", `${impacted}`, `${device.sensors.length - impacted} healthy in current batch`, impacted ? "warning" : "normal")}
      </section>
      <section class="fleet-main-card">
        <div class="panel-head-inline">
          <div>
            <span class="section-label">Topology</span>
            <h3>${device.name}</h3>
          </div>
          <span class="pill ${edgeSeverityClass(device.status)}">${device.status}</span>
        </div>
        ${renderGatewayTopology(device)}
      </section>
    `;
  }

  if (edgeSensorDetailEl) {
    edgeSensorDetailEl.innerHTML = `
      <article class="detail-card">
        <div class="detail-head">
          <div>
            <span class="section-label">Sensor batch</span>
            <strong>${device.name}</strong>
          </div>
          <span class="pill ${edgeSeverityClass(device.status)}">${device.status}</span>
        </div>
        <div class="asset-selector-list">
          ${device.sensors.map((sensor) => `
            <div class="asset-selector">
              <span class="asset-selector-copy">
                <strong>${sensor.name}</strong>
                <span>${sensor.metricType} - ${Math.round(sensor.lastSeenMs / 1000)}s ago</span>
              </span>
              <span class="asset-selector-metric">${sensor.lastReading}</span>
              <span class="pill ${edgeSeverityClass(sensor.status)}">${sensor.status}</span>
            </div>
          `).join("")}
        </div>
      </article>
    `;
  }

  if (edgeAlertListEl) {
    const rows = state.edgeAlerts.map((event) => incidentCardHtml({
      timeLabel: new Date(event.receivedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      scopeLabel: zoneNames[event.payload.zoneId] || event.payload.zoneId,
      severity: event.payload.severity,
      message: event.payload.message
    })).join("");

    edgeAlertListEl.innerHTML = `<div class="incident-list">${rows || incidentEmptyHtml("No active gateway incidents.")}</div>`;
  }
}

export function renderSensorWorkspacePage({
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
}) {
  const sensors = allSensors();
  const offline = sensors.filter((sensor) => sensor.status === "offline").length;
  const stale = sensors.filter((sensor) => sensor.status === "stale" || sensor.status === "degraded").length;

  if (sensorFleetSummaryEl) {
    sensorFleetSummaryEl.innerHTML = [
      fleetSummaryCard("Sensors", `${sensors.length}`, `${offline} offline - ${stale} stale`, offline ? "critical" : stale ? "warning" : "normal"),
      fleetSummaryCard("Gateways", `${new Set(sensors.map((sensor) => sensor.deviceId)).size}`, `Across ${new Set(sensors.map((sensor) => sensor.zoneId)).size} zones`, "normal")
    ].join("");
  }

  if (sensorListEl) {
    const surface = "light";

    sensorListEl.innerHTML = sensors.map((sensor) => `
      <button
        type="button"
        class="asset-selector ${surfaceClass(surface)} ${state.selectedSensorId === sensor.id ? "active" : ""}"
        data-sensor-id="${sensor.id}"
      >
        <span class="asset-selector-copy">
          <strong class="${surfaceTextToneClass(surface, "strong")}">${sensor.name}</strong>
          <span class="${surfaceTextToneClass(surface, "muted")}">${sensor.zoneName} · ${sensor.deviceName}</span>
        </span>
        <span class="asset-selector-metric ${surfaceTextToneClass(surface, "strong")}">${sensor.lastReading}</span>
        <span class="pill ${edgeSeverityClass(sensor.status)}">${sensor.status}</span>
      </button>
    `).join("");

    sensorListEl.querySelectorAll("[data-sensor-id]").forEach((element) => {
      element.addEventListener("click", () => {
        selectSensor(element.dataset.sensorId);
      });
    });
  }

  const sensor = selectedSensor();
  if (!sensor) return;

  if (sensorSummaryEl) {
    sensorSummaryEl.innerHTML = `
      <section class="fleet-hero-grid">
        ${fleetSummaryCard("Selected sensor", sensor.name, `${sensor.zoneName} - ${sensor.metricType}`, edgeSeverityClass(sensor.status))}
        ${fleetSummaryCard("Reading", sensor.lastReading, `${sensor.deviceName} upstream path`, "normal")}
        ${fleetSummaryCard("Freshness", `${Math.round(sensor.lastSeenMs / 1000)}s`, `${sensor.batteryPct}% battery remaining`, sensor.lastSeenMs > 60000 ? "warning" : "normal")}
        ${fleetSummaryCard("Gateway path", sensor.deviceName, `${sensor.signalRssi} dBm - ${sensor.packetLossPct}% loss`, edgeSeverityClass(sensor.deviceStatus))}
      </section>
      <section class="fleet-main-card">
        <div class="panel-head-inline">
          <div>
            <span class="section-label">Sensor path</span>
            <h3>${sensor.name}</h3>
          </div>
          <span class="pill ${edgeSeverityClass(sensor.status)}">${sensor.status}</span>
        </div>
        <div class="sensor-path-card">
          <div class="sensor-path-node"><span>Gateway</span><strong>${sensor.deviceName}</strong></div>
          <div class="sensor-path-line ${edgeSeverityClass(sensor.status)}"></div>
          <div class="sensor-path-node"><span>Sensor</span><strong>${sensor.metricType}</strong></div>
        </div>
      </section>
    `;
  }

  if (sensorDetailEl) {
    sensorDetailEl.innerHTML = `
      <article class="detail-card">
        <div class="detail-head">
          <div>
            <span class="section-label">Selected sensor</span>
            <strong>${sensor.name}</strong>
          </div>
          <span class="pill ${edgeSeverityClass(sensor.status)}">${sensor.metricType}</span>
        </div>
        <div class="mini-metric-grid">
          <div class="mini-metric"><span>Latest reading</span><strong>${sensor.lastReading}</strong></div>
          <div class="mini-metric"><span>Battery</span><strong>${sensor.batteryPct}%</strong></div>
          <div class="mini-metric"><span>Signal</span><strong>${sensor.signalRssi} dBm</strong></div>
          <div class="mini-metric"><span>Loss</span><strong>${sensor.packetLossPct}%</strong></div>
          <div class="mini-metric"><span>Broker</span><strong>${sensor.brokerLink}</strong></div>
          <div class="mini-metric"><span>Gateway</span><strong>${sensor.deviceStatus}</strong></div>
        </div>
      </article>
    `;
  }

  if (sensorAlertListEl) {
    const incidents = [];
    if (sensor.status !== "healthy") {
      incidents.push({
        receivedAt: new Date().toISOString(),
        severity: sensor.status === "offline" ? "critical" : "warning",
        message: sensor.status === "offline" ? `${sensor.name} stopped reporting` : `${sensor.name} is reporting stale data`
      });
    }
    if (sensor.batteryPct <= 25) {
      incidents.push({
        receivedAt: new Date(Date.now() - 120000).toISOString(),
        severity: "warning",
        message: `${sensor.name} battery reserve is low`
      });
    }
    if (sensor.packetLossPct >= 5) {
      incidents.push({
        receivedAt: new Date(Date.now() - 240000).toISOString(),
        severity: "warning",
        message: `${sensor.deviceName} is dropping packets on the upstream path`
      });
    }

    sensorAlertListEl.innerHTML = `<div class="incident-list">${(incidents.map((event) => incidentCardHtml({
      timeLabel: new Date(event.receivedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      scopeLabel: sensor.zoneName,
      severity: event.severity,
      message: event.message
    })).join("")) || incidentEmptyHtml("No active incidents for this sensor.")}</div>`;
  }
}
