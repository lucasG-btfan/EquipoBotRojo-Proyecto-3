"""Schemas para métricas de Prometheus."""

from pydantic import BaseModel


class TPWSchema(BaseModel):
    """Schema de respuesta para métrica TPW."""
    valor_actual: float | None = None
    promedio: float | None = None
    historial: list[float] = []


class AlertaPrometheusSchema(BaseModel):
    """Schema de respuesta para una alerta de Prometheus."""
    nombre: str
    estado: str  # firing o inactive
    severidad: str | None = None
