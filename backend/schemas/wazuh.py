"""Schemas para Wazuh."""

from pydantic import BaseModel


class ConteoAlertasWazuhSchema(BaseModel):
    """Schema de respuesta para el conteo de alertas Wazuh."""
    total: int = 0
    por_severidad: dict[str, int] = {}
