"""Router de alertas — log de alertas y alertas recientes de PostgreSQL."""

from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/alerts", tags=["Alertas"])


@router.get("/log")
async def obtener_log_alertas():
    """Retorna las últimas líneas de alerts.log."""
    try:
        return {"mensaje": "Endpoint no implementado"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener log de alertas: {str(e)}")


@router.get("/recent")
async def obtener_alertas_recientes():
    """Retorna las últimas alertas desde PostgreSQL."""
    try:
        return {"mensaje": "Endpoint no implementado"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener alertas recientes: {str(e)}")
