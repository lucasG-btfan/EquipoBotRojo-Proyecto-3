"""Autenticación JWT para el dashboard."""

import hmac
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from backend.config import settings

security = HTTPBearer()


def verificar_credenciales(usuario: str, contraseña: str) -> bool:
    """Verifica credenciales con comparación timing-safe."""
    usuario_ok = hmac.compare_digest(usuario, settings.DASHBOARD_USER)
    contraseña_ok = hmac.compare_digest(contraseña, settings.DASHBOARD_PASSWORD)
    return usuario_ok and contraseña_ok


def crear_token_acceso() -> str:
    """Crea un JWT con expiración configurada."""
    expiracion = datetime.now(timezone.utc) + timedelta(hours=settings.JWT_EXPIRE_HOURS)
    payload = {
        "sub": "admin",
        "exp": expiracion,
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Dependency que valida el token JWT y retorna el payload."""
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        usuario: str | None = payload.get("sub")
        if usuario is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido: falta el campo 'sub'",
            )
        return {"usuario": usuario}
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token inválido: {str(e)}",
        ) from e
