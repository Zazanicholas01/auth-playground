import asyncio
import contextlib
import json
import logging
from urllib.parse import urlparse

from aiomqtt import Client
from app.infrastructure.metrics import (
    invalid_payloads_total,
    mqtt_connected,
    mqtt_message_processing_seconds,
    mqtt_messages_total,
    mqtt_processing_failures_total,
    mqtt_reconnects_total,
    telemetry_ingested_total,
)
from app.settings import settings

logger = logging.getLogger(__name__)


class MqttConsumer:
    def __init__(self, telemetry_service):
        self.telemetry_service = telemetry_service
        self.task: asyncio.Task | None = None
        self.connected = False

    async def start(self):
        self.task = asyncio.create_task(self._run())

    async def stop(self):
        if self.task:
            self.task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self.task

    async def _run(self):
        parsed = urlparse(settings.mqtt_url)
        while True:
            try:
                mqtt_reconnects_total.inc()
                async with Client(hostname=parsed.hostname, port=parsed.port or 1883) as client:
                    self.connected = True
                    mqtt_connected.set(1)

                    root = settings.mqtt_topic_root
                    await client.subscribe(f"{root}/+/telemetry")
                    await client.subscribe(f"{root}/+/alerts")
                    await client.subscribe(f"{root}/+/status")

                    async for message in client.messages:
                        topic = message.topic.value
                        parts = topic.split("/")
                        event_type = parts[-1] if parts else "Unknown"
                        zone_id = parts[-2] if len(parts) >= 2 else "Unknown"

                        with mqtt_message_processing_seconds.labels(event_type=event_type).time():
                            try:
                                mqtt_messages_total.labels(event_type=event_type).inc()

                                await self.telemetry_service.process_message(
                                    topic,
                                    message.payload,
                                )

                                telemetry_ingested_total.labels(
                                    zone_id=zone_id,
                                    event_type=event_type,
                                ).inc()
                            
                            except json.JSONDecodeError:
                                invalid_payloads_total.labels(
                                    event_type=event_type,
                                    reason="json_decode_error",
                                ).inc()
                                mqtt_processing_failures_total.labels(event_type=event_type).inc()
                                logger.exception("Invalid JSON payload for topic %s", topic)

                            except ValueError:
                                invalid_payloads_total.labels(
                                    event_type=event_type,
                                    reason="validation_error",
                                ).inc()
                                mqtt_processing_failures_total.labels(event_type=event_type).inc()
                                logger.exception("Validation failed for topic %s", topic)

                            except Exception:
                                mqtt_processing_failures_total.labels(event_type=event_type).inc()
                                logger.exception("Failed to process MQTT message for topic %s", topic)

            except asyncio.CancelledError:
                self.connected = False
                mqtt_connected.set(0)
                raise

            except Exception:
                self.connected = False
                mqtt_connected.set(0)
                logger.exception("MQTT consumer disconnected; retrying in 3 seconds")
                await asyncio.sleep(3)