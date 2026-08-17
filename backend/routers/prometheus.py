"""Router de métricas Prometheus — TPW y alertas de Prometheus."""

from fastapi import APIRouter, Depends, HTTPException

from backend.dependencies import usuario_actual

router = APIRouter(prefix="/api", tags=["Prometheus"])


@router.get("/metrics/tpw")
async def obtener_tpw(usuario: dict = Depends(usuario_actual)):
    """Retorna las últimas mediciones de TPW y promedio."""
    try:
        return {"mensaje": "Endpoint no implementado"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener TPW: {str(e)}")


@router.get("/prometheus/alerts")
async def obtener_alertas_prometheus(usuario: dict = Depends(usuario_actual)):
    """Retorna el estado de las 3 alertas de Prometheus (firing/inactive)."""
    try:
        return {"mensaje": "Endpoint no implementado"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener alertas de Prometheus: {str(e)}")
