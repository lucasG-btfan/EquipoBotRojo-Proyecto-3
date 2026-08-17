"""Router de contenedores Docker — estado y métricas de recursos."""

from fastapi import APIRouter, Depends, HTTPException

from backend.dependencies import usuario_actual

router = APIRouter(prefix="/api/status", tags=["Contenedores"])


@router.get("/containers")
async def obtener_contenedores(usuario: dict = Depends(usuario_actual)):
    """Retorna el estado up/down de cada contenedor Docker."""
    try:
        return {"mensaje": "Endpoint no implementado"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener contenedores: {str(e)}")


@router.get("/resources")
async def obtener_recursos(usuario: dict = Depends(usuario_actual)):
    """Retorna consumo de CPU/RAM por contenedor."""
    try:
        return {"mensaje": "Endpoint no implementado"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener recursos: {str(e)}")
