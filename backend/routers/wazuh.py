"""Router de Wazuh — alertas nativas."""

from fastapi import APIRouter, Depends, HTTPException

from backend.dependencies import usuario_actual
from backend.schemas.wazuh import ConteoAlertasWazuhSchema
from backend.services import wazuh_service
from backend.services.wazuh_service import ErrorWazuh

router = APIRouter(prefix="/api/wazuh", tags=["Wazuh"])


@router.get("/alerts/count", response_model=ConteoAlertasWazuhSchema)
async def contar_alertas_wazuh(usuario: dict = Depends(usuario_actual)):
    """Retorna la cantidad de alertas nativas de Wazuh (FIM, etc.)."""
    try:
        return await wazuh_service.contar_alertas_wazuh()
    except ErrorWazuh as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener alertas de Wazuh: {str(e)}")
