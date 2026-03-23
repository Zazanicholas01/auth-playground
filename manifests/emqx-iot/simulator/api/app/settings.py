from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    api_port: int = Field(default=8080, alias="API_PORT")
    mqtt_url: str = Field(default="mqtt://emqx-listeners:1883", alias="MQTT_URL")
    mqtt_topic_root: str = Field(default="site/alpha/devices", alias="MQTT_TOPIC_ROOT")
    event_history_size: int = Field(default=250, alias="EVENT_HISTORY_SIZE")
    history_points: int = Field(default=300, alias="HISTORY_POINTS")

    db_host: str = Field(default="iot-timescaledb", alias="DB_HOST")
    db_port: int = Field(default=5432, alias="DB_PORT")
    db_name: str = Field(default="iot_playground", alias="DB_NAME")
    db_user: str = Field(default="iot_app", alias="DB_USER")
    db_password: str = Field(default="change-me", alias="DB_PASSWORD")

    db_bootstrap_sql_dir: str = Field(default="/app/sql", alias="DB_BOOTSTRAP_SQL_DIR")
    db_bootstrap_max_attempts: int = Field(default=20, alias="DB_BOOTSTRAP_MAX_ATTEMPTS")
    db_bootstrap_retry_delay_ms: int = Field(default=3000, alias="DB_BOOTSTRAP_RETRY_DELAY_MS")


settings = Settings()