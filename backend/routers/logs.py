"""Router de logs — inyector de logs de prueba."""

from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/logs", tags=["Logs"])


@router.post("/inject")
async def inyectar_log():
    """Ejecuta un comando logger de prueba predefinido."""
    try:
        return {"mensaje": "Endpoint no implementado"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al inyectar log: {str(e)}")
