"""Schemas para Wazuh."""

from pydantic import BaseModel


class ConteoAlertasWazuhSchema(BaseModel):
    """Schema de respuesta para el conteo de alertas nativas de Wazuh."""
    total: int
    mensaje: str
