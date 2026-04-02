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
    twinGatewayListEl.innerHTML = `
      <div class="twin-rail-stack">
        ${devices.map((device) => `
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
    `).join("")}
        <section class="twin-rail-sensor-overview">
          <div class="section-label rail-title">Sensors Overview</div>
          <div class="entity-list">
            ${activeDevice.sensors.map((sensor) => `
              <article class="entity-card ${surfaceClass("light")} ${edgeSeverityClass(sensor.status)}">
                <div class="entity-header">
                  <strong class="${textToneClass("strong")}">${sensor.name}</strong>
                  <span class="pill ${edgeSeverityClass(sensor.status)}">${sensor.status}</span>
                </div>
                <div class="entity-meta ${surfaceTextToneClass("light", "soft")}">
                  <strong class="${surfaceTextToneClass("dark", "strong")}">${sensor.lastReading || "--"}</strong>
                </div>
              </article>
            `).join("")}
          </div>
        </section>
      </div>
    `;

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


      </article>
    `;
  }

}


function scenarioRecipe(zone) {
  const isPropagation = zone?.id === "greenhouse-a-propagation";
  const scenario = zone?.scenario || "baseline-day";

  if (isPropagation) {
    return {
      name: "Propagation hold",
      temperature: 24.8,
      humidity: 74,
      vpd: 0.82,
      soilMoisture: 0.37,
      irrigationFlow: 2.4
    };
  }

  if (scenario === "high-radiation-stress") {
    return {
      name: "High radiation buffer",
      temperature: 23.2,
      humidity: 71,
      vpd: 0.95,
      soilMoisture: 0.35,
      irrigationFlow: 2.2
    };
  }

  return {
    name: "Vegetative baseline",
    temperature: 24,
    humidity: 68,
    vpd: 1.1,
    soilMoisture: 0.32,
    irrigationFlow: 1.8
  };
}


function climateDriftProfile(zone) {
  const recipe = scenarioRecipe(zone);

  return {
    recipe,
    temperatureDelta: (zone?.indoor.temperature ?? recipe.temperature) - recipe.temperature,
    humidityDelta: (zone?.indoor.humidity ?? recipe.humidity) - recipe.humidity,
    vpdDelta: (zone?.derived.vpd ?? recipe.vpd) - recipe.vpd,
    soilMoistureDelta: (zone?.soil.moisture ?? recipe.soilMoisture) - recipe.soilMoisture,
    irrigationFlowDelta: (zone?.soil.irrigationFlow ?? recipe.irrigationFlow) - recipe.irrigationFlow
  };
}

function operationPosture(zones, alerts) {
  const criticalZones = zones.filter((zone) => zone.severity === "critical").length;
  const warningZones = zones.filter((zone) => zone.severity === "warning").length;
  const criticalAlerts = alerts.filter((event) => (event.payload?.severity || "normal") === "critical").length;

  if (criticalZones || criticalAlerts) {
    return {
      label: "Intervention required",
      tone: "critical",
      note: criticalZones + " critical zones need direct operator attention"
    };
  }

  if (warningZones || alerts.length) {
    return {
      label: "Watch operations",
      tone: "warning",
      note: warningZones + " zones drifting outside the recipe envelope"
    };
  }

  return {
    label: "Stable automation",
    tone: "normal",
    note: "Climate, irrigation, and incident load are within expected operating bands"
  };
}

function automationPosture(zone) {
  if (!zone) return { label: "Auto", tone: "normal", note: "No focused zone selected." };
  const maxLoad = Math.max(...zone.assets.map((asset) => asset.load ?? 0), 0);

  if (zone.severity === "critical") {
    return {
      label: "Manual assist",
      tone: "critical",
      note: "Focused zone is outside the recipe envelope and should be supervised by an operator."
    };
  }

  if (zone.severity === "warning" || maxLoad >= 0.72) {
    return {
      label: "Assisted auto",
      tone: "warning",
      note: "Automation is active, but response authority should stay close to the current drift."
    };
  }

  return {
    label: "Auto",
    tone: "normal",
    note: "Automation can hold the zone without immediate intervention."
  };
}

function buildInterventionQueue(zones) {
  return [...zones]
    .map((zone) => {
      const drift = climateDriftProfile(zone);
      const highestLoad = [...zone.assets].sort((left, right) => (right.load ?? 0) - (left.load ?? 0))[0];
      const rootDry = (zone.soil.moisture ?? 0) < drift.recipe.soilMoisture - 0.03;
      const airHot = (zone.indoor.temperature ?? 0) > drift.recipe.temperature + 1.2;
      const humidityLow = (zone.indoor.humidity ?? 0) < drift.recipe.humidity - 6;
      const humidityHigh = (zone.indoor.humidity ?? 0) > drift.recipe.humidity + 6;
      const vpdHigh = (zone.derived.vpd ?? 0) > drift.recipe.vpd + 0.18;

      let issue = "Maintain automation hold";
      let cause = "Zone remains inside the expected recipe envelope.";
      let action = "Continue monitoring and keep graph comparison anchored to this zone.";
      let urgencyMinutes = 45;
      let confidence = 76;

      if (rootDry) {
        issue = "Root zone drying below target";
        cause = "Soil moisture is trailing recipe while irrigation demand stays elevated.";
        action = "Increase irrigation window and confirm manifold flow before the next cycle.";
        urgencyMinutes = 12;
        confidence = 91;
      } else if (airHot && vpdHigh) {
        issue = "Canopy climate running hot";
        cause = "Temperature and VPD rose together after ventilation demand increased.";
        action = "Bias vents and fogging together to cool without collapsing humidity.";
        urgencyMinutes = 10;
        confidence = 88;
      } else if (humidityHigh) {
        issue = "Humidity accumulation forming";
        cause = "Humidity is gathering faster than the current vent and fan pattern can clear it.";
        action = "Increase airflow and review vent staging for condensation risk.";
        urgencyMinutes = 18;
        confidence = 83;
      } else if (humidityLow) {
        issue = "Humidity deficit reducing comfort";
        cause = "Dry air is increasing transpiration demand beyond the preferred recipe band.";
        action = "Trim vent opening and pulse misting to restore the target envelope.";
        urgencyMinutes = 16;
        confidence = 80;
      }

      const score = (100 - calcZoneHealthScore(zone))
        + (zone.severity === "critical" ? 20 : zone.severity === "warning" ? 8 : 0)
        + Math.round((highestLoad?.load ?? 0) * 12);

      return {
        zone,
        issue,
        cause,
        action,
        urgencyMinutes,
        confidence,
        highestLoad,
        score
      };
    })
    .sort((left, right) => right.score - left.score);
}

function buildCommandPriorities(zones, alerts, queue) {
  const rootDryZones = zones.filter((zone) => {
    const drift = climateDriftProfile(zone);
    return (zone.soil.moisture ?? 0) < drift.recipe.soilMoisture - 0.03;
  });

  const thermalStressZones = zones.filter((zone) => {
    const drift = climateDriftProfile(zone);
    return (zone.indoor.temperature ?? 0) > drift.recipe.temperature + 1.2
      && (zone.derived.vpd ?? 0) > drift.recipe.vpd + 0.18;
  });

  const humidityRiskZones = zones.filter((zone) => {
    const drift = climateDriftProfile(zone);
    return (zone.indoor.humidity ?? 0) < drift.recipe.humidity - 6
      || (zone.indoor.humidity ?? 0) > drift.recipe.humidity + 6;
  });

  const automationAssistZones = zones.filter((zone) => {
    const maxLoad = Math.max(...zone.assets.map((asset) => asset.load ?? 0), 0);
    return zone.severity !== "normal" || maxLoad >= 0.72;
  });

  const criticalAlerts = alerts.filter((event) => (event.payload?.severity || "normal") === "critical");
  const warningAlerts = alerts.filter((event) => (event.payload?.severity || "normal") === "warning");
  const lead = queue[0];

  return [
    lead
      ? {
          title: "Immediate response",
          tone: severityClass(lead.zone.severity),
          value: lead.zone.name,
          note: lead.issue,
          detail: lead.action
        }
      : {
          title: "Immediate response",
          tone: "normal",
          value: "No active queue",
          note: "Automation is holding the current command picture.",
          detail: "No direct intervention is required right now."
        },
    thermalStressZones.length
      ? {
          title: "Climate pressure",
          tone: thermalStressZones.length > 1 ? "critical" : "warning",
          value: `${thermalStressZones.length} hot zones`,
          note: "Temperature and VPD are rising together across the facility.",
          detail: `Primary watchlist: ${thermalStressZones.slice(0, 3).map((zone) => zone.name).join(", ")}`
        }
      : {
          title: "Climate pressure",
          tone: humidityRiskZones.length ? "warning" : "normal",
          value: humidityRiskZones.length ? `${humidityRiskZones.length} humidity drifts` : "Stable envelope",
          note: humidityRiskZones.length
            ? "Humidity recovery is now the dominant command-wide climate concern."
            : "Temperature, humidity, and VPD remain close to the active crop recipes.",
          detail: humidityRiskZones.length
            ? `Watch ${humidityRiskZones.slice(0, 3).map((zone) => zone.name).join(", ")}`
            : "No broad climate correction is currently needed."
        },
    rootDryZones.length
      ? {
          title: "Water management",
          tone: rootDryZones.length > 1 ? "critical" : "warning",
          value: `${rootDryZones.length} dry root zones`,
          note: "Irrigation demand is concentrated in bays that are trailing recipe moisture targets.",
          detail: `Prioritize manifold review for ${rootDryZones.slice(0, 3).map((zone) => zone.name).join(", ")}`
        }
      : {
          title: "Water management",
          tone: "normal",
          value: "Balanced runtime",
          note: "Watering demand is currently spread evenly across the command picture.",
          detail: "No concentrated dry-back risk is visible right now."
        },
    criticalAlerts.length || warningAlerts.length || automationAssistZones.length
      ? {
          title: "Operator coverage",
          tone: criticalAlerts.length ? "critical" : "warning",
          value: `${automationAssistZones.length} assisted zones`,
          note: `${warningAlerts.length} warning and ${criticalAlerts.length} critical incidents are shaping the active response load.`,
          detail: criticalAlerts.length
            ? "Keep escalation paths warm while the queue is being worked."
            : "Operators can stay in assisted-auto mode while tracking the queue."
        }
      : {
          title: "Operator coverage",
          tone: "normal",
          value: "Low supervision",
          note: "Automation can manage the current load without sustained manual oversight.",
          detail: "Use this window to verify assets and clear stale incidents."
        }
  ];
}
function actuatorMode(asset, zoneSeverity) {
  if ((asset.load ?? 0) >= 0.82 || zoneSeverity === "critical") return { label: "manual assist", tone: "critical" };
  if ((asset.load ?? 0) >= 0.55 || zoneSeverity === "warning") return { label: "assisted auto", tone: "warning" };
  return { label: "auto", tone: "normal" };
}

function actuatorStateLabel(asset) {
  if ((asset.load ?? 0) >= 0.78) return "High output";
  if ((asset.load ?? 0) >= 0.45) return "Modulating";
  if ((asset.load ?? 0) >= 0.18) return "Standby";
  return "Idle";
}

function incidentWorkflow(alerts, zones, queue) {
  const buckets = {
    new: [],
    investigating: [],
    escalated: [],
    mitigated: []
  };

  const zoneById = new Map(zones.map((zone) => [zone.id, zone]));
  const queueRankByZoneId = new Map(queue.map((item, index) => [item.zone.id, index]));
  const clusterCountByKey = new Map();

  alerts.forEach((event) => {
    const zoneId = event.payload?.zoneId || "system";
    const fingerprint = `${zoneId}::${event.payload?.message || event.type}`;
    clusterCountByKey.set(fingerprint, (clusterCountByKey.get(fingerprint) || 0) + 1);
  });

  const now = Date.now();

  alerts.forEach((event) => {
    const severity = event.payload?.severity || "normal";
    const zoneId = event.payload?.zoneId || "";
    const zone = zoneById.get(zoneId);
    const queueRank = queueRankByZoneId.has(zoneId)
      ? queueRankByZoneId.get(zoneId)
      : Number.POSITIVE_INFINITY;
    const fingerprint = `${zoneId || "system"}::${event.payload?.message || event.type}`;
    const repeatCount = clusterCountByKey.get(fingerprint) || 1;
    const receivedAt = new Date(event.receivedAt).getTime();
    const ageMinutes = Number.isFinite(receivedAt)
      ? Math.max(0, Math.round((now - receivedAt) / 60000))
      : 0;
    const recent = ageMinutes <= 8;
    const zoneCritical = zone?.severity === "critical";
    const zoneWarning = zone?.severity === "warning";
    const topQueue = queueRank < 2;
    const activeQueue = queueRank < 4;
    const sustained = repeatCount >= 2;
    const highestLoad = zone?.assets?.reduce((max, asset) => Math.max(max, asset.load ?? 0), 0) ?? 0;
    const strainedResponse = highestLoad >= 0.72;

    let key = "mitigated";

    if (severity === "critical" || zoneCritical || (topQueue && sustained) || (strainedResponse && activeQueue && sustained)) {
      key = "escalated";
    } else if ((severity === "warning" && (activeQueue || sustained || zoneWarning)) || (strainedResponse && recent)) {
      key = "investigating";
    } else if (severity === "warning" && recent) {
      key = "new";
    }

    buckets[key].push(event);
  });

  return [
    { key: "new", title: "New", tone: "normal", items: buckets.new },
    { key: "investigating", title: "Investigating", tone: "warning", items: buckets.investigating },
    { key: "escalated", title: "Escalated", tone: "critical", items: buckets.escalated },
    { key: "mitigated", title: "Mitigated", tone: "normal", items: buckets.mitigated }
  ];
}

export function renderOperationsCommandPriorityRail({ state, railEl, managedZones }) {
  if (!railEl) return;
  const managed = typeof managedZones === "function" ? managedZones() : managedZones;
  const facilityZones = state.zones.length ? state.zones : managed;
  const queue = buildInterventionQueue(facilityZones);
  const commandPriorities = buildCommandPriorities(facilityZones, state.alerts, queue);

  railEl.innerHTML = commandPriorities.map((item, index) => `
    <article class="entity-card ${surfaceClass("dark")} ${item.tone}">
      <div class="entity-header">
        <div>
          <span class="priority-rank">${String(index + 1).padStart(2, "0")}</span>
          <strong class="${surfaceTextToneClass("dark", "strong")}">${item.title}</strong>
        </div>
        <span class="pill ${item.tone}">${item.value}</span>
      </div>
      <div class="entity-meta ${surfaceTextToneClass("dark", "muted")}">
        <p>${item.note}</p>
      </div>
      <div class="entity-meta ${surfaceTextToneClass("dark", "soft")}">${item.detail}</div>
    </article>
  `).join("");
}

export function renderOperationsWorkspacePage({ state, opsSummaryEl, operationsBoardEl, managedZones, selectedZone, incidentCardHtml }) {
  const managed = typeof managedZones === "function" ? managedZones() : managedZones;
  const focused = selectedZone();
  const facilityZones = state.zones.length ? state.zones : managed;
  const totalAssets = facilityZones.reduce((sum, zone) => sum + zone.assets.length, 0);
  const avgTemp = facilityZones.reduce((sum, zone) => sum + (zone.indoor.temperature ?? 0), 0) / Math.max(facilityZones.length, 1);
  const avgHumidity = facilityZones.reduce((sum, zone) => sum + (zone.indoor.humidity ?? 0), 0) / Math.max(facilityZones.length, 1);
  const posture = operationPosture(facilityZones, state.alerts);
  const automation = automationPosture(focused);
  const queue = buildInterventionQueue(facilityZones);
  const topQueue = queue[0];
  const avgHealth = Math.round(facilityZones.reduce((sum, zone) => sum + calcZoneHealthScore(zone), 0) / Math.max(facilityZones.length, 1));
  const waterToday = facilityZones.reduce((sum, zone) => sum + ((zone.soil.irrigationFlow ?? 0) * 18), 0);
  const energyLoad = Math.round(facilityZones.reduce((sum, zone) => sum + zone.assets.reduce((assetSum, asset) => assetSum + (asset.load ?? 0), 0), 0) * 2.8);
  const efficiency = {
    irrigationRuntime: Math.round(facilityZones.reduce((sum, zone) => sum + ((zone.actuators.irrigation ?? 0) * 28), 0)),
    ventDuty: Math.round(facilityZones.reduce((sum, zone) => sum + (zone.actuators.vent ?? 0), 0) / Math.max(facilityZones.length, 1) * 100),
    thermalLoad: Math.round(facilityZones.reduce((sum, zone) => sum + (zone.actuators.heater ?? 0), 0) / Math.max(facilityZones.length, 1) * 100),
    climateStability: avgHealth
  };
  const workflowColumns = incidentWorkflow(state.alerts, facilityZones, queue);
  const criticalZones = facilityZones.filter((zone) => zone.severity === "critical").length;
  const warningZones = facilityZones.filter((zone) => zone.severity === "warning").length;
  const normalZones = Math.max(facilityZones.length - warningZones - criticalZones, 0);
  const totalZones = Math.max(facilityZones.length, 1);
  const criticalAlerts = state.alerts.filter((event) => (event.payload?.severity || "normal") === "critical").length;
  const warningAlerts = state.alerts.filter((event) => (event.payload?.severity || "normal") === "warning").length;
  const actionableAlerts = Math.max(criticalAlerts + warningAlerts, 1);
  const automationAssistPct = automation.tone === "critical" ? 100 : automation.tone === "warning" ? 68 : 22;
  const waterEnergyTotal = Math.max(waterToday + energyLoad, 1);

  if (opsSummaryEl) {
    opsSummaryEl.innerHTML = `
      <section class="overview-strip ops-overview-strip">
        <article class="overview-metric">
          <span class="overview-label">Operational posture</span>
          <strong class="overview-value">${posture.label}</strong>
          <div class="overview-severity-bar">
            <span class="normal" style="width:${((normalZones / totalZones) * 100).toFixed(1)}%"></span>
            <span class="warning" style="width:${((warningZones / totalZones) * 100).toFixed(1)}%"></span>
            <span class="critical" style="width:${((criticalZones / totalZones) * 100).toFixed(1)}%"></span>
          </div>
          <span class="overview-note">${normalZones} normal / ${warningZones} warning / ${criticalZones} critical zones</span>
        </article>

        <article class="overview-metric">
          <span class="overview-label">Incident load</span>
          <strong class="overview-value">${state.alerts.length}</strong>
          <div class="overview-incident-split">
            <span class="warning" style="width:${((warningAlerts / actionableAlerts) * 100).toFixed(1)}%"></span>
            <span class="critical" style="width:${((criticalAlerts / actionableAlerts) * 100).toFixed(1)}%"></span>
          </div>
          <span class="overview-note">${warningAlerts} warning / ${criticalAlerts} critical in the command queue</span>
        </article>

        <article class="overview-metric">
          <span class="overview-label">Automation posture</span>
          <strong class="overview-value">${automation.label}</strong>
          <div class="overview-severity-bar">
            <span class="normal" style="width:${(100 - automationAssistPct).toFixed(1)}%"></span>
            <span class="warning" style="width:${automation.tone === "warning" ? automationAssistPct.toFixed(1) : "0.0"}%"></span>
            <span class="critical" style="width:${automation.tone === "critical" ? automationAssistPct.toFixed(1) : "0.0"}%"></span>
          </div>
          <span class="overview-note">${focused.name} / ${avgHealth}% facility stability / ${efficiency.climateStability}% climate adherence</span>
        </article>

        <article class="overview-metric">
          <span class="overview-label">Water and energy</span>
          <strong class="overview-value">${fmt(waterToday, 0, " L")}</strong>
          <div class="overview-incident-split">
            <span class="normal" style="width:${((waterToday / waterEnergyTotal) * 100).toFixed(1)}%"></span>
            <span class="warning" style="width:${((energyLoad / waterEnergyTotal) * 100).toFixed(1)}%"></span>
          </div>
          <span class="overview-note">${energyLoad} kWh effort / ${totalAssets} assets / ${fmt(avgTemp, 1, " C")} and ${fmt(avgHumidity, 0, " %")}</span>
        </article>
      </section>
    `;
  }

  if (operationsBoardEl && focused) {
    operationsBoardEl.innerHTML = `

      <section class="ops-decision-grid">
        <article class="priority-board intervention-queue">
          <div class="panel-head-inline">
            <div ${surfaceClass("dark")}>
              <span class="section-label">Intervention queue</span>
            </div>
            <span class="pill ${posture.tone}">${queue.length} zones</span>
          </div>
          <div class="intervention-list">
            ${queue.map((item, index) => `
              <article class="intervention-card ${severityClass(item.zone.severity)}">
                <div class="intervention-card-top">
                  <div>
                    <span class="priority-rank">${String(index + 1).padStart(2, "0")}</span>
                    <strong>${item.zone.name}</strong>
                  </div>
                  <span class="pill ${severityClass(item.zone.severity)}">${item.urgencyMinutes} min</span>
                </div>
                <div class="intervention-card-body">
                  <h4>${item.issue}</h4>
                  <p>${item.cause}</p>
                </div>
                <div class="intervention-meta">
                  <span>${item.action}</span>
                  <strong>${item.confidence}% confidence</strong>
                </div>
                <div class="intervention-foot">
                  <span>${calcZoneHealthScore(item.zone)} health</span>
                  <span>${item.highestLoad?.name || "No actuator context"} at ${percent(item.highestLoad?.load ?? 0)}%</span>
                </div>
              </article>
            `).join("")}
          </div>
        </article>
      </section>

      <section class="ops-execution-grid">
        <article class="priority-board actuator-state-board">
          <div class="panel-head-inline">
            <div>
              <span class="section-label">Actuator state</span>
              <h3>Execution authority and live output</h3>
            </div>
            <span class="pill ${automation.tone}">${automation.label}</span>
          </div>
          <div class="actuator-grid">
            ${focused.assets.map((asset) => {
              const mode = actuatorMode(asset, focused.severity);
              const actual = Math.max(0, Math.min(100, percent(asset.load ?? 0) + ((asset.load ?? 0) >= 0.6 ? -4 : 3)));

              return `
                <article class="actuator-card ${mode.tone}">
                  <div class="actuator-card-head">
                    <div>
                      <strong>${asset.name}</strong>
                      <span>${asset.type}</span>
                    </div>
                    <span class="pill ${mode.tone}">${mode.label}</span>
                  </div>
                  <div class="actuator-card-metrics">
                    <div><span>State</span><strong>${actuatorStateLabel(asset)}</strong></div>
                    <div><span>Commanded</span><strong>${percent(asset.load ?? 0)}%</strong></div>
                    <div><span>Actual</span><strong>${actual}%</strong></div>
                  </div>
                  <div class="asset-load-bar"><span style="width:${percent(asset.load ?? 0)}%"></span></div>
                </article>
              `;
            }).join("")}
          </div>
        </article>
      </section>

      <section class="ops-incident-board">
        <div class="panel-head-inline">
          <div>
            <span class="section-label">Incident workflow</span>
            <h3>Response board</h3>
          </div>
          <span class="pill ${state.alerts.length ? "warning" : "normal"}">${state.alerts.length} tracked</span>
        </div>
        <div class="incident-workflow-grid">
          ${workflowColumns.map((column) => `
            <section class="workflow-column ${column.tone}">
              <div class="workflow-column-head">
                <div class="workflow-column-copy">
                  <span class="workflow-column-kicker">${column.key === "new" ? "Awaiting triage" : column.key === "investigating" ? "Active analysis" : column.key === "escalated" ? "Manual response" : "Cooling down"}</span>
                  <strong>${column.title}</strong>
                </div>
                <span class="workflow-count">${column.items.length}</span>
              </div>
              <div class="incident-list compact-incidents workflow-column-list">
                ${column.items.length
                  ? column.items.map((event) => incidentCardHtml({
                      timeLabel: new Date(event.receivedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                      scopeLabel: event.payload?.zoneId || "system",
                      severity: event.payload?.severity || "normal",
                      message: event.payload?.message || event.type
                    })).join("")
                  : "<div class=\"empty-state workflow-empty-state\">No incidents in this workflow state.</div>"}
              </div>
            </section>
          `).join("")}
        </div>
      </section>

      <section class="ops-efficiency-strip">
        <article class="ops-efficiency-card ${surfaceClass("light")}">
          <span class="section-label ${textToneClass("soft")}">Irrigation runtime</span>
          <strong class="${textToneClass("strong")}">${efficiency.irrigationRuntime} min</strong>
          <p class="${textToneClass("muted")}">Estimated active watering time across the current command picture.</p>
        </article>
        <article class="ops-efficiency-card ${surfaceClass("light")}">
          <span class="section-label ${textToneClass("soft")}">Vent duty cycle</span>
          <strong class="${textToneClass("strong")}">${efficiency.ventDuty}%</strong>
          <p class="${textToneClass("muted")}">Average ventilation authority currently in use across greenhouse zones.</p>
        </article>
        <article class="ops-efficiency-card ${surfaceClass("light")}">
          <span class="section-label ${textToneClass("soft")}">Thermal effort</span>
          <strong class="${textToneClass("strong")}">${efficiency.thermalLoad}%</strong>
          <p class="${textToneClass("muted")}">Heating demand relative to recipe protection and canopy recovery.</p>
        </article>
        <article class="ops-efficiency-card ${surfaceClass("light")}">
          <span class="section-label ${textToneClass("soft")}">Climate stability</span>
          <strong class="${textToneClass("strong")}">${efficiency.climateStability}%</strong>
          <p class="${textToneClass("muted")}">Facility-wide digital twin confidence in recipe adherence.</p>
        </article>
      </section>
    `;
  }
}

