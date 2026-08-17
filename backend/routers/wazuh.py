"""Router de Wazuh — alertas nativas."""

from fastapi import APIRouter, Depends, HTTPException

from backend.dependencies import usuario_actual

router = APIRouter(prefix="/api/wazuh", tags=["Wazuh"])


@router.get("/alerts/count")
async def contar_alertas_wazuh(usuario: dict = Depends(usuario_actual)):
    """Retorna la cantidad de alertas nativas de Wazuh (FIM, etc.)."""
    try:
        return {"mensaje": "Endpoint no implementado"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener alertas de Wazuh: {str(e)}")
