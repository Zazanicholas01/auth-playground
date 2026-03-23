from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.bootstrap import init_db_with_retry
from app.container import build_container
from app.infrastructure.messaging.mqtt_consumer import MqttConsumer
from app.presentation.api.routes import router


@asynccontextmanager
async def lifespan(app: FastAPI):
    mqtt_consumer = MqttConsumer(None)
    container = build_container(mqtt_consumer)
    mqtt_consumer.telemetry_service = container.telemetry_use_case

    app.state.container = container

    await container.db.connect()
    await init_db_with_retry()
    await container.telemetry_use_case.warm_cache()
    await mqtt_consumer.start()

    try:
        yield
    finally:
        await mqtt_consumer.stop()
        await container.db.close()


def create_app() -> FastAPI:
    app = FastAPI(lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://127.0.0.1:8081",
            "http://localhost:8081",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(router)
    return app


app = create_app()
