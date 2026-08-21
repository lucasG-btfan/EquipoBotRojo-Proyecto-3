"""Router de workflows n8n — ejecución e historial."""

from fastapi import APIRouter, Depends, HTTPException, Query

from backend.dependencies import usuario_actual
from backend.schemas.workflows import HistorialWorkflowSchema
from backend.services import n8n_service
from backend.services.n8n_service import (
    N8nConnectionError,
    N8nResponseError,
    N8nTimeoutError,
)

router = APIRouter(prefix="/api/workflows", tags=["Workflows"])


@router.post("/main/run")
async def ejecutar_workflow(usuario: dict = Depends(usuario_actual)):
    """Dispara el workflow principal de n8n."""
    try:
        resultado = await n8n_service.ejecutar_workflow_principal()
        return {"mensaje": "Workflow ejecutado correctamente", "execution_id": resultado["execution_id"]}
    except N8nConnectionError as e:
        raise HTTPException(status_code=503, detail=f"No se pudo conectar con n8n: {e}")
    except N8nTimeoutError as e:
        raise HTTPException(status_code=504, detail=f"Timeout al conectar con n8n: {e}")
    except N8nResponseError as e:
        raise HTTPException(status_code=502, detail=f"Respuesta inesperada de n8n: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al ejecutar workflow: {str(e)}")


@router.post("/metrics/run")
async def ejecutar_workflow_metricas(usuario: dict = Depends(usuario_actual)):
    """Dispara el workflow de métricas de Prometheus."""
    try:
        resultado = await n8n_service.ejecutar_workflow_metricas()
        return {"mensaje": "Workflow de métricas ejecutado correctamente", "execution_id": resultado["execution_id"]}
    except N8nConnectionError as e:
        raise HTTPException(status_code=503, detail=f"No se pudo conectar con n8n: {e}")
    except N8nTimeoutError as e:
        raise HTTPException(status_code=504, detail=f"Timeout al conectar con n8n: {e}")
    except N8nResponseError as e:
        raise HTTPException(status_code=502, detail=f"Respuesta inesperada de n8n: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al ejecutar workflow de métricas: {str(e)}")


@router.get("/runs", response_model=HistorialWorkflowSchema)
async def historial_ejecuciones(
    limit: int = Query(default=10, ge=1, le=50),
    usuario: dict = Depends(usuario_actual),
):
    """Retorna el historial de últimas ejecuciones del workflow principal."""
    try:
        ejecuciones = await n8n_service.obtener_historial_principal(limite=limit)
        return {"ejecuciones": ejecuciones, "total": len(ejecuciones)}
    except N8nConnectionError as e:
        raise HTTPException(status_code=503, detail=f"No se pudo conectar con n8n: {e}")
    except N8nTimeoutError as e:
        raise HTTPException(status_code=504, detail=f"Timeout al conectar con n8n: {e}")
    except N8nResponseError as e:
        raise HTTPException(status_code=502, detail=f"Respuesta inesperada de n8n: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener historial de ejecuciones: {str(e)}")


@router.get("/metrics/runs", response_model=HistorialWorkflowSchema)
async def historial_ejecuciones_metricas(
    limit: int = Query(default=10, ge=1, le=50),
    usuario: dict = Depends(usuario_actual),
):
    """Retorna el historial de últimas ejecuciones del workflow de métricas."""
    try:
        ejecuciones = await n8n_service.obtener_historial_metricas(limite=limit)
        return {"ejecuciones": ejecuciones, "total": len(ejecuciones)}
    except N8nConnectionError as e:
        raise HTTPException(status_code=503, detail=f"No se pudo conectar con n8n: {e}")
    except N8nTimeoutError as e:
        raise HTTPException(status_code=504, detail=f"Timeout al conectar con n8n: {e}")
    except N8nResponseError as e:
        raise HTTPException(status_code=502, detail=f"Respuesta inesperada de n8n: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener historial de ejecuciones: {str(e)}")
