"""Schemas para workflows de n8n."""

from datetime import datetime

from pydantic import BaseModel


class EjecucionWorkflowSchema(BaseModel):
    """Schema de respuesta para una ejecución de workflow."""
    id: str
    nombre: str
    estado: str  # éxito o error
    ejecutado_en: datetime | None = None
    duracion_segundos: float | None = None
