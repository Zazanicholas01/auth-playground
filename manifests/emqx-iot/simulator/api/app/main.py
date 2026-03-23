from contextlib import asynccontextmanager

from fastapi import FastAPI
from api.routes import router
from bootstrap import init_db_with_retry
from db import db
from mqtt.client import MqttConsumer
from repositories.telemetry import TelemetryRepository
from services.telemetry import TelemetryService
from state import ApiState
from synthetic.zones import SyntheticService


@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.connect()
    await init_db_with_retry()

    repo = TelemetryRepository()
    state = ApiState()
    synthetic = SyntheticService()
    telemetry_service = TelemetryService(repo=repo, state=state, synthetic=synthetic)
    await telemetry_service.warm_cache()

    mqtt_consumer = MqttConsumer(telemetry_service)
    await mqtt_consumer.start()

    app.state.telemetry_service = telemetry_service
    app.state.mqtt_consumer = mqtt_consumer

    try:
        yield
    finally:
        await mqtt_consumer.stop()
        await db.close()


app = FastAPI(lifespan=lifespan)
app.include_router(router)