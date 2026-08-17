"""Router de workflows n8n — ejecución e historial."""

from fastapi import APIRouter, Depends, HTTPException

from backend.dependencies import usuario_actual

router = APIRouter(prefix="/api/workflows", tags=["Workflows"])


@router.post("/main/run")
async def ejecutar_workflow(usuario: dict = Depends(usuario_actual)):
    """Dispara el workflow principal de n8n."""
    try:
        return {"mensaje": "Endpoint no implementado"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al ejecutar workflow: {str(e)}")


@router.get("/runs")
async def historial_ejecuciones(usuario: dict = Depends(usuario_actual)):
    """Retorna el historial de últimas ejecuciones de n8n."""
    try:
        return {"mensaje": "Endpoint no implementado"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener historial de ejecuciones: {str(e)}")
