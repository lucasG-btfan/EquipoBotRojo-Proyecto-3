"""Router de métricas de sistema (tabla system_metrics)."""

from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/metrics", tags=["Métricas"])


@router.get("/system")
async def obtener_metricas_sistema():
    """Retorna la tabla system_metrics."""
    try:
        return {"mensaje": "Endpoint no implementado"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener métricas de sistema: {str(e)}")
