"""Schemas para Fail2ban."""

from pydantic import BaseModel


class JailSchema(BaseModel):
    """Schema de respuesta para el estado de la jail."""
    jail: str
    baneadas: int
    ips: list[str]


class IPBaneadaSchema(BaseModel):
    """Schema de respuesta para una IP baneada por Fail2ban."""
    ip: str
    jail: str
    baneada_desde: str | None = None
    baneada_hasta: str | None = None
