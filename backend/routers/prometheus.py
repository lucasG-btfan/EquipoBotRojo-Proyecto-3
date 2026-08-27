"""Router de métricas Prometheus — TPW y alertas de Prometheus."""

from fastapi import APIRouter, Depends, HTTPException

from backend.dependencies import usuario_actual
from backend.services import prometheus_service
from backend.services import n8n_service
from backend.services.prometheus_service import (
    PrometheusConnectionError,
    PrometheusResponseError,
    PrometheusTimeoutError,
)
from backend.services.n8n_service import (
    N8nConnectionError,
    N8nResponseError,
    N8nTimeoutError,
)

router = APIRouter(prefix="/api", tags=["Prometheus"])


@router.get("/metrics/tpw")
async def obtener_tpw(usuario: dict = Depends(usuario_actual)):
    """Retorna las últimas mediciones de TPW y promedio."""
    try:
        ejecuciones = await n8n_service.obtener_historial_principal(limite=20)

        historial = [
            e["duracion_segundos"]
            for e in ejecuciones
            if e.get("duracion_segundos") is not None
        ]

        promedio = round(sum(historial) / len(historial), 3) if historial else 0.0
        valor_actual = historial[0] if historial else None

        return {
            "valor_actual": valor_actual,
            "promedio": promedio,
            "historial": historial,
        }
    except N8nConnectionError as e:
        raise HTTPException(status_code=503, detail=f"No se pudo conectar con n8n: {e}")
    except N8nTimeoutError as e:
        raise HTTPException(status_code=504, detail=f"Timeout al conectar con n8n: {e}")
    except N8nResponseError as e:
        raise HTTPException(status_code=502, detail=f"Respuesta inesperada de n8n: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener métricas TPW: {str(e)}")


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
