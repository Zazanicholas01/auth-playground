import { createContainer } from "./container.js";
import { config } from "./config.js";
import { createApiState } from "./state.js";

import { createDb } from "./db/client.js";
import { createBootstrapService } from "./db/bootstrap.js";
import { createTelemetryRepository } from "./db/queries.js";

import { createSyntheticService } from "./synthetic/zones.js";
import { createTelemetryService } from "./services/telemetry-service.js";
import { createMqttClient } from "./mqtt/client.js";

import { createRouter } from "./http/router.js";
import { registerRoutes } from "./http/routes.js";


const container = createContainer();

container.register("config", () => config);
container.register("state", (c) => createApiState(c.get("config")));

container.register("db", (c) => createDb(c.get("config")));
container.register("bootstrapService", (c) =>
  createBootstrapService({
    db: c.get("db"),
    config: c.get("config"),
  })
);
container.register("repo", (c) =>
  createTelemetryRepository({ db: c.get("db") })
);

container.register("synthetic", () => createSyntheticService());
container.register("telemetryService", (c) =>
  createTelemetryService({
    repo: c.get("repo"),
    state: c.get("state"),
    synthetic: c.get("synthetic"),
    config: c.get("config"),
  })
);

container.register("mqttClient", (c) =>
  createMqttClient({
    config: c.get("config"),
    telemetryService: c.get("telemetryService"),
  })
);
container.register("router", (c) => {
  const router = createRouter();
  registerRoutes(router, c);
  return router;
});

try {
  await container.get("bootstrapService").initWithRetry();
  await container.get("telemetryService").warmCache();
} catch (error) {
  console.error("Database Bootstrap failed: ", error.message);
}

const router = container.get("router");
const port = container.get("config").port;

Bun.serve({
  port,
  fetch(request) {
    return router.handle(request);
  },
});


// const state = {
//   devices: new Map(),
//   events: [],
//   history: new Map(),
// };

// function pushHistory(deviceId, point) {
//   if (!state.history.has(deviceId)) state.history.set(deviceId, []);
//   const points = state.history.get(deviceId);
//   points.push(point);

//   if (points.length > config.historyPoints) {
//     points.splice(0, points.length - config.historyPoints);
//   }
// }

// await initDbWithRetry();

// const restoredDevices = await loadDeviceStates();
// for (const [deviceId, device] of restoredDevices.entries()) {
//   state.devices.set(deviceId, device);
// }
// state.events.push(...await recentEvents(config.historySize));

// const mqttClient = createMqttClient({
//   mqttUrl: config.mqttUrl,
//   topicRoot: config.topicRoot,
//   onMessage: createMessageHandler({
//     devices: state.devices,
//     events: state.events,
//     historySize: config.historySize,
//     pushHistory,
//   }),
// });

// const routes = createRoutes({ mqttClient, config, state });

// Bun.serve({
//   port: config.port,
//   fetch(request) {
//     return handleRequest(request, routes);
//   },
// });
