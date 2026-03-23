from fastapi import APIRouter, Query, Request
from db import db
from settings import settings

router = APIRouter()


@router.get("/health")
async def health(request: Request):
    mqtt_consumer = request.app.state.mqtt_consumer
    return {
        "ok": True,
        "mqttUrl": settings.mqtt_url,
        "mqttConnected": mqtt_consumer.connected,
        "dbConnected": await db.check_connected(),
    }


@router.get("/devices")
async def devices(request: Request):
    return await request.app.state.telemetry_service.list_devices()


@router.get("/events")
async def events(request: Request):
    return await request.app.state.telemetry_service.list_events()


@router.get("/summary")
async def summary(request: Request):
    return await request.app.state.telemetry_service.get_summary()


@router.get("/history/{device_id}")
async def history(device_id: str, request: Request):
    return await request.app.state.telemetry_service.get_history(device_id)


@router.get("/zone/{device_id}")
async def zone(device_id: str, request: Request):
    zone_data = await request.app.state.telemetry_service.get_zone(device_id)
    if zone_data is None:
        return {"error": "not-found"}
    return zone_data


@router.get("/alerts")
async def alerts(request: Request):
    return await request.app.state.telemetry_service.list_alerts()


@router.get("/gold/fleet-summary")
async def gold_fleet_summary(request: Request):
    return await request.app.state.telemetry_service.get_gold_fleet_summary()


@router.get("/gold/zones")
async def gold_zones(request: Request):
    return await request.app.state.telemetry_service.get_gold_zone_health()


@router.get("/gold/alerts-hourly")
async def gold_alerts_hourly(request: Request, limit: int = Query(default=72)):
    return await request.app.state.telemetry_service.get_gold_alert_counts(limit)


@router.get("/gold/zone-metrics")
async def gold_zone_metrics(request: Request, limit: int = Query(default=288)):
    return await request.app.state.telemetry_service.get_gold_zone_metrics(limit)
