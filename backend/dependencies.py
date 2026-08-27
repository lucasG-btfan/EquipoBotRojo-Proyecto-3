"""Dependencias compartidas de FastAPI."""

from fastapi import Depends

from backend.auth import get_current_user


async def usuario_actual(usuario: dict = Depends(get_current_user)) -> dict:
    """Dependency que retorna el usuario autenticado actual."""
    return usuario
