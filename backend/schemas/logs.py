"""Schemas para el inyector de logs de prueba (CH07)."""

from pydantic import BaseModel


class InyeccionLogsRequest(BaseModel):
    """Cuerpo de la petición de inyección — la categoría se valida en el servicio."""
    categoria: str


class InyeccionLogsResponse(BaseModel):
    """Respuesta de una inyección exitosa."""
    mensaje: str


class CategoriaLogSchema(BaseModel):
    """Elemento del catálogo de categorías expuesto al frontend."""
    categoria: str
    etiqueta: str
    host_origen: str
    cantidad_logs: int
    emisor_disponible: bool
