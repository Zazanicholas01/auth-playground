export const config = {
  port: Number(process.env.API_PORT || 8080),
  mqttUrl: process.env.MQTT_URL || "mqtt://emqx-listeners:1883",
  topicRoot: process.env.MQTT_TOPIC_ROOT || "site/alpha/devices",
  historySize: Number(process.env.EVENT_HISTORY_SIZE || 250),
  historyPoints: Number(process.env.HISTORY_POINTS || 300),

  db: {
    host: process.env.DB_HOST || "iot-timescaledb",
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || "iot_playground",
    user: process.env.DB_USER || "iot_app",
    password: process.env.DB_PASSWORD || "change-me",
    max: 10,
  },

  bootstrapSqlDir: process.env.DB_BOOTSTRAP_SQL_DIR || "/app/db-init",
  bootstrapMaxAttempts: Number(process.env.DB_BOOTSTRAP_MAX_ATTEMPTS || 20),
  bootstrapRetryDelayMs: Number(process.env.DB_BOOTSTRAP_RETRY_DELAY_MS || 3000),
};
