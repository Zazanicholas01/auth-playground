from fastapi import Request

from app.application.use_cases.health import HealthUseCase
from app.application.use_cases.telemetry import TelemetryUseCase
from app.container import Container


def get_container(request: Request) -> Container:
    return request.app.state.container


def get_telemetry_use_case(request: Request) -> TelemetryUseCase:
    return get_container(request).telemetry_use_case


def get_health_use_case(request: Request) -> HealthUseCase:
    return get_container(request).health_use_case
