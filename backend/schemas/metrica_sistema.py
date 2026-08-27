"""Schemas para la entidad Métrica de Sistema."""

from datetime import datetime

from pydantic import BaseModel


class MetricaSistemaSchema(BaseModel):
    """Schema de respuesta para una métrica de sistema."""
    id: int
    timestamp: datetime | None = None
    hostname: str
    metric_name: str
    metric_value: float | None = None
    unit: str | None = None

    model_config = {"from_attributes": True}
