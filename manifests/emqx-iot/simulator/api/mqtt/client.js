import mqtt from "mqtt";

export function createMqttClient({ config, telemetryService }) {
  const client = mqtt.connect(config.mqttUrl, {
    reconnectPeriod: 3000,
    connectTimeout: 10000,
  });

  client.on("connect", () => {
    client.subscribe(`${config.topicRoot}/+/telemetry`);
    client.subscribe(`${config.topicRoot}/+/alerts`);
    client.subscribe(`${config.topicRoot}/+/status`);
  });

  client.on("message", async (topic, payload) => {
    try {
        await telemetryService.processMessage(topic, payload);
    } catch (error) {
        console.error("Failed to process MQTT Message: ", topic, error.message);
    }
  });

  client.on("error", (error) => {
    console.error("API MQTT error:", error.message);
  });

  return client;
}
