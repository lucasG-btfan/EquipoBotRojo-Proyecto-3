"""Router de Fail2ban — estado de jail y IPs baneadas."""

from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/fail2ban", tags=["Fail2ban"])


@router.get("/jail")
async def obtener_jail():
    """Retorna estado de la jail y IPs baneadas actuales."""
    try:
        return {"mensaje": "Endpoint no implementado"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener estado de Fail2ban: {str(e)}")
