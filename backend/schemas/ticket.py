"""Schemas para la entidad Ticket de Seguridad."""

from datetime import datetime

from pydantic import BaseModel


class TicketSchema(BaseModel):
    """Schema de respuesta para un ticket."""
    id: int
    ticket_number: str
    title: str | None = None
    description: str | None = None
    status: str = "open"
    priority: str | None = None
    category: str | None = None
    source_ip: str | None = None
    threat_score: int | None = None
    assigned_to: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    alert_reference: int | None = None

    model_config = {"from_attributes": True}
