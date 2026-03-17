import { clamp } from "./workspace-helpers.js";

export const zoneNames = {
  "greenhouse-a-north": "North Bay",
  "greenhouse-a-center": "Center Bay",
  "greenhouse-a-south": "South Bay",
  "greenhouse-a-west": "West Bay",
  "greenhouse-a-east": "East Bay",
  "greenhouse-a-propagation": "Propagation Bay",
  "greenhouse-a": "North Bay"
};

export const zoneBase = [
  {
    id: "greenhouse-a-north",
    name: "North Bay",
    x: 90,
    y: 120,
    width: 245,
    height: 320,
    assets: [
      { id: "north-fans", name: "Supply fan bank", type: "air handling", metricLabel: "Airflow output", metricUnit: " %" },
      { id: "north-vent", name: "Roof vent array", type: "ventilation", metricLabel: "Vent position", metricUnit: " %" },
      { id: "north-heater", name: "Pipe heater loop", type: "thermal", metricLabel: "Heat demand", metricUnit: " %" },
      { id: "north-irrigation", name: "Irrigation manifold", type: "water", metricLabel: "Flow demand", metricUnit: " %" },
      { id: "north-mister", name: "Mist line", type: "humidification", metricLabel: "Mist duty", metricUnit: " %" },
      { id: "north-light", name: "Grow light rail", type: "lighting", metricLabel: "Lighting output", metricUnit: " %" },
      { id: "north-co2", name: "CO2 injector", type: "gas", metricLabel: "Injection duty", metricUnit: " %" }
    ]
  },
  {
    id: "greenhouse-a-center",
    name: "Center Bay",
    x: 363,
    y: 120,
    width: 245,
    height: 320,
    assets: [
      { id: "center-fans", name: "Circulation fans", type: "air handling", metricLabel: "Airflow output", metricUnit: " %" },
      { id: "center-vent", name: "Thermal ridge vent", type: "ventilation", metricLabel: "Vent position", metricUnit: " %" },
      { id: "center-heater", name: "Hydronic pipe loop", type: "thermal", metricLabel: "Heat demand", metricUnit: " %" },
      { id: "center-irrigation", name: "Root drip manifold", type: "water", metricLabel: "Flow demand", metricUnit: " %" },
      { id: "center-mister", name: "Fogging bar", type: "humidification", metricLabel: "Mist duty", metricUnit: " %" },
      { id: "center-light", name: "Supplemental light rack", type: "lighting", metricLabel: "Lighting output", metricUnit: " %" },
      { id: "center-co2", name: "CO2 injector", type: "gas", metricLabel: "Injection duty", metricUnit: " %" }
    ]
  },
  {
    id: "greenhouse-a-south",
    name: "South Bay",
    x: 636,
    y: 120,
    width: 245,
    height: 320,
    assets: [
      { id: "south-fans", name: "Exhaust fan bank", type: "air handling", metricLabel: "Airflow output", metricUnit: " %" },
      { id: "south-vent", name: "South ridge vent", type: "ventilation", metricLabel: "Vent position", metricUnit: " %" },
      { id: "south-heater", name: "Perimeter heat loop", type: "thermal", metricLabel: "Heat demand", metricUnit: " %" },
      { id: "south-irrigation", name: "Nutrient dosing bar", type: "water", metricLabel: "Flow demand", metricUnit: " %" },
      { id: "south-mister", name: "Humidity curtain", type: "humidification", metricLabel: "Mist duty", metricUnit: " %" },
      { id: "south-light", name: "Canopy light rail", type: "lighting", metricLabel: "Lighting output", metricUnit: " %" },
      { id: "south-co2", name: "CO2 injector", type: "gas", metricLabel: "Injection duty", metricUnit: " %" }
    ]
  },
  {
    id: "greenhouse-a-west",
    name: "West Bay",
    x: 120,
    y: 454,
    width: 220,
    height: 116,
    assets: [
      { id: "west-fans", name: "Crossflow fan bank", type: "air handling", metricLabel: "Airflow output", metricUnit: " %" },
      { id: "west-vent", name: "Side vent curtain", type: "ventilation", metricLabel: "Vent position", metricUnit: " %" },
      { id: "west-heater", name: "Bench heat loop", type: "thermal", metricLabel: "Heat demand", metricUnit: " %" },
      { id: "west-irrigation", name: "Irrigation rail", type: "water", metricLabel: "Flow demand", metricUnit: " %" },
      { id: "west-mister", name: "Cooling mist line", type: "humidification", metricLabel: "Mist duty", metricUnit: " %" },
      { id: "west-light", name: "Photoperiod rail", type: "lighting", metricLabel: "Lighting output", metricUnit: " %" },
      { id: "west-co2", name: "CO2 injector", type: "gas", metricLabel: "Injection duty", metricUnit: " %" }
    ]
  },
  {
    id: "greenhouse-a-east",
    name: "East Bay",
    x: 392,
    y: 454,
    width: 220,
    height: 116,
    assets: [
      { id: "east-fans", name: "Recirculation fan bank", type: "air handling", metricLabel: "Airflow output", metricUnit: " %" },
      { id: "east-vent", name: "Ridge vent segment", type: "ventilation", metricLabel: "Vent position", metricUnit: " %" },
      { id: "east-heater", name: "Hydronic bench loop", type: "thermal", metricLabel: "Heat demand", metricUnit: " %" },
      { id: "east-irrigation", name: "Drip manifold", type: "water", metricLabel: "Flow demand", metricUnit: " %" },
      { id: "east-mister", name: "Fogging rail", type: "humidification", metricLabel: "Mist duty", metricUnit: " %" },
      { id: "east-light", name: "Canopy light rack", type: "lighting", metricLabel: "Lighting output", metricUnit: " %" },
      { id: "east-co2", name: "CO2 injector", type: "gas", metricLabel: "Injection duty", metricUnit: " %" }
    ]
  },
  {
    id: "greenhouse-a-propagation",
    name: "Propagation Bay",
    x: 664,
    y: 454,
    width: 220,
    height: 116,
    assets: [
      { id: "prop-fans", name: "Low-velocity fans", type: "air handling", metricLabel: "Airflow output", metricUnit: " %" },
      { id: "prop-vent", name: "Nursery vent curtain", type: "ventilation", metricLabel: "Vent position", metricUnit: " %" },
      { id: "prop-heater", name: "Root-zone heat mat loop", type: "thermal", metricLabel: "Heat demand", metricUnit: " %" },
      { id: "prop-irrigation", name: "Misting manifold", type: "water", metricLabel: "Flow demand", metricUnit: " %" },
      { id: "prop-mister", name: "Propagation fogger", type: "humidification", metricLabel: "Mist duty", metricUnit: " %" },
      { id: "prop-light", name: "Nursery light bar", type: "lighting", metricLabel: "Lighting output", metricUnit: " %" },
      { id: "prop-co2", name: "CO2 injector", type: "gas", metricLabel: "Injection duty", metricUnit: " %" }
    ]
  }
];

export function assetLoadForType(type, actuators = {}) {
  if (type === "air handling") return actuators.fan ?? 0;
  if (type === "ventilation") return actuators.vent ?? 0;
  if (type === "thermal") return actuators.heater ?? 0;
  if (type === "water") return actuators.irrigation ?? 0;
  if (type === "humidification") return actuators.mister ?? 0;
  if (type === "lighting") return actuators.growLight ?? 0;
  if (type === "gas") return clamp((actuators.vent ?? 0) * 0.28 + (actuators.fan ?? 0) * 0.12, 0, 1);
  return 0;
}

export function mapHistoryPoint(point) {
  return {
    ts: point.ts ?? point.timestamp ?? point.time ?? null,
    temperature: point.temperature ?? 0,
    humidity: point.humidity ?? 0,
    co2: point.co2 ?? 0,
    soilMoisture: point.soilMoisture ?? 0,
    irrigationFlow: point.irrigationFlow ?? 0,
    vpd: point.vpd ?? 0
  };
}

export function normalizeZone(zone, fallbackScenario = "baseline-day", index = 0) {
  const base = zoneBase.find((item) => item.id === (zone.deviceId || zone.zoneId)) || zoneBase[index] || zoneBase[0];
  const indoor = zone.indoor || {};
  const soil = zone.soil || {};
  const actuators = zone.actuators || {};
  const derived = zone.derived || {};

  return {
    id: zone.deviceId || zone.zoneId || base.id,
    name: zoneNames[zone.zoneId] || zoneNames[zone.deviceId] || base.name,
    scenario: zone.scenario || fallbackScenario,
    severity: zone.severity || "normal",
    alerts: Array.isArray(zone.alerts) ? zone.alerts : [],
    outdoor: zone.outdoor || {},
    indoor,
    soil,
    actuators,
    derived,
    x: base.x,
    y: base.y,
    width: base.width,
    height: base.height,
    assets: base.assets.map((asset) => ({
      ...asset,
      load: assetLoadForType(asset.type, actuators)
    }))
  };
}

export function createFallbackEdgeDevices(tick = 0) {
  const pulse = Math.sin(tick / 3);

  return [
    {
      id: "edge-north-1",
      name: "North Edge Gateway",
      zoneId: "greenhouse-a-north",
      zoneName: "North Bay",
      status: pulse > 0.55 ? "degraded" : "healthy",
      lastSeenMs: pulse > 0.55 ? 42000 : 4000,
      uptimeHours: 312,
      firmwareVersion: "1.8.2",
      brokerLink: pulse > 0.55 ? "unstable" : "linked",
      signalRssi: pulse > 0.55 ? -81 : -62,
      packetLossPct: pulse > 0.55 ? 4.2 : 0.3,
      sensors: [
        { id: "north-temp-1", name: "Canopy Temp", metricType: "temperature", status: "healthy", lastReading: "23.6 C", lastSeenMs: 3000, batteryPct: 91 },
        { id: "north-hum-1", name: "Humidity Probe", metricType: "humidity", status: "healthy", lastReading: "68 %", lastSeenMs: 5000, batteryPct: 88 },
        { id: "north-soil-1", name: "Soil Sensor", metricType: "soil moisture", status: pulse > 0.55 ? "stale" : "healthy", lastReading: "0.31", lastSeenMs: pulse > 0.55 ? 52000 : 4000, batteryPct: 54 }
      ]
    },
    {
      id: "edge-south-1",
      name: "South Edge Gateway",
      zoneId: "greenhouse-a-south",
      zoneName: "South Bay",
      status: "offline",
      lastSeenMs: 185000,
      uptimeHours: 17,
      firmwareVersion: "1.7.9",
      brokerLink: "down",
      signalRssi: -96,
      packetLossPct: 100,
      sensors: [
        { id: "south-temp-1", name: "Canopy Temp", metricType: "temperature", status: "offline", lastReading: "--", lastSeenMs: 185000, batteryPct: 0 },
        { id: "south-flow-1", name: "Irrigation Flow", metricType: "flow", status: "offline", lastReading: "--", lastSeenMs: 185000, batteryPct: 0 }
      ]
    }
  ];
}

export function createSyntheticZoneEdgeDevice(zone) {
  const severity = zone.severity === "critical" ? "degraded" : zone.severity === "warning" ? "degraded" : "healthy";
  const soilStatus = zone.severity === "critical" ? "offline" : zone.severity === "warning" ? "stale" : "healthy";
  const humidityStatus = zone.severity === "warning" ? "stale" : "healthy";

  return {
    id: `synthetic-${zone.id}`,
    name: `${zone.name} Zone Gateway`,
    zoneId: zone.id,
    zoneName: zone.name,
    status: severity,
    brokerLink: zone.severity === "critical" ? "unstable" : "linked",
    lastSeenMs: zone.severity === "critical" ? 82000 : zone.severity === "warning" ? 24000 : 6000,
    uptimeHours: 128,
    firmwareVersion: "sim-1.0",
    signalRssi: zone.severity === "critical" ? -88 : -66,
    packetLossPct: zone.severity === "critical" ? 12 : zone.severity === "warning" ? 4.1 : 0.8,
    sensors: [
      { id: `${zone.id}-air-temp`, name: "Air Temp", metricType: "temperature", status: "healthy", lastReading: `${(zone.indoor.temperature ?? 0).toFixed(1)} C`, lastSeenMs: 5000, batteryPct: 81 },
      { id: `${zone.id}-humidity`, name: "Humidity", metricType: "humidity", status: humidityStatus, lastReading: `${Math.round(zone.indoor.humidity ?? 0)} %`, lastSeenMs: humidityStatus === "stale" ? 42000 : 5000, batteryPct: 73 },
      { id: `${zone.id}-root-water`, name: "Root Moisture", metricType: "soil moisture", status: soilStatus, lastReading: `${(zone.soil.moisture ?? 0).toFixed(2)}`, lastSeenMs: soilStatus === "offline" ? 110000 : soilStatus === "stale" ? 52000 : 4000, batteryPct: soilStatus === "offline" ? 0 : 62 },
      { id: `${zone.id}-irrigation`, name: "Irrigation Flow", metricType: "flow", status: zone.severity === "critical" ? "stale" : "healthy", lastReading: `${(zone.soil.irrigationFlow ?? 0).toFixed(1)} L/min`, lastSeenMs: zone.severity === "critical" ? 48000 : 6000, batteryPct: 68 }
    ]
  };
}

export function allTwinGateways(state) {
  if (state.edgeDevices.length) return state.edgeDevices;
  return state.zones.map((zone) => createSyntheticZoneEdgeDevice(zone));
}

export function createFallbackData(tick) {
  const drift = Math.sin(tick / 4);
  const createZone = (base, offset, severity) => {
    const temp = 23.4 + offset * 1.6 + drift * 1.2;
    const humidity = 67 - offset * 4 + Math.cos(tick / 5 + offset) * 6;
    const moisture = 0.34 - offset * 0.04 + Math.sin(tick / 6 + offset) * 0.025;
    const vpd = clamp(0.9 + offset * 0.35 + (temp - 24) * 0.08, 0.4, 2.3);
    const co2 = 540 + offset * 120 + Math.sin(tick / 3 + offset) * 90;
    const irrigationLoad = clamp(0.25 + offset * 0.12 + Math.cos(tick / 5 + offset) * 0.15, 0, 1);
    const ventLoad = clamp(0.22 + offset * 0.18 + Math.sin(tick / 4 + offset) * 0.2, 0, 1);
    const fanLoad = clamp(0.28 + offset * 0.16 + Math.cos(tick / 3 + offset) * 0.18, 0, 1);
    const heaterLoad = clamp(offset === 2 ? 0.06 : 0.18 + Math.cos(tick / 8 + offset) * 0.1, 0, 1);
    const faultAlerts = severity === "critical"
      ? ["Irrigation pressure unstable", "Heat drift beyond setpoint"]
      : severity === "warning"
        ? ["Humidity plume near ridge vent"]
        : [];

    return {
      zoneId: base.id,
      deviceId: base.id,
      scenario: tick % 18 > 12 ? "high-radiation-stress" : "baseline-day",
      severity,
      indoor: {
        temperature: temp,
        humidity,
        co2,
        par: 620 + offset * 80,
        pressure: 1012
      },
      soil: {
        moisture,
        temperature: 20.4 + offset * 0.7,
        ec: 1.7 + offset * 0.12,
        ph: 6.1 + offset * 0.05,
        tankLevel: 76 - offset * 11 + Math.cos(tick / 7 + offset) * 5,
        irrigationFlow: 1.2 + irrigationLoad * 2.4
      },
      outdoor: {
        temperature: 18 + tick * 0.03,
        humidity: 62,
        solar: clamp(0.58 + Math.sin(tick / 7) * 0.18, 0, 1),
        wind: 2.1 + Math.cos(tick / 6) * 0.4
      },
      actuators: {
        vent: ventLoad,
        heater: heaterLoad,
        fan: fanLoad,
        mister: clamp(0.12 + offset * 0.1, 0, 1),
        irrigation: irrigationLoad,
        growLight: 0.06
      },
      derived: {
        dewPoint: temp - ((100 - humidity) / 5),
        vpd,
        evapotranspiration: 2 + offset * 0.4 + Math.sin(tick / 8 + offset) * 0.25,
        irrigationDemand: 48 + offset * 14 + Math.sin(tick / 4) * 8
      },
      alerts: faultAlerts
    };
  };

  const zones = [
    createZone(zoneBase[0], 0, "normal"),
    createZone(zoneBase[1], 1, "warning"),
    createZone(zoneBase[2], 2, "critical"),
    createZone(zoneBase[3], 3, "normal"),
    createZone(zoneBase[4], 4, "warning"),
    createZone(zoneBase[5], 5, "normal")
  ];

  const alerts = [
    {
      receivedAt: new Date(Date.now() - 90_000).toISOString(),
      type: "fault",
      payload: { zoneId: zones[2].zoneId, severity: "critical", message: "Irrigation dosing pressure collapse at south manifold" }
    },
    {
      receivedAt: new Date(Date.now() - 180_000).toISOString(),
      type: "warning",
      payload: { zoneId: zones[1].zoneId, severity: "warning", message: "Humidity plume detected below center ridge vent" }
    },
    {
      receivedAt: new Date(Date.now() - 420_000).toISOString(),
      type: "notice",
      payload: { zoneId: zones[0].zoneId, severity: "normal", message: "Night energy profile drifting toward daytime recipe" }
    }
  ];

  const history = Array.from({ length: 18 }, (_, idx) => ({
    ts: new Date(Date.now() - (17 - idx) * 5 * 60_000).toISOString(),
    temperature: 22 + Math.sin((tick + idx) / 4) * 1.8,
    humidity: 68 + Math.cos((tick + idx) / 5) * 6,
    co2: 590 + Math.sin((tick + idx) / 3) * 80,
    soilMoisture: 0.31 + Math.sin((tick + idx) / 7) * 0.03,
    irrigationFlow: 1.4 + Math.cos((tick + idx) / 6) * 0.4,
    vpd: 1.1 + Math.sin((tick + idx) / 5) * 0.18
  }));

  return {
    health: { mqttConnected: true, dbConnected: false },
    summary: {
      zones: zones.length,
      online: zones.length,
      warning: 2,
      critical: 1,
      avgTemperature: zones.reduce((sum, zone) => sum + zone.indoor.temperature, 0) / zones.length,
      avgHumidity: zones.reduce((sum, zone) => sum + zone.indoor.humidity, 0) / zones.length,
      avgCo2: zones.reduce((sum, zone) => sum + zone.indoor.co2, 0) / zones.length,
      avgSoilMoisture: zones.reduce((sum, zone) => sum + zone.soil.moisture, 0) / zones.length,
      avgVpd: zones.reduce((sum, zone) => sum + zone.derived.vpd, 0) / zones.length
    },
    devices: zones,
    alerts,
    history,
    scenario: zones[1].scenario
  };
}
