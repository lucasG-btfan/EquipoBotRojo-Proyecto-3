"""Router de workflows n8n — ejecución e historial."""

from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/workflows", tags=["Workflows"])


@router.post("/main/run")
async def ejecutar_workflow():
    """Dispara el workflow principal de n8n."""
    try:
        return {"mensaje": "Endpoint no implementado"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al ejecutar workflow: {str(e)}")


@router.get("/runs")
async def historial_ejecuciones():
    """Retorna el historial de últimas ejecuciones de n8n."""
    try:
        return {"mensaje": "Endpoint no implementado"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener historial de ejecuciones: {str(e)}")
