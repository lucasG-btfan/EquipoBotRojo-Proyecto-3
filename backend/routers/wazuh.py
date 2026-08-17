"""Router de Wazuh — alertas nativas."""

from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/wazuh", tags=["Wazuh"])


@router.get("/alerts/count")
async def contar_alertas_wazuh():
    """Retorna la cantidad de alertas nativas de Wazuh (FIM, etc.)."""
    try:
        return {"mensaje": "Endpoint no implementado"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener alertas de Wazuh: {str(e)}")
