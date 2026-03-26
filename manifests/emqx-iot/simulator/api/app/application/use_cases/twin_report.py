from __future__ import annotations

from dataclasses import dataclass

from app.domain.ports import TelemetryRepository, TwinReportGateway


@dataclass(slots=True)
class TwinReportUseCase:
    repo: TelemetryRepository
    gateway: TwinReportGateway

    async def get_report(self, zone_id: str) -> dict:
        context = await self.repo.load_twin_report_context(zone_id)
        if not context["zone"]:
            return {
                "zoneId": zone_id,
                "context": context,
                "report": {
                    "status": "warning",
                    "headline": "Zone data unavailable",
                    "summary": f"No twin context found for zone '{zone_id}'.",
                    "findings": ["The requested zone is missing from the gold layer."],
                    "recommendedActions": ["Verify telemetry ingestion and zone identifiers."],
                },
            }

        report = await self.gateway.generate_report(
            {
                "zoneId": zone_id,
                "context": context,
            }
        )

        return {
            "zoneId": zone_id,
            "context": context,
            "report": report,
        }
