"""Router de métricas de sistema (tabla system_metrics)."""

from fastapi import APIRouter, Depends, HTTPException

from backend.dependencies import usuario_actual

router = APIRouter(prefix="/api/metrics", tags=["Métricas"])


@router.get("/system")
async def obtener_metricas_sistema(usuario: dict = Depends(usuario_actual)):
    """Retorna la tabla system_metrics."""
    try:
        return {"mensaje": "Endpoint no implementado"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener métricas de sistema: {str(e)}")
