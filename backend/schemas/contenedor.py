"""Schemas para contenedores Docker."""

from pydantic import BaseModel


class ContenedorSchema(BaseModel):
    """Schema de respuesta para un contenedor Docker."""
    nombre: str
    estado: str
    puerto: str | None = None


class RecursoSchema(BaseModel):
    """Schema de respuesta para recursos de un contenedor."""
    nombre: str
    cpu_porcentaje: float | None = None
    ram_mb: float | None = None
    ram_porcentaje: float | None = None
