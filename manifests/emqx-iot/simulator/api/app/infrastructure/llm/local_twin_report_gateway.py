from __future__ import annotations

import json
import httpx

from app.domain.ports import TwinReportGateway
from app.settings import settings


class LocalTwinReportGateway(TwinReportGateway):
    async def generate_report(self, context: dict) -> dict:
        prompt = f"""
You are generating an operational digital twin report for a greenhouse.

Rules:
- Use only the provided JSON context.
- Do not invent facts.
- Return valid JSON only.
- status must be one of: normal, warning, critical.

Required JSON shape:
{{
  "status": "normal|warning|critical",
  "headline": "short headline",
  "summary": "2-3 sentence summary",
  "findings": ["finding 1", "finding 2"],
  "recommendedActions": ["action 1", "action 2"]
}}

Context JSON:
{json.dumps(context, default=str)}
""".strip()

        async with httpx.AsyncClient(timeout=settings.twin_report_timeout_ms / 1000) as client:
            response = await client.post(
                f"{settings.local_llm_url}/api/generate",
                json={
                    "model": settings.local_llm_model,
                    "prompt": prompt,
                    "stream": False,
                    "format": "json",
                    "options": {
                        "temperature": 0.2,
                    },
                },
            )
            response.raise_for_status()
            payload = response.json()
            return json.loads(payload["response"])
