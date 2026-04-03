from fastapi import APIRouter, Depends, HTTPException, Query

from app.application.use_cases.health import HealthUseCase
from app.application.use_cases.telemetry import TelemetryUseCase
from app.presentation.api.auth import CurrentUser
from app.presentation.api.dependencies import get_current_user, get_health_use_case, get_telemetry_use_case

router = APIRouter()


@router.get("/health")
async def health(health_use_case: HealthUseCase = Depends(get_health_use_case)):
    return await health_use_case.get_status()


@router.get("/me")
async def me(current_user: CurrentUser = Depends(get_current_user)):
    return {
        "user_id": current_user.user_id,
        "username": current_user.username,
        "email": current_user.email,
        "role": current_user.role,
        "roles": list(current_user.roles),
    }


@router.get("/devices")
async def devices(
    telemetry: TelemetryUseCase = Depends(get_telemetry_use_case),
    _: CurrentUser = Depends(get_current_user),
):
    return await telemetry.list_devices()


@router.get("/events")
async def events(
    telemetry: TelemetryUseCase = Depends(get_telemetry_use_case),
    _: CurrentUser = Depends(get_current_user),
):
    return await telemetry.list_events()


@router.get("/summary")
async def summary(
    telemetry: TelemetryUseCase = Depends(get_telemetry_use_case),
    _: CurrentUser = Depends(get_current_user),
):
    return await telemetry.get_summary()


@router.get("/zone/{device_id}")
async def zone(
    device_id: str,
    telemetry: TelemetryUseCase = Depends(get_telemetry_use_case),
    _: CurrentUser = Depends(get_current_user),
):
    zone_data = await telemetry.get_zone(device_id)
    if zone_data is None:
        raise HTTPException(status_code=404, detail="not-found")
    return zone_data


@router.get("/alerts")
async def alerts(
    telemetry: TelemetryUseCase = Depends(get_telemetry_use_case),
    _: CurrentUser = Depends(get_current_user),
):
    return await telemetry.list_alerts()


@router.get("/gold/fleet-summary")
async def gold_fleet_summary(
    telemetry: TelemetryUseCase = Depends(get_telemetry_use_case),
    _: CurrentUser = Depends(get_current_user),
):
    return await telemetry.get_gold_fleet_summary()


@router.get("/gold/zones")
async def gold_zones(
    telemetry: TelemetryUseCase = Depends(get_telemetry_use_case),
    _: CurrentUser = Depends(get_current_user),
):
    return await telemetry.get_gold_zone_health()


@router.get("/gold/alerts-hourly")
async def gold_alerts_hourly(
    limit: int = Query(default=72),
    telemetry: TelemetryUseCase = Depends(get_telemetry_use_case),
    _: CurrentUser = Depends(get_current_user),
):
    return await telemetry.get_gold_alert_counts(limit)


@router.get("/gold/zone-metrics")
async def gold_zone_metrics(
    limit: int = Query(default=288),
    telemetry: TelemetryUseCase = Depends(get_telemetry_use_case),
    _: CurrentUser = Depends(get_current_user),
):
    return await telemetry.get_gold_zone_metrics(limit)
