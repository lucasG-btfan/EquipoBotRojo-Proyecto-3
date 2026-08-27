"""Schemas para la entidad Patrón de Ataque."""

from datetime import datetime

from pydantic import BaseModel


class PatronAtaqueSchema(BaseModel):
    """Schema de respuesta para un patrón de ataque."""
    id: int
    pattern_type: str
    source_ip: str
    target_host: str | None = None
    first_seen: datetime | None = None
    last_seen: datetime | None = None
    occurrence_count: int = 1
    is_blocked: bool = False
    recent_count: int = 1
    window_start: datetime | None = None

    model_config = {"from_attributes": True}
