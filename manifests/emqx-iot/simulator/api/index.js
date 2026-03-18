import { readdir, readFile } from "node:fs/promises";
import mqtt from "mqtt";
import pg from "pg";

const { Pool } = pg;

const bootstrapSqlDir = process.env.DB_BOOTSTRAP_SQL_DIR || "/app/db-init";
const bootstrapMaxAttempts = Number(process.env.DB_BOOTSTRAP_MAX_ATTEMPTS || 20);
const bootstrapRetryDelayMs = Number(process.env.DB_BOOTSTRAP_RETRY_DELAY_MS || 3000);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const db = new Pool({
  host: process.env.DB_HOST || "iot-timescaledb",
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || "iot_playground",
  user: process.env.DB_USER || "iot_app",
  password: process.env.DB_PASSWORD || "change-me",
  max: 10,
});

async function initDb() {
  await db.query('CREATE EXTENSION IF NOT EXISTS timescaledb');

  const scriptNames = (await readdir(bootstrapSqlDir))
    .filter((name) => name.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  for (const scriptName of scriptNames) {
    const script = await readFile(`${bootstrapSqlDir}/${scriptName}`, "utf8");

    if (!script.trim()) {
      continue;
    }

    console.log(`applying database bootstrap script: ${scriptName}`);
    await db.query(script);
  }
}

async function initDbWithRetry() {
  for (let attempt = 1; attempt <= bootstrapMaxAttempts; attempt += 1) {
    try {
      await initDb();
      return;
    } catch (error) {
      if (attempt === bootstrapMaxAttempts) {
        throw error;
      }

      console.error(`database bootstrap attempt ${attempt} failed: ${error.message}`);
      await sleep(bootstrapRetryDelayMs);
    }
  }
}

async function warmCacheFromDb() {
  const restoredDevices = await loadDeviceStates();
  for (const [deviceId, device] of restoredDevices.entries()) {
    devices.set(deviceId, device);
  }

  const restoredEvents = await recentEvents(historySize);
  events.splice(0, events.length, ...restoredEvents);

  for (const deviceId of restoredDevices.keys()) {
    const points = await telemetryHistory(deviceId, historyPoints);
    if (points.length) {
      history.set(deviceId, points);
    }
  }
}

const port = Number(process.env.API_PORT || 8080);
const mqttUrl = process.env.MQTT_URL || "mqtt://emqx-listeners:1883";
const topicRoot = process.env.MQTT_TOPIC_ROOT || "site/alpha/devices";
const historySize = Number(process.env.EVENT_HISTORY_SIZE || 250);
const historyPoints = Number(process.env.HISTORY_POINTS || 300);

const devices = new Map();
const events = [];
const history = new Map();

const syntheticZoneIds = [
  "greenhouse-a-north",
  "greenhouse-a-center",
  "greenhouse-a-south",
  "greenhouse-a-west",
  "greenhouse-a-east",
  "greenhouse-a-propagation",
];
const syntheticZoneMeta = {
  "greenhouse-a-north": { name: "North Bay", offset: 0, severity: "normal" },
  "greenhouse-a-center": { name: "Center Bay", offset: 1, severity: "warning" },
  "greenhouse-a-south": { name: "South Bay", offset: 2, severity: "critical" },
  "greenhouse-a-west": { name: "West Bay", offset: 3, severity: "normal" },
  "greenhouse-a-east": { name: "East Bay", offset: 4, severity: "warning" },
  "greenhouse-a-propagation": { name: "Propagation Bay", offset: 5, severity: "normal" },
};


function pushHistory(deviceId, point) {
  if (!history.has(deviceId)) {
    history.set(deviceId, []);
  }

  const points = history.get(deviceId);
  points.push(point);
  
  if (points.length > historyPoints) {
    points.splice(0, points.length - historyPoints);
  }
}

function normalizeTelemetry(message, topic) {

  const deviceId = message.deviceId || message.zoneId || topic.split("/").at(-2);

  return {
    deviceId,
    zoneId: message.zoneId || deviceId,
    scenario: message.scenario || "unknown",
    severity: message.severity || "normal",
    online: message.online !== false,
    ts: message.ts || new Date().toISOString(),

    outdoor: message.outdoor || {},
    indoor: message.indoor || {},
    soil: message.soil || {},
    actuators: message.actuators || {},
    derived: message.derived || {},
    alerts: Array.isArray(message.alerts) ? message.alerts : [],

    temperature: message.temperature ?? message.indoor?.temperature ?? null,
    humidity: message.humidity ?? message.indoor?.humidity ?? null,
    pressure: message.pressure ?? message.indoor?.pressure ?? null,
    battery: message.battery ?? message.soil?.tankLevel ?? null,
  };
}

function historyPointFromTelemetry(normalized) {
  return {
    ts: normalized.ts,
    scenario: normalized.scenario,
    severity: normalized.severity,
    temperature: normalized.indoor.temperature ?? null,
    humidity: normalized.indoor.humidity ?? null,
    co2: normalized.indoor.co2 ?? null,
    par: normalized.indoor.par ?? null,
    pressure: normalized.indoor.pressure ?? null,
    dewPoint: normalized.derived.dewPoint ?? normalized.indoor.dewPoint ?? null,
    vpd: normalized.derived.vpd ?? normalized.indoor.vpd ?? null,
    soilMoisture: normalized.soil.moisture ?? null,
    soilTemperature: normalized.soil.temperature ?? null,
    tankLevel: normalized.soil.tankLevel ?? null,
    irrigationFlow: normalized.soil.irrigationFlow ?? null,
  };
}

function avg(values) {
  const valid = values.filter((value) => typeof value === "number" && Number.isFinite(value));
  if (!valid.length) return null;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function seedZoneSnapshot(zoneId) {
  const meta = syntheticZoneMeta[zoneId] || syntheticZoneMeta["greenhouse-a-north"];
  const offset = meta.offset;
  const now = Date.now();
  const phase = Math.floor(now / 60000) % 144;
  const temp = 22.8 + offset * 1.35 + Math.sin((phase + offset * 7) / 5) * 0.9;
  const humidity = 69 - offset * 4 + Math.cos((phase + offset * 3) / 6) * 3.8;
  const moisture = 0.33 - offset * 0.035 + Math.sin((phase + offset * 2) / 8) * 0.018;
  const vent = Math.max(0, Math.min(1, 0.24 + offset * 0.12 + Math.sin((phase + offset) / 4) * 0.08));
  const fan = Math.max(0, Math.min(1, 0.3 + offset * 0.14 + Math.cos((phase + offset) / 5) * 0.1));
  const heater = Math.max(0, Math.min(1, 0.2 - offset * 0.05 + Math.cos((phase + offset) / 9) * 0.08));
  const irrigation = Math.max(0, Math.min(1, 0.22 + offset * 0.1 + Math.sin((phase + offset) / 7) * 0.09));
  const scenario = offset === 0 ? "baseline-day" : offset === 1 ? "humidity-recovery" : "high-radiation-stress";
  const alerts = meta.severity === "critical"
    ? ["Irrigation pressure unstable", "Heat drift beyond setpoint"]
    : meta.severity === "warning"
      ? ["Humidity plume near ridge vent"]
      : [];

  return {
    deviceId: zoneId,
    zoneId,
    scenario,
    severity: meta.severity,
    online: true,
    ts: new Date(now).toISOString(),
    outdoor: {
      temperature: 18.5,
      humidity: 61,
      solar: 0.62,
      wind: 2.1,
    },
    indoor: {
      temperature: temp,
      humidity,
      co2: 560 + offset * 120,
      par: 610 + offset * 70,
      pressure: 1012,
    },
    soil: {
      moisture,
      temperature: 20.2 + offset * 0.6,
      ec: 1.7 + offset * 0.1,
      ph: 6.1 + offset * 0.04,
      tankLevel: 78 - offset * 10,
      irrigationFlow: 1.2 + irrigation * 2.2,
    },
    actuators: {
      vent,
      heater,
      fan,
      mister: Math.max(0, Math.min(1, 0.12 + offset * 0.08)),
      irrigation,
      growLight: offset === 2 ? 0.08 : 0.05,
    },
    derived: {
      dewPoint: temp - ((100 - humidity) / 5),
      vpd: Math.max(0.4, Math.min(2.2, 0.9 + offset * 0.28 + (temp - 24) * 0.08)),
      evapotranspiration: 2 + offset * 0.35,
      irrigationDemand: 46 + offset * 12,
    },
    alerts,
    lastSeen: new Date(now).toISOString(),
    synthetic: true,
  };
}

function syntheticHistoryFor(deviceId) {
  const seed = seedZoneSnapshot(deviceId);
  const offset = syntheticZoneMeta[deviceId]?.offset || 0;
  return Array.from({ length: 18 }, (_, idx) => ({
    ts: new Date(Date.now() - (17 - idx) * 5 * 60_000).toISOString(),
    scenario: seed.scenario,
    severity: seed.severity,
    temperature: (seed.indoor.temperature || 0) + Math.sin((idx + offset) / 4) * 0.7,
    humidity: (seed.indoor.humidity || 0) + Math.cos((idx + offset) / 5) * 2.4,
    co2: (seed.indoor.co2 || 0) + Math.sin((idx + offset) / 3) * 38,
    par: seed.indoor.par || null,
    pressure: seed.indoor.pressure || null,
    dewPoint: (seed.derived.dewPoint || 0) + Math.sin((idx + offset) / 6) * 0.3,
    vpd: (seed.derived.vpd || 0) + Math.sin((idx + offset) / 5) * 0.08,
    soilMoisture: (seed.soil.moisture || 0) + Math.cos((idx + offset) / 7) * 0.01,
    soilTemperature: (seed.soil.temperature || 0) + Math.sin((idx + offset) / 6) * 0.2,
    tankLevel: seed.soil.tankLevel || null,
    irrigationFlow: (seed.soil.irrigationFlow || 0) + Math.cos((idx + offset) / 6) * 0.12,
  }));
}

function materializedDevicesFrom(sourceDevices) {
  const merged = new Map(sourceDevices);
  syntheticZoneIds.forEach((zoneId) => {
    if (!merged.has(zoneId)) {
      merged.set(zoneId, seedZoneSnapshot(zoneId));
    }
  });
  return [...merged.values()].sort((a, b) => a.deviceId.localeCompare(b.deviceId));
}

function materializedDevices() {
  return materializedDevicesFrom(devices);
}

function mergeAlerts(baseAlerts, sourceDevices = devices) {
  const syntheticAlerts = syntheticZoneIds
    .filter((zoneId) => !sourceDevices.has(zoneId))
    .map((zoneId, index) => {
      const seed = seedZoneSnapshot(zoneId);
      return {
        topic: `${topicRoot}/${zoneId}/alerts`,
        type: "alerts",
        receivedAt: new Date(Date.now() - (index + 1) * 180_000).toISOString(),
        payload: {
          zoneId,
          deviceId: zoneId,
          severity: seed.severity,
          message: seed.alerts[0] || `${syntheticZoneMeta[zoneId].name} operating within nominal envelope`,
        },
      };
    });

  const seenZoneIds = new Set(
    [...baseAlerts, ...syntheticAlerts]
      .map((event) => event?.payload?.zoneId || event?.payload?.deviceId)
      .filter(Boolean)
  );

  const seededAlerts = [
    {
      zoneId: "greenhouse-a-center",
      severity: "warning",
      message: "Humidity plume detected below center ridge vent",
    },
    {
      zoneId: "greenhouse-a-south",
      severity: "critical",
      message: "Irrigation dosing pressure collapse at south manifold",
    },
    {
      zoneId: "greenhouse-a-east",
      severity: "warning",
      message: "Recirculation fan feedback lagging in east canopy row",
    },
  ]
    .filter((seed) => !seenZoneIds.has(seed.zoneId))
    .map((seed, index) => ({
      topic: `${topicRoot}/${seed.zoneId}/alerts`,
      type: "alerts",
      receivedAt: new Date(Date.now() - (index + 1) * 240_000).toISOString(),
      payload: {
        zoneId: seed.zoneId,
        deviceId: seed.zoneId,
        severity: seed.severity,
        message: seed.message,
      },
    }));

  return [...baseAlerts, ...syntheticAlerts, ...seededAlerts]
    .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
    .slice(0, 100);
}


function greenhouseSummary() {
  const all = materializedDevices();

  return {
    zones: all.length,
    online: all.filter((d) => d.online !== false).length,
    warning: all.filter((d) => d.severity === "warning").length,
    critical: all.filter((d) => d.severity === "critical").length,
    avgTemperature: avg(all.map((d) => d.indoor?.temperature)),
    avgHumidity: avg(all.map((d) => d.indoor?.humidity)),
    avgCo2: avg(all.map((d) => d.indoor?.co2)),
    avgSoilMoisture: avg(all.map((d) => d.soil?.moisture)),
    avgVpd: avg(all.map((d) => d.derived?.vpd)),
  };
}

async function persistBronzeEvent(event) {
  const payload = event.payload || {};

  await db.query(
    `INSERT INTO bronze.events_raw (
      source_topic,
      event_type,
      device_id,
      zone_id,
      event_ts,
      payload
    ) VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
    [
      event.topic,
      event.type,
      payload.deviceId || payload.zoneId || null,
      payload.zoneId || payload.deviceId || null,
      event.receivedAt,
      JSON.stringify(payload),
    ]
  );
}



async function persistBronzeTelemetry(topic, normalized) {
  await db.query(
    `INSERT INTO bronze.telemetry_raw (
      source_topic,
      message_type,
      device_id,
      zone_id,
      event_ts,
      payload
    ) VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
    [
      topic,
      "telemetry",
      normalized.deviceId,
      normalized.zoneId,
      normalized.ts,
      JSON.stringify(normalized),
    ]
  );
}

async function upsertDeviceState(device) {
  await db.query(
    `INSERT INTO silver.device_state_latest (
      device_id,
      zone_id,
      last_topic,
      last_seen,
      state
    )
    VALUES ($1, $2, $3, $4, $5::jsonb)
    ON CONFLICT (device_id) DO UPDATE SET
      zone_id = EXCLUDED.zone_id,
      last_topic = EXCLUDED.last_topic,
      last_seen = EXCLUDED.last_seen,
      state = EXCLUDED.state`,
    [
      device.deviceId,
      device.zoneId,
      device.lastTopic || null,
      device.lastSeen,
      JSON.stringify(device),
    ]
  );
}

async function recentEvents(limit = 250) {
  const { rows } = await db.query(
    `SELECT
      source_topic AS topic,
      event_type AS type,
      event_ts AS "receivedAt",
      payload
     FROM bronze.events_raw
     ORDER BY event_ts DESC, ingest_id DESC
     LIMIT $1`,
    [limit]
  );
  return rows;
}


async function telemetryHistory(deviceId, limit = historyPoints) {
  const { rows } = await db.query(
    `SELECT
      ts,
      scenario,
      severity,
      temperature,
      humidity,
      co2,
      par,
      pressure,
      dew_point AS "dewPoint",
      vpd,
      soil_moisture AS "soilMoisture",
      soil_temperature AS "soilTemperature",
      tank_level AS "tankLevel",
      irrigation_flow AS "irrigationFlow"
     FROM silver.telemetry
     WHERE device_id = $1
     ORDER BY ts DESC
     LIMIT $2`,
    [deviceId, limit]
  );
  return rows.reverse();
}


async function loadDeviceStates() {
  const { rows } = await db.query(
    `SELECT device_id, state
     FROM silver.device_state_latest
     ORDER BY last_seen DESC`
  );

  const restored = new Map();
  for (const row of rows) {
    restored.set(row.device_id, row.state);
  }
  return restored;
}


async function loadRecentAlerts(limit = 100) {
  const silverResult = await db.query(
    `SELECT 
      source_topic AS topic, 
      'alerts' AS type, 
      event_ts AS "receivedAt", 
      payload
    FROM silver.alerts
    ORDER BY event_ts DESC
    LIMIT $1`,
    [limit]
  );

  if (silverResult.rows.length) {
    return silverResult.rows;
  }

  const bronzeResult = await db.query(
    `SELECT
      source_topic AS topic,
      event_type AS type,
      event_ts AS "receivedAt",
      payload
     FROM bronze.events_raw
     WHERE event_type = 'alerts'
     ORDER BY event_ts DESC, ingest_id DESC
     LIMIT $1`,
    [limit]
  );

  return bronzeResult.rows;
}

async function loadGoldFleetSummary() {
  const { rows } = await db.query(
    `SELECT *
     FROM gold.fleet_summary_latest`
  );
  return rows[0] || null;
}

async function loadGoldZoneHealth() {
  const { rows } = await db.query(
    `SELECT *
     FROM gold.zone_health_latest
     ORDER BY zone_id ASC`
  );
  return rows;
}

async function loadGoldAlertCounts(limit = 72) {
  const { rows } = await db.query(
    `SELECT
      bucket,
      zone_id,
      severity,
      alert_count
     FROM gold.alert_counts_1h
     ORDER BY bucket DESC, zone_id ASC, severity ASC
     LIMIT $1`,
    [limit]
  );
  return rows;
}

async function loadGoldZoneMetrics(limit = 288) {
  const { rows } = await db.query(
    `SELECT
      bucket,
      zone_id,
      avg_temperature,
      min_temperature,
      max_temperature,
      avg_humidity,
      avg_co2,
      avg_vpd,
      avg_soil_moisture,
      avg_irrigation_flow,
      sample_count
     FROM gold.zone_metrics_5m
     ORDER BY bucket DESC, zone_id ASC
     LIMIT $1`,
    [limit]
  );
  return rows;
}

async function checkDbConnected() {
  try {
    await db.query("SELECT 1");
    return true;
  } catch (error) {
    return false;
  }
}

try {
  await initDbWithRetry();
  await warmCacheFromDb();
} catch (error) {
  console.error("database bootstrap failed:", error.message);
}


const mqttClient = mqtt.connect(mqttUrl, {
  reconnectPeriod: 3000,
  connectTimeout: 10000,
});

mqttClient.on("connect", () => {
  console.log("api connected to mqtt broker:", mqttUrl);

  mqttClient.subscribe(`${topicRoot}/+/telemetry`, (err) => {
    if (err) console.error("subscribe telemetry failed:", err.message);
    else console.log("subscribed to telemetry");
  });

  mqttClient.subscribe(`${topicRoot}/+/alerts`, (err) => {
    if (err) console.error("subscribe alerts failed:", err.message);
    else console.log("subscribed to alerts");
  });

  mqttClient.subscribe(`${topicRoot}/+/status`, (err) => {
    if (err) console.error("subscribe status failed:", err.message);
    else console.log("subscribed to status");
  });
});

mqttClient.on("reconnect", () => {
  console.log("api reconnecting to mqtt broker:", mqttUrl);
});

mqttClient.on("close", () => {
  console.log("api mqtt connection closed");
});

mqttClient.on("offline", () => {
  console.log("api mqtt client offline");
});

mqttClient.on("error", (error) => {
  console.error("api mqtt error:", error.message);
});

mqttClient.on("message", async (topic, payload) => {
  try {
    const message = JSON.parse(payload.toString());

    const event = {
      topic,
      type: topic.split("/").at(-1),
      receivedAt: new Date().toISOString(),
      payload: message,
    };

    console.log("API received message:", topic);

    if (event.type === "telemetry") {
      const normalized = normalizeTelemetry(message, topic);
      const device = {
        ...devices.get(normalized.deviceId),
        ...normalized,
        lastTopic: topic,
        lastSeen: event.receivedAt,
      };

      devices.set(normalized.deviceId, device);

      const point = historyPointFromTelemetry(normalized);
      pushHistory(normalized.deviceId, point);

      await persistBronzeTelemetry(topic, normalized);
      await upsertDeviceState(device);
    }

    if (event.type === "status") {

      const deviceId = message.deviceId || message.zoneId || topic.split("/").at(-2);

      const device = {
        ...devices.get(deviceId),
        ...message,
        deviceId,
        zoneId: message.zoneId || deviceId,
        lastTopic: topic,
        lastSeen: event.receivedAt,
      };

      devices.set(deviceId, device);
      await upsertDeviceState(device);
    }

    events.unshift(event);
    if (events.length > historySize) {
      events.length = historySize;
    }

    await persistBronzeEvent(event);

  } catch (error) {
    console.error("failed to process message:", topic, error.message);
  }
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
  port,
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    if (url.pathname === "/health") {
      const dbConnected = await checkDbConnected();
      return json({
        ok: true,
        mqttUrl,
        mqttConnected: mqttClient.connected,
        dbConnected,
        devices: materializedDevices().length,
        events: events.length,
        historyPoints,
      });
    }

    if (url.pathname === "/devices") {
      const persisted = await loadDeviceStates();
      return json(materializedDevicesFrom(persisted));
    }

    if (url.pathname === "/events") {
      return json(await recentEvents(historySize));
    }

    if (url.pathname === "/summary") {
      const persisted = await loadDeviceStates();
      const deviceList = materializedDevicesFrom(persisted);
      return json(greenhouseSummary(deviceList));
    }

    if (url.pathname.startsWith("/history/")) {
      const deviceId = url.pathname.split("/").pop();
      const rows = await telemetryHistory(deviceId);
      return json(rows.length ? rows : syntheticHistoryFor(deviceId));
    }

    if (url.pathname.startsWith("/zone/")) {
      const deviceId = url.pathname.split("/").pop();
      const persisted = await loadDeviceStates();
      const device =
        persisted.get(deviceId) ||
        materializedDevicesFrom(persisted).find((item) => item.deviceId === deviceId);

      if (!device) {
        return json({ error: "not-found" }, 404);
      }

      return json(device);
    }

    if (url.pathname === "/alerts") {
      const persistedDevices = await loadDeviceStates();
      const persistedAlerts = await loadRecentAlerts(100);
      return json(mergeAlerts(persistedAlerts, persistedDevices));
    }

    if (url.pathname === "/metrics") {
      return json({
        indoor: ["temperature", "humidity", "co2", "pressure", "par", "dewPoint", "vpd"],
        soil: ["moisture", "temperature", "ec", "ph", "tankLevel", "irrigationFlow"],
        actuators: ["vent", "heater", "fan", "mister", "irrigation", "growLight"],
        derived: ["dewPoint", "vpd", "evapotranspiration", "irrigationDemand"],
      });
    }

    if (url.pathname === "/gold/fleet-summary") {
      return json(await loadGoldFleetSummary());
    }

    if (url.pathname === "/gold/zones") {
      return json(await loadGoldZoneHealth());
    }

    if (url.pathname === "/gold/alerts-hourly") {
      const limit = Number(url.searchParams.get("limit") || 72);
      return json(await loadGoldAlertCounts(limit));
    }

    if (url.pathname === "/gold/zone-metrics") {
      const limit = Number(url.searchParams.get("limit") || 288);
      return json(await loadGoldZoneMetrics(limit));
    }

    return json({ error: "not found" }, 404);
  },
});

