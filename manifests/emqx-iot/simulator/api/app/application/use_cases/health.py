from app.domain.ports import HealthGateway, MqttStatusGateway


class HealthUseCase:
    def __init__(self, db_health: HealthGateway, mqtt_status: MqttStatusGateway, mqtt_url: str) -> None:
        self._db_health = db_health
        self._mqtt_status = mqtt_status
        self._mqtt_url = mqtt_url

    async def get_status(self) -> dict:
        return {
            "ok": True,
            "mqttUrl": self._mqtt_url,
            "mqttConnected": self._mqtt_status.connected,
            "dbConnected": await self._db_health.is_db_connected(),
        }
