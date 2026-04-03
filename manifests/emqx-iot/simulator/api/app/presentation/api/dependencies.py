from app.application.use_cases.health import HealthUseCase
from app.application.use_cases.telemetry import TelemetryUseCase
from app.container import Container
from app.presentation.api.auth import CurrentUser, require_authenticated_user
from fastapi import Request


def get_container(request: Request) -> Container:
    return request.app.state.container


def get_telemetry_use_case(request: Request) -> TelemetryUseCase:
    return get_container(request).telemetry_use_case


def get_health_use_case(request: Request) -> HealthUseCase:
    return get_container(request).health_use_case


def get_current_user(request: Request) -> CurrentUser:
    return require_authenticated_user(request)
