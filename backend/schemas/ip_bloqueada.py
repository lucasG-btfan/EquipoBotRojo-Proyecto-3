"""Schemas para la entidad IP Bloqueada."""

from datetime import datetime

from pydantic import BaseModel


class IPBloqueadaSchema(BaseModel):
    """Schema de respuesta para una IP bloqueada."""
    id: int
    ip_address: str
    threat_score: int | None = None
    reason: str | None = None
    blocked_at: datetime | None = None
    blocked_until: datetime | None = None
    is_active: bool = True

    model_config = {"from_attributes": True}
