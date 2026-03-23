import asyncio
import contextlib
import logging
from urllib.parse import urlparse

from aiomqtt import Client
from settings import settings


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
                async with Client(hostname=parsed.hostname, port=parsed.port or 1883) as client:
                    self.connected = True
                    root = settings.mqtt_topic_root
                    await client.subscribe(f"{root}/+/telemetry")
                    await client.subscribe(f"{root}/+/alerts")
                    await client.subscribe(f"{root}/+/status")

                    async for message in client.messages:
                        try:
                            await self.telemetry_service.process_message(
                                message.topic.value,
                                message.payload,
                            )
                        except Exception:
                            logger.exception("Failed to process MQTT message for topic %s", message.topic.value)
            except asyncio.CancelledError:
                self.connected = False
                raise
            except Exception:
                self.connected = False
                logger.exception("MQTT consumer disconnected; retrying in 3 seconds")
                await asyncio.sleep(3)
