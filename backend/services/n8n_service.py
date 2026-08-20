"""Servicio de integración con n8n — ejecución y monitoreo de workflows."""

from __future__ import annotations

import logging
import httpx

from backend.config import settings

logger = logging.getLogger("backend.services.n8n")

# ── Timeout para requests a n8n (segundos) ──────────────────────────────────
TIMEOUT_N8N = 10.0

# ── URLs de webhook de los workflows ────────────────────────────────────────
# Estos webhooks están configurados como triggers adicionales en los workflows
# de n8n, permitiendo ejecutarlos manualmente desde el dashboard.
WEBHOOK_ANALISIS_URL = f"{settings.N8N_URL.rstrip('/')}/webhook/ejecutar-analisis"
WEBHOOK_METRICAS_URL = f"{settings.N8N_URL.rstrip('/')}/webhook/ejecutar-metricas"


# ── Excepciones personalizadas ──────────────────────────────────────────────
class N8nConnectionError(Exception):
    """No se pudo conectar con la API de n8n."""


class N8nTimeoutError(Exception):
    """La consulta a n8n excedió el tiempo de espera."""


class N8nResponseError(Exception):
    """n8n retornó una respuesta con formato inesperado."""


# ── Funciones de ejecución vía webhook ──────────────────────────────────────
async def disparar_webhook(url: str) -> dict:
    """Dispara un webhook de n8n con un POST vacío.

    Los webhooks en n8n no requieren autenticación — el trigger es la URL misma.
    Retorna la respuesta del webhook (generalmente un JSON con confirmación).
    """
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT_N8N) as cliente:
            respuesta = await cliente.post(url)
    except httpx.ConnectError as e:
        raise N8nConnectionError(
            f"No se pudo conectar con n8n en {settings.N8N_URL}: {e}"
        ) from e
    except httpx.TimeoutException as e:
        raise N8nTimeoutError(
            f"La consulta a n8n tardó más de {TIMEOUT_N8N}s: {e}"
        ) from e
    except httpx.HTTPError as e:
        raise N8nResponseError(
            f"Error HTTP al consultar n8n: {e}"
        ) from e

    # n8n webhooks retornan 200 con body vacío o JSON de confirmación
    if respuesta.status_code == 200:
        try:
            return respuesta.json()
        except ValueError:
            return {"mensaje": "Webhook ejecutado correctamente"}
    else:
        raise N8nResponseError(
            f"n8n respondió HTTP {respuesta.status_code}: {respuesta.text}"
        )


async def ejecutar_workflow_principal() -> dict:
    """Dispara el workflow principal de análisis de logs vía webhook."""
    resultado = await disparar_webhook(WEBHOOK_ANALISIS_URL)
    return {
        "mensaje": "Workflow de análisis ejecutado correctamente",
        "execution_id": resultado.get("executionId", resultado.get("mensaje", "webhook")),
    }


async def ejecutar_workflow_metricas() -> dict:
    """Dispara el workflow de métricas de Prometheus vía webhook."""
    resultado = await disparar_webhook(WEBHOOK_METRICAS_URL)
    return {
        "mensaje": "Workflow de métricas ejecutado correctamente",
        "execution_id": resultado.get("executionId", resultado.get("mensaje", "webhook")),
    }


# ── Historial de ejecuciones (requiere API key de n8n) ─────────────────────
async def obtener_historial_ejecuciones(workflow_id: str, limite: int = 10) -> list[dict]:
    """Obtiene el historial de ejecuciones de un workflow.

    Nota: Este endpoint requiere que n8n tenga una API key configurada
    y accesible. Si la API key no está configurada, retorna una lista vacía.
    """
    if not settings.N8N_API_KEY:
        logger.warning("N8N_API_KEY no configurada — no se puede obtener historial de ejecuciones")
        return []

    headers = {
        "X-N8N-API-KEY": settings.N8N_API_KEY,
        "Accept": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT_N8N) as cliente:
            respuesta = await cliente.get(
                f"{settings.N8N_URL.rstrip('/')}/api/v1/executions",
                params={"workflowId": workflow_id, "limit": limite},
                headers=headers,
            )
    except (httpx.ConnectError, httpx.TimeoutException, httpx.HTTPError) as e:
        logger.warning("Error al consultar historial de n8n: %s", e)
        return []

    if respuesta.status_code != 200:
        logger.warning("n8n respondió HTTP %d al consultar historial: %s", respuesta.status_code, respuesta.text[:200])
        return []

    try:
        datos = respuesta.json()
    except ValueError:
        logger.warning("Respuesta de n8n no es JSON válido al consultar historial")
        return []

    logger.debug("Respuesta cruda de n8n (tipo=%s, keys=%s)", type(datos).__name__, list(datos.keys()) if isinstance(datos, dict) else "N/A (lista)")

    # n8n puede devolver distintos formatos según versión:
    #   (a) {"data": {"results": [...]}}  → dict con data.results
    #   (b) {"data": [...]}               → dict con data como lista
    #   (c) [{"id": 1, ...}, ...]          → lista directa
    ejecuciones_raw: list[dict] = []
    if isinstance(datos, list):
        ejecuciones_raw = [e for e in datos if isinstance(e, dict)]
    elif isinstance(datos, dict):
        data = datos.get("data", {})
        if isinstance(data, dict):
            ejecuciones_raw = data.get("results", [])
        elif isinstance(data, list):
            ejecuciones_raw = [e for e in data if isinstance(e, dict)]

    ejecuciones = []
    for e in ejecuciones_raw:
        started = e.get("startedAt", "")
        stopped = e.get("stoppedAt", "")
        duracion = None
        if started and stopped:
            try:
                from datetime import datetime

                t_start = datetime.fromisoformat(started.replace("Z", "+00:00"))
                t_stop = datetime.fromisoformat(stopped.replace("Z", "+00:00"))
                duracion = round((t_stop - t_start).total_seconds(), 3)
            except (ValueError, TypeError):
                pass

        ejecuciones.append({
            "id": e.get("id", ""),
            "startedAt": started,
            "stoppedAt": stopped,
            "status": e.get("finished", False) and "success" or e.get("status", "unknown"),
            "duracion_segundos": duracion,
        })

    logger.info("Historial de n8n: %d ejecuciones obtenidas para workflow %s", len(ejecuciones), workflow_id)
    return ejecuciones


async def obtener_historial_principal(limite: int = 10) -> list[dict]:
    """Obtiene el historial del workflow principal."""
    return await obtener_historial_ejecuciones("IlZkF2tpQcwn5ibI", limite)
