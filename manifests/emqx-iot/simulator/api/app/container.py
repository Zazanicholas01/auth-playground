from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.application.use_cases.health import HealthUseCase
from app.application.use_cases.telemetry import TelemetryConfig, TelemetryState, TelemetryUseCase
from app.application.use_cases.twin_report import TwinReportUseCase
from app.infrastructure.llm.local_twin_report_gateway import LocalTwinReportGateway
from app.infrastructure.persistence.db import db
from app.infrastructure.persistence.telemetry_repository import PostgresTelemetryRepository
from app.infrastructure.synthetic.zone_gateway import SyntheticService
from app.settings import settings


@dataclass(slots=True)
class Container:
    db: Any
    telemetry_use_case: TelemetryUseCase
    health_use_case: HealthUseCase
    twin_report_use_case: TwinReportUseCase



def build_container(mqtt_status) -> Container:
    repo = PostgresTelemetryRepository()
    synthetic = SyntheticService()
    twin_gateway = LocalTwinReportGateway()

    telemetry_use_case = TelemetryUseCase(
        repo=repo,
        synthetic=synthetic,
        state=TelemetryState(devices={}, events=[]),
        config=TelemetryConfig(
            event_history_size=settings.event_history_size,
            history_points=settings.history_points,
        ),
    )

    health_use_case = HealthUseCase(
        db_health=db,
        mqtt_status=mqtt_status,
        mqtt_url=settings.mqtt_url,
    )

    twin_report_use_case = TwinReportUseCase(
        repo=repo,
        gateway=twin_gateway,
    )

    return Container(
        db=db,
        telemetry_use_case=telemetry_use_case,
        health_use_case=health_use_case,
        twin_report_use_case=twin_report_use_case,
    )
