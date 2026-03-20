function avg(values) {
  const valid = values.filter((value) => typeof value === "number" && Number.isFinite(value));
  if (!valid.length) return null;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
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

export function createTelemetryService({ repo, state, synthetic, config }) {
    function pushHistory(deviceId, point) {
        if (!state.history.has(deviceId)) state.history.set(deviceId, []);
        const points = state.history.get(deviceId);
        points.push(point);

        if (points.length > state.historyPoints) {
        points.splice(0, points.length - state.historyPoints);
        }
    }

    async function warmCache() {
        const restoredDevices = await repo.loadDeviceStates();
        for (const [deviceId, device] of restoredDevices.entries()) {
        state.devices.set(deviceId, device);
        }

        const restoredEvents = await repo.recentEvents(config.historySize);
        state.events.splice(0, state.events.length, ...restoredEvents);
    }

    async function processMessage(topic, payloadBuffer) {
        const message = JSON.parse(payloadBuffer.toString());

        const event = {
            topic,
            type: topic.split("/").at(-1),
            receivedAt: new Date().toISOString(),
            payload: message,
        };

        if (event.type === "telemetry") {
            const normalized = normalizeTelemetry(message, topic);
            const device = {
                ...state.devices.get(normalized.deviceId),
                ...normalized,
                lastTopic: topic,
                lastSeen: event.receivedAt,
            };

            state.devices.set(normalized.deviceId, device);
            pushHistory(normalized.deviceId, historyPointFromTelemetry(normalized));

            await repo.persistBronzeTelemetry(topic, normalized);
            await repo.upsertDeviceState(device);
        }

        if (event.type === "status") {
            const deviceId = message.deviceId || message.zoneId || topic.split("/").at(-2);
            const device = {
                ...state.devices.get(deviceId),
                ...message,
                deviceId,
                zoneId: message.zoneId || deviceId,
                lastTopic: topic,
                lastSeen: event.receivedAt,
            };

            state.devices.set(deviceId, device);
            await repo.upsertDeviceState(device);
        }

        state.events.unshift(event);
        if (state.events.length > state.historySize) {
        state.events.length = state.historySize;
        }

        await repo.persistBronzeEvent(event);
    }

    async function listDevices() {
        const persisted = await repo.loadDeviceStates();
        return synthetic.materializeDevices(persisted);
    }

    async function listEvents() {
        return repo.recentEvents(config.historySize);
    }

    async function getHistory(deviceId) {
        const rows = await repo.telemetryHistory(deviceId, config.historyPoints);
        return rows.length ? rows : synthetic.syntheticHistoryFor(deviceId);
    }

    async function getZone(deviceId) {
        const persisted = await repo.loadDeviceStates();
        const all = synthetic.materializeDevices(persisted);
        return all.find((item) => item.deviceId === deviceId) || null;
    }

    async function listAlerts() {
        return repo.loadRecentAlerts(100);
    }

    async function getSummary() {
        const persisted = await repo.loadDeviceStates();
        const all = synthetic.materializeDevices(persisted);

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

    return {
        warmCache,
        processMessage,
        listDevices,
        listEvents,
        getHistory,
        getZone,
        listAlerts,
        getSummary,
        getGoldFleetSummary: () => repo.loadGoldFleetSummary(),
        getGoldZoneHealth: () => repo.loadGoldZoneHealth(),
        getGoldAlertCounts: (limit) => repo.loadGoldAlertCounts(limit),
        getGoldZoneMetrics: (limit) => repo.loadGoldZoneMetrics(limit),
    };
}