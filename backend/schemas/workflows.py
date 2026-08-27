"""Schemas para workflows de n8n."""

from datetime import datetime
from pydantic import BaseModel


class EjecucionWorkflowSchema(BaseModel):
    """Schema de respuesta para una ejecución de workflow."""
    id: str
    startedAt: str | None = None
    stoppedAt: str | None = None
    status: str
    duracion_segundos: float | None = None
    # Mensaje de error de n8n, solo presente cuando `status` no es "success".
    error: str | None = None
    # Cantidad de logs procesados por la ejecución. Solo se calcula para el
    # workflow principal (ver n8n_service._contar_items_procesados);
    # `None` para el resto (no aplica, ej. workflow de métricas).
    items_procesados: int | None = None


class HistorialWorkflowSchema(BaseModel):
    """Schema de respuesta para el historial de ejecuciones."""
    ejecuciones: list[EjecucionWorkflowSchema]
    total: int


class MetricasTPWSchema(BaseModel):
    """Schema de respuesta para métricas TPW."""
    promedio_segundos: float
    ultima_ejecucion_segundos: float | None
    ejecuciones: list[EjecucionWorkflowSchema]
