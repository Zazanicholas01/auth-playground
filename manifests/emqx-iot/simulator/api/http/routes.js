import { json, noContent } from "./json.js";

export function registerRoutes(router, container) {
  const telemetryService = container.get("telemetryService");
  const syntheticService = container.get("synthetic");
  const mqttClient = container.get("mqttClient");
  const db = container.get("db");
  const config = container.get("config");

  router.add("OPTIONS", "/:any", async () => noContent());

  router.get("/health", async () => {
    const dbConnected = await db.checkConnected();

    return json({
      ok: true,
      mqttUrl: config.mqttUrl,
      mqttConnected: mqttClient.connected,
      dbConnected,
    });
  });

  router.get("/devices", async () => {
    const devices = await telemetryService.listDevices();
    return json(devices);
  });

  router.get("/events", async () => {
    const events = await telemetryService.listEvents();
    return json(events);
  });

  router.get("/summary", async () => {
    const summary = await telemetryService.getSummary();
    return json(summary);
  });

  router.get("/history/:deviceId", async ({ params }) => {
    const rows = await telemetryService.getHistory(params.deviceId);
    return json(rows);
  });

  router.get("/zone/:deviceId", async ({ params }) => {
    const zone = await telemetryService.getZone(params.deviceId);
    if (!zone) return json({ error: "not-found" }, 404);
    return json(zone);
  });

  router.get("/alerts", async () => {
    const alerts = await telemetryService.listAlerts();
    return json(alerts);
  });

  router.get("/gold/fleet-summary", async () => {
    return json(await telemetryService.getGoldFleetSummary());
  });

  router.get("/gold/zones", async () => {
    return json(await telemetryService.getGoldZoneHealth());
  });

  router.get("/gold/alerts-hourly", async ({ url }) => {
    const limit = Number(url.searchParams.get("limit") || 72);
    return json(await telemetryService.getGoldAlertCounts(limit));
  });

  router.get("/gold/zone-metrics", async ({ url }) => {
    const limit = Number(url.searchParams.get("limit") || 288);
    return json(await telemetryService.getGoldZoneMetrics(limit));
  });
}
