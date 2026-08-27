"""Router de autenticación — login y token JWT."""

from fastapi import APIRouter, HTTPException, status

from backend.auth import crear_token_acceso, verificar_credenciales
from backend.schemas.auth import LoginRequest, TokenResponse

router = APIRouter(prefix="/api/auth", tags=["Autenticación"])


@router.post("/login", response_model=TokenResponse)
async def login(datos: LoginRequest) -> TokenResponse:
    """Autentica al usuario y retorna un token JWT."""
    try:
        if not verificar_credenciales(datos.usuario, datos.contraseña):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales inválidas",
            )
        token = crear_token_acceso()
        return TokenResponse(access_token=token)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al procesar login: {str(e)}",
        ) from e
