"""Router de Fail2ban — estado de jail y IPs baneadas."""

from fastapi import APIRouter, Depends, HTTPException

from backend.dependencies import usuario_actual

router = APIRouter(prefix="/api/fail2ban", tags=["Fail2ban"])


@router.get("/jail")
async def obtener_jail(usuario: dict = Depends(usuario_actual)):
    """Retorna estado de la jail y IPs baneadas actuales."""
    try:
        return {"mensaje": "Endpoint no implementado"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener estado de Fail2ban: {str(e)}")
