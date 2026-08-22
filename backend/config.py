"""Configuración del backend cargada desde variables de entorno."""

from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Configuración del backend."""

    DATABASE_URL: str = "postgresql+asyncpg://db_user:db_pass@localhost:5432/security_monitoring"
    N8N_URL: str = "http://localhost:5678"
    N8N_API_KEY: str = ""
    # IDs de los workflows en n8n cuyo historial consulta el backend. Si un
    # workflow se recrea en n8n recibe un ID nuevo: actualizar aquí o en `.env`,
    # nunca hardcodeando en el servicio.
    N8N_WORKFLOW_ID_PRINCIPAL: str = "lvOKCttBHjp2xkDd"
    N8N_WORKFLOW_ID_METRICAS: str = "KwOhjOOaA56Sgm3E"
    N8N_WORKFLOW_ID_TICKETS: str = ""
    N8N_WORKFLOW_ID_BLOQUEO: str = ""
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
    # Contenedor y jail de Fail2ban a consultar (CH11). Defaults funcionales
    # para el stack actual — no requieren `.env` salvo que se renombren.
    FAIL2BAN_CONTAINER: str = "fail2ban"
    FAIL2BAN_JAIL: str = "n8n-soar-jail"
    # Conexión al indexador de Wazuh (OpenSearch, puerto publicado 9201) para
    # el conteo de alertas nativas (CH12). No confundir con WAZUH_URL, que
    # apunta a la API del manager (55000) y no se usa para este endpoint.
    WAZUH_INDEXER_URL: str = "https://localhost:9201"
    WAZUH_INDEXER_USER: str = "admin"
    WAZUH_INDEXER_PASSWORD: str = ""
    WAZUH_ALERTS_INDEX: str = "wazuh-alerts-*"
    WAZUH_VERIFY_TLS: bool = False

    model_config = {
        "env_file": str(Path(__file__).resolve().parent / ".env"),
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


settings = Settings()
