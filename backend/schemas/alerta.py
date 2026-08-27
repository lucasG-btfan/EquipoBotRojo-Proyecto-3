"""Schemas para la entidad Alerta."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel


class AlertaSchema(BaseModel):
    """Schema de respuesta para una alerta."""
    id: int
    timestamp: datetime | None = None
    severity: str
    category: str
    source_host: str | None = None
    source_ip: str | None = None
    target_host: str | None = None
    event_count: int = 1
    description: str | None = None
    raw_log: str | None = None
    status: str = "new"
    assigned_to: str | None = None
    notes: str | None = None
    resolved_at: datetime | None = None
    risk_score: int | None = None
    risk_level: str | None = None
    threat_reputation: str | None = None
    threat_intel: Any | None = None

    model_config = {"from_attributes": True}
