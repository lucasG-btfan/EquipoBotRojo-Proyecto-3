"""Router de métricas Prometheus — TPW y alertas de Prometheus."""

from fastapi import APIRouter, Depends, HTTPException

from backend.dependencies import usuario_actual
from backend.services import prometheus_service
from backend.services.prometheus_service import (
    PrometheusConnectionError,
    PrometheusResponseError,
    PrometheusTimeoutError,
)

router = APIRouter(prefix="/api", tags=["Prometheus"])


@router.get("/metrics/tpw")
async def obtener_tpw(usuario: dict = Depends(usuario_actual)):
    """Retorna las últimas mediciones de TPW y promedio."""
    try:
        return {"mensaje": "Endpoint no implementado"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener TPW: {str(e)}")


@router.get("/prometheus/alerts")
async def obtener_alertas_prometheus(usuario: dict = Depends(usuario_actual)):
    """Retorna el estado de las 3 alertas de Prometheus y métricas de Fail2ban.

    Consulta ``/api/v1/rules`` para alertas y ``/api/v1/query`` para las
    métricas de Fail2ban, ambas a través de la API de Prometheus.
    """
    try:
        return await prometheus_service.obtener_alertas_completas()
    except PrometheusConnectionError as e:
        raise HTTPException(
            status_code=503,
            detail=f"No se pudo conectar con Prometheus: {e}",
        )
    except PrometheusTimeoutError as e:
        raise HTTPException(
            status_code=504,
            detail=f"Timeout al consultar Prometheus: {e}",
        )
    except PrometheusResponseError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Respuesta inesperada de Prometheus: {e}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al obtener alertas de Prometheus: {str(e)}",
        )
