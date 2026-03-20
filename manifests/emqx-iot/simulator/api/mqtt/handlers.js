import {
  persistBronzeEvent,
  persistBronzeTelemetry,
  upsertDeviceState,
} from "../db/queries.js";

export function normalizeTelemetry(message, topic) {
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

export function createMessageHandler({ devices, events, historySize, pushHistory }) {
  return async function onMessage(topic, payload) {
    try {
      const message = JSON.parse(payload.toString());
      const event = {
        topic,
        type: topic.split("/").at(-1),
        receivedAt: new Date().toISOString(),
        payload: message,
      };

      if (event.type === "telemetry") {
        const normalized = normalizeTelemetry(message, topic);
        const device = {
          ...devices.get(normalized.deviceId),
          ...normalized,
          lastTopic: topic,
          lastSeen: event.receivedAt,
        };

        devices.set(normalized.deviceId, device);
        pushHistory(normalized.deviceId, normalized);

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
      if (events.length > historySize) events.length = historySize;

      await persistBronzeEvent(event);
    } catch (error) {
      console.error("failed to process message:", topic, error.message);
    }
  };
}
