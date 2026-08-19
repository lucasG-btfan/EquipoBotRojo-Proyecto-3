"""Router de Fail2ban — estado de jail y IPs baneadas."""

from fastapi import APIRouter, Depends, HTTPException

from backend.dependencies import usuario_actual
from backend.schemas.fail2ban import JailSchema
from backend.services import fail2ban_service
from backend.services.fail2ban_service import ErrorFail2ban

router = APIRouter(prefix="/api/fail2ban", tags=["Fail2ban"])


@router.get("/jail", response_model=JailSchema)
async def obtener_jail(usuario: dict = Depends(usuario_actual)):
    """Retorna estado de la jail y IPs baneadas actuales."""
    try:
        return await fail2ban_service.obtener_estado_jail()
    except ErrorFail2ban as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener estado de Fail2ban: {str(e)}")
