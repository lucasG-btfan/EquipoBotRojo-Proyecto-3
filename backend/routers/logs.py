"""Router de logs — inyector de logs de prueba."""

from fastapi import APIRouter, Depends, HTTPException

from backend.dependencies import usuario_actual

router = APIRouter(prefix="/api/logs", tags=["Logs"])


@router.post("/inject")
async def inyectar_log(usuario: dict = Depends(usuario_actual)):
    """Ejecuta un comando logger de prueba predefinido."""
    try:
        return {"mensaje": "Endpoint no implementado"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al inyectar log: {str(e)}")
