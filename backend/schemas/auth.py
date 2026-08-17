"""Schemas para autenticación."""

from pydantic import BaseModel


class LoginRequest(BaseModel):
    """Esquema de entrada para login."""
    usuario: str
    contraseña: str


class TokenResponse(BaseModel):
    """Esquema de respuesta con token JWT."""
    access_token: str
    token_type: str = "bearer"
