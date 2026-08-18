"""Router de contenedores Docker — estado y métricas de recursos."""

from fastapi import APIRouter, Depends, HTTPException

from backend.dependencies import usuario_actual
from backend.schemas.contenedor import ContenedorSchema, RecursoSchema
from backend.services import docker_service
from backend.services.docker_service import ErrorDocker

router = APIRouter(prefix="/api/status", tags=["Contenedores"])


@router.get("/containers", response_model=list[ContenedorSchema])
async def obtener_contenedores(usuario: dict = Depends(usuario_actual)):
    """Retorna el estado up/down de cada contenedor Docker del stack."""
    try:
        return await docker_service.obtener_estado_contenedores()
    except ErrorDocker as e:
        raise HTTPException(status_code=503, detail=f"No se pudo contactar al demonio Docker: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener contenedores: {str(e)}")


@router.get("/resources", response_model=list[RecursoSchema])
async def obtener_recursos(usuario: dict = Depends(usuario_actual)):
    """Retorna consumo de CPU/RAM por contenedor en ejecución."""
    try:
        return await docker_service.obtener_recursos_contenedores()
    except ErrorDocker as e:
        raise HTTPException(status_code=503, detail=f"No se pudo contactar al demonio Docker: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener recursos: {str(e)}")
