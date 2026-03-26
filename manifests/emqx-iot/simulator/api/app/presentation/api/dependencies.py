from fastapi import Request

from app.application.use_cases.health import HealthUseCase
from app.application.use_cases.telemetry import TelemetryUseCase
from app.application.use_cases.twin_report import TwinReportUseCase
from app.container import Container


def get_container(request: Request) -> Container:
    return request.app.state.container


def get_telemetry_use_case(request: Request) -> TelemetryUseCase:
    return get_container(request).telemetry_use_case


def get_health_use_case(request: Request) -> HealthUseCase:
    return get_container(request).health_use_case


def get_twin_report_use_case(request: Request) -> TwinReportUseCase:
    return get_container(request).twin_report_use_case
