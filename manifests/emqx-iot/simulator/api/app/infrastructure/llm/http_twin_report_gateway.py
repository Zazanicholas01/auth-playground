from __future__ import annotations

import httpx

from app.domain.ports import TwinReportGateway
from app.settings import settings

class HttpTwinReportGateway(TwinReportGateway):
    async def generate_report(self, context: dict) -> dict:
        prompt = {
            "role": "system",
            "content": (
                "You are generating an operational digital twin report for a greenhouse. "
                "Use only the provided JSON data. "
                "Do not invent facts. "
                "Return strict JSON with keys: "
                "status, headline, summary, findings, recommendedActions."
            ),
        }

        user_input = {
            "role": "user",
            "content": context,
        }

        async with httpx.AsyncClient(timeout=settings.twin_report_timeout_ms / 1000) as client:
            response = await client.post(
                f"{settings.llm_base_url}/v1/responses",
                headers={
                    "Authorization": f"Bearer {settings.llm_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.llm_model,
                    "input": [prompt, user_input],
                    "text": {
                        "format": {
                            "type": "json_schema",
                            "name": "twin_report",
                            "schema": {
                                "type": "object",
                                "additionalProperties": False,
                                "properties": {
                                    "status": {"type": "string"},
                                    "headline": {"type": "string"},
                                    "summary": {"type": "string"},
                                    "findings": {
                                        "type": "array",
                                        "items": {"type": "string"},
                                    },
                                    "recommendedActions": {
                                        "type": "array",
                                        "items": {"type": "string"},
                                    },
                                },
                                "required": [
                                    "status",
                                    "headline",
                                    "summary",
                                    "findings",
                                    "recommendedActions",
                                ],
                            },
                        }
                    },
                },
            )
            response.raise_for_status()
            payload = response.json()
            return payload["output"][0]["content"][0]["parsed"]