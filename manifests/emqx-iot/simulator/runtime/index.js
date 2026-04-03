import mqtt from "mqtt";

const mqttUrl = process.env.MQTT_URL || "mqtt://emqx-listeners:1883";
const topicRoot = process.env.MQTT_TOPIC_ROOT || "site/alpha/devices";
const intervalMs = Number(process.env.PUBLISH_INTERVAL_MS || 2000);
const httpPort = Number(process.env.SIMULATOR_PORT || 8080);
const configuredZoneIds = (process.env.ZONE_IDS || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const defaultZones = [
  { zoneId: "greenhouse-a-north", zoneName: "North Bay", offset: 0.0 },
  { zoneId: "greenhouse-a-center", zoneName: "Center Bay", offset: 0.7 },
  { zoneId: "greenhouse-a-south", zoneName: "South Bay", offset: 1.4 },
  { zoneId: "greenhouse-a-west", zoneName: "West Bay", offset: 2.1 },
  { zoneId: "greenhouse-a-east", zoneName: "East Bay", offset: 2.8 },
  { zoneId: "greenhouse-a-propagation", zoneName: "Propagation Bay", offset: 3.5 },
];
const zoneConfigs =
  configuredZoneIds.length > 0
    ? configuredZoneIds.map((configuredZoneId, index) => ({
        zoneId: configuredZoneId,
        zoneName: configuredZoneId,
        offset: index * 0.7,
      }))
    : defaultZones;
const tickSeconds = intervalMs / 1000;

let scenario = process.env.SCENARIO || "baseline-day";
let tick = 0;
let publishTimer = null;

let publishSuccessTotal = 0;
let publishFailureTotal = 0;
let mqttReconnectsTotal = 0;
let simulatorResetsTotal = 0;
let messagesByZone = Object.fromEntries(zoneConfigs.map((zone) => [zone.zoneId, 0]));

function renderMetrics() {
  const scenarioLines = Array.from(allowedScenarios).map((scenarioName) => {
    const active = scenario === scenarioName ? 1 : 0;
    return `iot_simulator_active_scenario{scenario="${scenarioName}"} ${active}`;
  });

  const zoneLines = Object.entries(messagesByZone).map(
    ([zoneId, total]) => `iot_simulator_messages_total{zone_id="${zoneId}"} ${total}`
  );

  return [
    "# HELP iot_simulator_publish_success_total Total successful MQTT publishes",
    "# TYPE iot_simulator_publish_success_total counter",
    `iot_simulator_publish_success_total ${publishSuccessTotal}`,

    "# HELP iot_simulator_publish_failure_total Total failed MQTT publishes",
    "# TYPE iot_simulator_publish_failure_total counter",
    `iot_simulator_publish_failure_total ${publishFailureTotal}`,

    "# HELP iot_simulator_mqtt_connected Whether the simulator MQTT client is currently connected",
    "# TYPE iot_simulator_mqtt_connected gauge",
    `iot_simulator_mqtt_connected ${client.connected ? 1 : 0}`,

    "# HELP iot_simulator_mqtt_reconnects_total Total MQTT reconnect attempts",
    "# TYPE iot_simulator_mqtt_reconnects_total counter",
    `iot_simulator_mqtt_reconnects_total ${mqttReconnectsTotal}`,

    "# HELP iot_simulator_tick Current simulator tick",
    "# TYPE iot_simulator_tick gauge",
    `iot_simulator_tick ${tick}`,

    "# HELP iot_simulator_resets_total Number of simulator scenario resets",
    "# TYPE iot_simulator_resets_total counter",
    `iot_simulator_resets_total ${simulatorResetsTotal}`,

    "# HELP iot_simulator_active_scenario One-hot current scenario indicator",
    "# TYPE iot_simulator_active_scenario gauge",
    ...scenarioLines,

    "# HELP iot_simulator_messages_total Messages emitted by zone",
    "# TYPE iot_simulator_messages_total counter",
    ...zoneLines,
  ].join("\n") + "\n";
}

const allowedScenarios = new Set([
  "baseline-day",
  "hot-humid-afternoon",
  "cold-night",
  "irrigation-failure",
  "ventilation-failure",
  "high-radiation-stress",
]);

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const noise = (amplitude = 1) => (Math.random() - 0.5) * 2 * amplitude;
const round = (value, digits = 2) => Number(value.toFixed(digits));

function solarProfile(hour) {
  return Math.max(0, Math.sin(((hour - 6) / 12) * Math.PI));
}

function outdoorTemperatureProfile(hour) {
  return 15 + 8 * Math.sin(((hour - 8) / 24) * Math.PI * 2);
}

function saturationVaporPressure(tempC) {
  return 0.6108 * Math.exp((17.27 * tempC) / (tempC + 237.3));
}

function dewPointC(tempC, rh) {
  const safeRh = clamp(rh, 1, 100);
  const a = 17.27;
  const b = 237.7;
  const alpha = (a * tempC) / (b + tempC) + Math.log(safeRh / 100);
  return (b * alpha) / (a - alpha);
}

function vpdKPa(tempC, rh) {
  return saturationVaporPressure(tempC) * (1 - clamp(rh, 0, 100) / 100);
}

function absoluteHumidity(tempC, rh) {
  const svp = saturationVaporPressure(tempC);
  const avp = svp * clamp(rh, 0, 100) / 100;
  return (216.7 * avp) / (tempC + 273.15);
}

function relativeHumidityFromAbsolute(tempC, absHumidity) {
  const svp = saturationVaporPressure(tempC);
  const avp = (absHumidity * (tempC + 273.15)) / 216.7;
  return clamp((avp / svp) * 100, 0, 100);
}

function severityFor(currentState) {
  if (
    currentState.indoor.temperature > 32 ||
    currentState.indoor.co2 > 1400 ||
    currentState.derived.vpd > 2.0 ||
    currentState.soil.moisture < 0.22 ||
    currentState.soil.tankLevel < 10
  ) {
    return "critical";
  }

  if (
    currentState.indoor.temperature > 28 ||
    currentState.indoor.co2 > 1100 ||
    currentState.derived.vpd > 1.4 ||
    currentState.soil.moisture < 0.28 ||
    currentState.soil.tankLevel < 20
  ) {
    return "warning";
  }

  return "normal";
}

function createInitialState(zoneConfig, index) {
  const temperature = 21.5 + zoneConfig.offset * 0.4;
  const humidity = 69.0 - zoneConfig.offset * 1.4;

  return {
    zoneId: zoneConfig.zoneId,
    zoneName: zoneConfig.zoneName,
    outdoor: {
      temperature: 16.0 + zoneConfig.offset * 0.2,
      humidity: 72.0 - zoneConfig.offset,
      solar: 0.0,
      wind: 1.2 + index * 0.08,
    },
    indoor: {
      temperature,
      humidity,
      absoluteHumidity: absoluteHumidity(temperature, humidity),
      co2: 520 + index * 18,
      pressure: 1012,
      par: 0,
    },
    soil: {
      moisture: 0.35 - index * 0.012,
      temperature: 20.0 + zoneConfig.offset * 0.18,
      ec: 1.8 + index * 0.04,
      ph: 6.2 - index * 0.03,
      tankLevel: 82.0 - index * 4.5,
      irrigationFlow: 0,
    },
    actuators: {
      vent: 0.12 + index * 0.02,
      heater: 0.0,
      fan: 0.0,
      mister: 0.0,
      irrigation: 0.0,
      growLight: 0.0,
    },
    derived: {
      dewPoint: 0,
      vpd: 0,
      evapotranspiration: 0,
      irrigationDemand: 0,
    },
  };
}

function buildInitialZoneStates() {
  return new Map(zoneConfigs.map((zoneConfig, index) => [zoneConfig.zoneId, createInitialState(zoneConfig, index)]));
}

let zoneStates = buildInitialZoneStates();

function resetStateForScenario(nextScenario) {
  scenario = nextScenario;
  tick = 0;
  simulatorResetsTotal += 1;
  zoneStates = buildInitialZoneStates();
}

function updateOutdoor(now, activeScenario, zoneConfig) {
  const hour = now.getHours() + now.getMinutes() / 60;
  const solarBase = solarProfile(hour);
  let solar = clamp(solarBase + zoneConfig.offset * 0.015 + noise(0.08), 0, 1);
  let temperature = outdoorTemperatureProfile(hour) + 7 * solar + zoneConfig.offset * 0.35 + noise(0.4);
  let humidity = 82 - 22 * solar - zoneConfig.offset * 0.8 + noise(2.0);
  let wind = clamp(1.5 + zoneConfig.offset * 0.12 + noise(0.6), 0, 6);

  if (activeScenario === "hot-humid-afternoon") {
    temperature += 5;
    humidity += 8;
  }

  if (activeScenario === "cold-night") {
    temperature -= 7;
    solar *= 0.25;
  }

  if (activeScenario === "high-radiation-stress") {
    temperature += 3;
    solar = clamp(solar + 0.18, 0, 1);
  }

  return {
    temperature: clamp(temperature, -5, 45),
    humidity: clamp(humidity, 20, 100),
    solar: clamp(solar, 0, 1),
    wind: clamp(wind, 0, 8),
  };
}

function moveActuator(current, target, rate = 0.2) {
  return clamp(current + (target - current) * rate, 0, 1);
}

function computeControlTargets(currentState, activeScenario, currentTick) {
  const targets = {
    vent: 0.1,
    heater: 0.0,
    fan: 0.0,
    mister: 0.0,
    irrigation: 0.0,
    growLight: currentState.outdoor.solar < 0.12 ? 0.35 : 0.0,
  };

  if (currentState.indoor.temperature > 25.5) {
    targets.vent = clamp((currentState.indoor.temperature - 24) / 8, 0.15, 1);
    targets.fan = clamp((currentState.indoor.temperature - 25) / 6, 0, 1);
  }

  if (currentState.indoor.temperature < 19) {
    targets.heater = clamp((20.5 - currentState.indoor.temperature) / 4, 0, 1);
    targets.vent = 0.05;
  }

  if (currentState.indoor.humidity > 85) {
    targets.vent = Math.max(targets.vent, 0.45);
    targets.fan = Math.max(targets.fan, 0.35);
  }

  if (currentState.indoor.humidity < 58 && currentState.outdoor.solar > 0.2) {
    targets.mister = clamp((60 - currentState.indoor.humidity) / 20, 0, 0.5);
  }

  if (currentState.soil.moisture < 0.29 || (currentTick % 90 === 0 && currentState.outdoor.solar > 0.3)) {
    targets.irrigation = currentState.soil.tankLevel > 5 ? 0.75 : 0.0;
  }

  if (activeScenario === "hot-humid-afternoon") {
    targets.vent = Math.max(targets.vent, 0.8);
    targets.fan = Math.max(targets.fan, 0.65);
    targets.mister = Math.max(targets.mister, 0.15);
  }

  if (activeScenario === "cold-night") {
    targets.vent = 0.03;
    targets.fan = 0.0;
    targets.heater = Math.max(targets.heater, 0.7);
    targets.growLight = 0.25;
  }

  if (activeScenario === "irrigation-failure") {
    targets.irrigation = 0.0;
  }

  if (activeScenario === "ventilation-failure") {
    targets.vent = 0.0;
    targets.fan = 0.0;
  }

  if (activeScenario === "high-radiation-stress") {
    targets.vent = Math.max(targets.vent, 0.5);
    targets.fan = Math.max(targets.fan, 0.45);
    targets.growLight = 0.0;
  }

  return targets;
}

function updateActuators(currentActuators, currentState, activeScenario, currentTick) {
  const targets = computeControlTargets(currentState, activeScenario, currentTick);

  return {
    vent: moveActuator(currentActuators.vent, targets.vent, 0.3),
    heater: moveActuator(currentActuators.heater, targets.heater, 0.15),
    fan: moveActuator(currentActuators.fan, targets.fan, 0.25),
    mister: moveActuator(currentActuators.mister, targets.mister, 0.25),
    irrigation: moveActuator(currentActuators.irrigation, targets.irrigation, 0.45),
    growLight: moveActuator(currentActuators.growLight, targets.growLight, 0.2),
  };
}

function updateIndoor(currentIndoor, outdoor, soil, actuators, dtSeconds) {
  const exchange = 0.010 * (outdoor.temperature - currentIndoor.temperature) * dtSeconds;
  const solarGain = 0.22 * outdoor.solar * dtSeconds;
  const heaterGain = 0.28 * actuators.heater * dtSeconds;
  const ventCooling =
    0.015 * actuators.vent * (currentIndoor.temperature - outdoor.temperature) * dtSeconds;
  const fanCooling =
    0.01 * actuators.fan * (currentIndoor.temperature - outdoor.temperature) * dtSeconds;
  const mistCooling = 0.07 * actuators.mister * dtSeconds;
  const canopyBuffer = -0.008 * (currentIndoor.temperature - soil.temperature) * dtSeconds;

  const temperature = clamp(
    currentIndoor.temperature +
      exchange +
      solarGain +
      heaterGain -
      ventCooling -
      fanCooling -
      mistCooling +
      canopyBuffer +
      noise(0.08),
    5,
    45,
  );

  const outdoorAbsHumidity = absoluteHumidity(outdoor.temperature, outdoor.humidity);
  const evapotranspirationMass =
    (0.08 + 0.35 * outdoor.solar + 0.08 * vpdKPa(currentIndoor.temperature, currentIndoor.humidity)) *
    clamp(soil.moisture / 0.35, 0.45, 1.3) *
    (dtSeconds / 60);
  const mistInput = 1.3 * actuators.mister * (dtSeconds / 60);
  const ventExchange =
    0.35 * (actuators.vent + 0.5 * actuators.fan) *
    (currentIndoor.absoluteHumidity - outdoorAbsHumidity) *
    (dtSeconds / 60);

  let absoluteHumidityValue =
    currentIndoor.absoluteHumidity + evapotranspirationMass + mistInput - ventExchange + noise(0.03);

  const relativeHumidity = relativeHumidityFromAbsolute(temperature, absoluteHumidityValue);
  const condensation = relativeHumidity > 96 ? (relativeHumidity - 96) * 0.04 : 0;
  absoluteHumidityValue = clamp(absoluteHumidityValue - condensation, 4, 35);

  const humidity = clamp(relativeHumidityFromAbsolute(temperature, absoluteHumidityValue), 35, 100);

  const co2Drawdown =
    (0.8 + 2.0 * outdoor.solar + 0.4 * actuators.growLight) *
    clamp(1.4 - vpdKPa(temperature, humidity), 0.4, 1.4);
  const co2Exchange =
    18 * (actuators.vent + 0.4 * actuators.fan) * ((420 - currentIndoor.co2) / 100) * dtSeconds;
  const co2 = clamp(currentIndoor.co2 + co2Exchange - co2Drawdown + noise(2), 300, 1600);

  const par = clamp(950 * outdoor.solar + 280 * actuators.growLight + noise(8), 0, 1500);

  return {
    temperature,
    humidity,
    absoluteHumidity: absoluteHumidityValue,
    co2,
    pressure: 1012 + noise(1.2),
    par,
  };
}

function updateSoil(currentSoil, indoor, actuators, dtSeconds) {
  const fieldCapacity = 0.42;
  const wiltingPoint = 0.16;
  const et =
    clamp(
      0.00007 * indoor.par + 0.014 * vpdKPa(indoor.temperature, indoor.humidity),
      0,
      0.03,
    ) * (dtSeconds / 2);
  const irrigationFlow = 1.6 * actuators.irrigation;
  const irrigationIn = 0.016 * actuators.irrigation * dtSeconds;
  const drainage = Math.max(0, currentSoil.moisture - fieldCapacity) * 0.06 * dtSeconds;
  const stressMultiplier = currentSoil.moisture < wiltingPoint ? 0.3 : 1;

  const moisture =
    currentSoil.moisture + irrigationIn - drainage - et * stressMultiplier + noise(0.001);

  const temperature =
    currentSoil.temperature +
    0.025 * (indoor.temperature - currentSoil.temperature) * dtSeconds -
    0.06 * actuators.irrigation * dtSeconds +
    noise(0.04);

  const tankLevel =
    currentSoil.tankLevel - 0.18 * irrigationFlow * dtSeconds + noise(0.015);

  return {
    moisture: clamp(moisture, 0.12, 0.6),
    temperature: clamp(temperature, 4, 35),
    ec: clamp(currentSoil.ec + 0.02 * et - 0.03 * actuators.irrigation + noise(0.01), 0.8, 3.5),
    ph: clamp(currentSoil.ph + noise(0.01), 5.2, 7.5),
    tankLevel: clamp(tankLevel, 0, 100),
    irrigationFlow: clamp(irrigationFlow, 0, 2.0),
  };
}

function updateDerived(indoor, soil) {
  const dewPoint = dewPointC(indoor.temperature, indoor.humidity);
  const vpd = vpdKPa(indoor.temperature, indoor.humidity);
  const evapotranspiration = clamp(
    0.02 + indoor.par / 1800 + 0.35 * vpd + 0.02 * Math.max(indoor.temperature - 20, 0),
    0,
    2.5,
  );
  const irrigationDemand = clamp(
    (0.45 - soil.moisture) * 120 + vpd * 22 + indoor.par / 220,
    0,
    100,
  );

  return {
    dewPoint: round(dewPoint, 2),
    vpd: round(vpd, 2),
    evapotranspiration: round(evapotranspiration, 2),
    irrigationDemand: round(irrigationDemand, 1),
  };
}

function buildAlerts(currentState) {
  const alerts = [];

  if (currentState.indoor.temperature > 32) {
    alerts.push({
      severity: "critical",
      code: "HIGH_TEMP",
      message: "Air temperature too high",
    });
  } else if (currentState.indoor.temperature > 28) {
    alerts.push({
      severity: "warning",
      code: "TEMP_RISING",
      message: "Air temperature trending high",
    });
  }

  if (currentState.indoor.temperature < 15) {
    alerts.push({
      severity: "warning",
      code: "LOW_TEMP",
      message: "Air temperature below target band",
    });
  }

  if (currentState.derived.vpd > 1.6) {
    alerts.push({
      severity: "warning",
      code: "HIGH_VPD",
      message: "Air too dry for stable transpiration",
    });
  }

  if (currentState.indoor.co2 > 1200) {
    alerts.push({
      severity: "warning",
      code: "HIGH_CO2",
      message: "CO2 concentration elevated",
    });
  }

  if (currentState.soil.moisture < 0.22) {
    alerts.push({
      severity: "critical",
      code: "LOW_SOIL_MOISTURE",
      message: "Root zone too dry",
    });
  } else if (currentState.soil.moisture < 0.28) {
    alerts.push({
      severity: "warning",
      code: "SOIL_DRYING",
      message: "Root zone moisture is trending low",
    });
  }

  if (currentState.soil.tankLevel < 15) {
    alerts.push({
      severity: "warning",
      code: "LOW_TANK",
      message: "Irrigation tank running low",
    });
  }

  if (scenario === "ventilation-failure") {
    alerts.push({
      severity: "warning",
      code: "VENT_FAULT",
      message: "Ventilation actuator unavailable",
    });
  }

  if (scenario === "irrigation-failure") {
    alerts.push({
      severity: "warning",
      code: "IRRIGATION_FAULT",
      message: "Irrigation actuator unavailable",
    });
  }

  return alerts;
}

function buildTelemetryPayload(currentState) {
  const now = new Date().toISOString();
  const alerts = buildAlerts(currentState);
  const severity = severityFor(currentState);

  return {
    zoneId: currentState.zoneId,
    deviceId: currentState.zoneId,
    ts: now,
    scenario,
    severity,
    online: true,
    outdoor: {
      temperature: round(currentState.outdoor.temperature, 1),
      humidity: round(currentState.outdoor.humidity, 1),
      solar: round(currentState.outdoor.solar, 3),
      wind: round(currentState.outdoor.wind, 2),
    },
    indoor: {
      temperature: round(currentState.indoor.temperature, 1),
      humidity: round(currentState.indoor.humidity, 1),
      absoluteHumidity: round(currentState.indoor.absoluteHumidity, 2),
      co2: Math.round(currentState.indoor.co2),
      pressure: round(currentState.indoor.pressure, 1),
      par: Math.round(currentState.indoor.par),
      dewPoint: currentState.derived.dewPoint,
      vpd: currentState.derived.vpd,
    },
    soil: {
      moisture: round(currentState.soil.moisture, 3),
      temperature: round(currentState.soil.temperature, 1),
      ec: round(currentState.soil.ec, 2),
      ph: round(currentState.soil.ph, 2),
      tankLevel: round(currentState.soil.tankLevel, 1),
      irrigationFlow: round(currentState.soil.irrigationFlow, 2),
    },
    actuators: {
      vent: round(currentState.actuators.vent, 2),
      heater: round(currentState.actuators.heater, 2),
      fan: round(currentState.actuators.fan, 2),
      mister: round(currentState.actuators.mister, 2),
      irrigation: round(currentState.actuators.irrigation, 2),
      growLight: round(currentState.actuators.growLight, 2),
    },
    derived: {
      dewPoint: currentState.derived.dewPoint,
      vpd: currentState.derived.vpd,
      evapotranspiration: currentState.derived.evapotranspiration,
      irrigationDemand: currentState.derived.irrigationDemand,
    },
    alerts,
    temperature: round(currentState.indoor.temperature, 1),
    humidity: round(currentState.indoor.humidity, 1),
    pressure: round(currentState.indoor.pressure, 1),
    battery: round(currentState.soil.tankLevel, 1),
  };
}

function serializeZoneStates() {
  return Object.fromEntries(zoneStates.entries());
}

function tickGreenhouse(zoneConfig, currentState) {
  const now = new Date();
  const nextState = {
    ...currentState,
    outdoor: updateOutdoor(now, scenario, zoneConfig),
  };

  nextState.actuators = updateActuators(nextState.actuators, nextState, scenario, tick);
  nextState.indoor = updateIndoor(
    nextState.indoor,
    nextState.outdoor,
    nextState.soil,
    nextState.actuators,
    tickSeconds,
  );
  nextState.soil = updateSoil(nextState.soil, nextState.indoor, nextState.actuators, tickSeconds);
  nextState.derived = updateDerived(nextState.indoor, nextState.soil);

  return {
    nextState,
    telemetry: buildTelemetryPayload(nextState),
  };
}

const client = mqtt.connect(mqttUrl, {
  reconnectPeriod: 3000,
  connectTimeout: 10000,
});

function publishAll() {
  if (!client.connected) {
    publishFailureTotal += zoneConfigs.length * 2;
    console.log("simulator skipped publish because mqtt is not connected");
    return;
  }

  tick += 1;

  for (const zoneConfig of zoneConfigs) {
    const currentState = zoneStates.get(zoneConfig.zoneId) || createInitialState(zoneConfig, 0);
    const { nextState, telemetry } = tickGreenhouse(zoneConfig, currentState);
    zoneStates.set(zoneConfig.zoneId, nextState);

    const status = {
      zoneId: zoneConfig.zoneId,
      deviceId: zoneConfig.zoneId,
      online: true,
      severity: telemetry.severity,
      scenario,
      ts: telemetry.ts,
    };

    try {
      client.publish(`${topicRoot}/${zoneConfig.zoneId}/telemetry`, JSON.stringify(telemetry));
      client.publish(`${topicRoot}/${zoneConfig.zoneId}/status`, JSON.stringify(status));
      publishSuccessTotal += 2;
      messagesByZone[zoneConfig.zoneId] = (messagesByZone[zoneConfig.zoneId] || 0) + 2;

      for (const alert of telemetry.alerts) {
        client.publish(
          `${topicRoot}/${zoneConfig.zoneId}/alerts`,
          JSON.stringify({
            zoneId: zoneConfig.zoneId,
            deviceId: zoneConfig.zoneId,
            severity: alert.severity,
            code: alert.code,
            message: alert.message,
            scenario,
            ts: telemetry.ts,
          }),
        );
        publishSuccessTotal += 1;
        messagesByZone[zoneConfig.zoneId] = (messagesByZone[zoneConfig.zoneId] || 0) + 1;
      }
    } catch (error) {
      publishFailureTotal += 1;
      console.error("simulator publish error:", error.message);
    }
  }
  console.log("simulator published greenhouse batch for zones:", zoneConfigs.map((zone) => zone.zoneId).join(", "));
}

client.on("connect", () => {
  console.log("simulator connected to mqtt broker:", mqttUrl);

  if (!publishTimer) {
    publishAll();
    publishTimer = setInterval(publishAll, intervalMs);
  }
});

client.on("reconnect", () => {
  mqttReconnectsTotal += 1;
  console.log("simulator reconnecting to mqtt broker:", mqttUrl);
});

client.on("close", () => {
  console.log("simulator mqtt connection closed");
});

client.on("offline", () => {
  console.log("simulator mqtt client offline");
});

client.on("error", (error) => {
  console.error("simulator mqtt error:", error.message);
});

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type",
};

const json = (payload, status = 200) =>
  new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
      ...corsHeaders,
    },
  });

Bun.serve({
  port: httpPort,
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    if (request.method === "GET" && url.pathname === "/health") {
      return json({
        ok: true,
        mqttUrl,
        mqttConnected: client.connected,
        scenario,
        zoneCount: zoneConfigs.length,
        zones: zoneConfigs,
      });
    }

    if (request.method === "GET" && url.pathname === "/scenario") {
      return json({
        scenario,
        available: [...allowedScenarios],
      });
    }

    if (request.method === "GET" && url.pathname === "/state") {
      const requestedZoneId = url.searchParams.get("zoneId");

      if (requestedZoneId) {
        const zoneConfig = zoneConfigs.find((zone) => zone.zoneId === requestedZoneId);
        const requestedState = zoneStates.get(requestedZoneId);

        if (!zoneConfig || !requestedState) {
          return json({ error: "unknown zoneId" }, 404);
        }

        return json({
          zoneId: requestedZoneId,
          scenario,
          tick,
          state: requestedState,
          preview: buildTelemetryPayload(requestedState),
        });
      }

      return json({
        scenario,
        tick,
        zones: zoneConfigs,
        states: serializeZoneStates(),
        preview: Object.fromEntries(
          zoneConfigs.map((zoneConfig) => {
            const currentState = zoneStates.get(zoneConfig.zoneId);
            return [zoneConfig.zoneId, buildTelemetryPayload(currentState)];
          }),
        ),
      });
    }

    if (request.method === "POST" && url.pathname.startsWith("/scenario/")) {
      const next = url.pathname.split("/").pop();

      if (!allowedScenarios.has(next)) {
        return json({ error: "invalid scenario" }, 400);
      }

      resetStateForScenario(next);
      return json({ ok: true, scenario });
    }

    if (request.method === "GET" && url.pathname === "/metrics") {
      return new Response(renderMetrics(), {
        status: 200,
        headers: {
          "content-type": "text/plain; version=0.0.4; charset=utf-8",
          "cache-control": "no-store",
        },
      });
    }

    return json({ error: "not found" }, 404);
  },
});

