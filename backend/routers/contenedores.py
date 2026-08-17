"""Router de contenedores Docker — estado y métricas de recursos."""

from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/status", tags=["Contenedores"])


@router.get("/containers")
async def obtener_contenedores():
    """Retorna el estado up/down de cada contenedor Docker."""
    try:
        return {"mensaje": "Endpoint no implementado"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener contenedores: {str(e)}")


@router.get("/resources")
async def obtener_recursos():
    """Retorna consumo de CPU/RAM por contenedor."""
    try:
        return {"mensaje": "Endpoint no implementado"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener recursos: {str(e)}")
