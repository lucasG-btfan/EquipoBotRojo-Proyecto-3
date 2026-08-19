"""Configuración del backend cargada desde variables de entorno."""

from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Configuración del backend."""

    DATABASE_URL: str = "postgresql+asyncpg://db_user:db_pass@localhost:5432/security_monitoring"
    N8N_URL: str = "http://localhost:5678"
    N8N_API_KEY: str = ""
    PROMETHEUS_URL: str = "http://localhost:9090"
    # Endpoint del demonio Docker. Esquemas admitidos por el SDK `docker`:
    #   npipe://...        -> Docker Desktop en Windows (named pipe, no expone socket Unix)
    #   unix:///ruta.sock  -> Linux (socket Unix)
    #   tcp://host:puerto  -> demonio remoto (solo si está expuesto de forma segura)
    DOCKER_HOST: str = "npipe:////./pipe/dockerDesktopLinuxEngine"
    DASHBOARD_USER: str = "admin"
    DASHBOARD_PASSWORD: str = "admin"
    JWT_SECRET: str = "cambia-este-secreto"
    FRONTEND_ORIGIN: str = "http://localhost:5173"
    WAZUH_URL: str = "https://localhost:55000"
    WAZUH_USER: str = "wazuh"
    WAZUH_PASSWORD: str = ""
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_HOURS: int = 8
    ALERTS_LOG_PATH: str = "logs/security/alerts.log"
    # Destino del `logger` del inyector de logs de prueba (CH07).
    SYSLOG_HOST: str = "syslog-ng"
    SYSLOG_PORT: int = 514

    model_config = {
        "env_file": str(Path(__file__).resolve().parent / ".env"),
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


settings = Settings()
