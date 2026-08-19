"""Router de logs — inyector de logs de prueba."""

from fastapi import APIRouter, Depends, HTTPException

from backend.dependencies import usuario_actual
from backend.schemas.logs import CategoriaLogSchema, InyeccionLogsRequest, InyeccionLogsResponse
from backend.services import logs_injector_service
from backend.services.logs_injector_service import CategoriaInvalida, ErrorInyeccionLogs

router = APIRouter(prefix="/api/logs", tags=["Logs"])


@router.post("/inject", response_model=InyeccionLogsResponse)
async def inyectar_log(
    peticion: InyeccionLogsRequest, usuario: dict = Depends(usuario_actual)
):
    """Ejecuta los comandos `logger` de la categoría solicitada dentro del emisor correspondiente."""
    try:
        cantidad = await logs_injector_service.inyectar_categoria(peticion.categoria)
        return InyeccionLogsResponse(
            mensaje=f"{cantidad} logs inyectados para categoría {peticion.categoria}"
        )
    except CategoriaInvalida as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ErrorInyeccionLogs as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al inyectar log: {str(e)}")


@router.get("/inject/categorias", response_model=list[CategoriaLogSchema])
async def obtener_categorias(usuario: dict = Depends(usuario_actual)):
    """Retorna el catálogo de categorías disponibles para el inyector de logs."""
    try:
        return await logs_injector_service.listar_categorias()
    except CategoriaInvalida as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ErrorInyeccionLogs as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener categorías: {str(e)}")
