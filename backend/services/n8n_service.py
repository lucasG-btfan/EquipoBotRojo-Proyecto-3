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

# ── IDs de los workflows (n8n) cuyo historial se muestra en el panel ───────
WORKFLOW_ID_PRINCIPAL = "IlZkF2tpQcwn5ibI"
WORKFLOW_ID_METRICAS = "S8KYnwHGovQ9pc7G"

# Nodo del workflow principal cuyo conteo de items de salida se usa como
# "cantidad de logs procesados" — específico de la estructura actual de ese
# workflow (Workflow_fase _3-final). Si el workflow se reestructura y este
# nodo se renombra, el conteo vuelve a caer a `None` sin romper el endpoint.
NODO_LOGS_ESTRUCTURADOS = "Estructurar Entradas de Log"
NODO_SIN_ALERTAS = "Sin alertas"


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


# ── Detalle de una ejecución (para error y conteo de items procesados) ─────
async def obtener_detalle_ejecucion(execution_id: str) -> dict | None:
    """Obtiene el detalle completo (`includeData=true`) de una ejecución.

    Se usa para enriquecer el historial con el mensaje de error (ejecuciones
    fallidas) y la cantidad de items procesados. Devuelve `None` ante
    cualquier problema — el enriquecimiento es best-effort, nunca debe tumbar
    el historial completo.
    """
    if not execution_id or not settings.N8N_API_KEY:
        return None

    headers = {
        "X-N8N-API-KEY": settings.N8N_API_KEY,
        "Accept": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT_N8N) as cliente:
            respuesta = await cliente.get(
                f"{settings.N8N_URL.rstrip('/')}/api/v1/executions/{execution_id}",
                params={"includeData": "true"},
                headers=headers,
            )
    except (httpx.ConnectError, httpx.TimeoutException, httpx.HTTPError) as e:
        logger.warning("Error al consultar detalle de ejecución %s: %s", execution_id, e)
        return None

    if respuesta.status_code != 200:
        logger.warning(
            "n8n respondió HTTP %d al consultar detalle de ejecución %s",
            respuesta.status_code,
            execution_id,
        )
        return None

    try:
        return respuesta.json()
    except ValueError:
        return None


def _extraer_mensaje_error(detalle: dict) -> str | None:
    """Extrae el mensaje de error de un detalle de ejecución, si lo hay."""
    try:
        result_data = detalle["data"]["resultData"]
    except (KeyError, TypeError):
        return None

    error = result_data.get("error")
    if isinstance(error, dict):
        return error.get("message") or error.get("description") or "Error desconocido"

    # Si no hay error a nivel workflow, se busca en el último nodo ejecutado.
    ultimo_nodo = result_data.get("lastNodeExecuted")
    run_data = result_data.get("runData", {})
    if ultimo_nodo and ultimo_nodo in run_data:
        try:
            error_nodo = run_data[ultimo_nodo][0].get("error")
        except (KeyError, IndexError, TypeError):
            error_nodo = None
        if isinstance(error_nodo, dict):
            return error_nodo.get("message") or "Error desconocido"

    return "Error desconocido" if result_data.get("lastNodeExecuted") else None


def _contar_items_procesados(detalle: dict) -> int | None:
    """Cuenta los items de salida del nodo `NODO_LOGS_ESTRUCTURADOS`.

    Devuelve 0 si la ejecución terminó en la rama "sin alertas" (no había
    nada que procesar) y `None` si no se puede determinar (ejecución
    fallida antes de llegar a ese punto, u otro workflow sin ese nodo).
    """
    try:
        run_data = detalle["data"]["resultData"]["runData"]
    except (KeyError, TypeError):
        return None

    nodo = run_data.get(NODO_LOGS_ESTRUCTURADOS)
    if nodo:
        try:
            items = nodo[0]["data"]["main"][0]
            return len(items) if items else 0
        except (KeyError, IndexError, TypeError):
            return None

    if NODO_SIN_ALERTAS in run_data:
        return 0

    return None


# ── Historial de ejecuciones (requiere API key de n8n) ─────────────────────
async def obtener_historial_ejecuciones(
    workflow_id: str,
    limite: int = 10,
    incluir_items_procesados: bool = False,
) -> list[dict]:
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

        status = e.get("finished", False) and "success" or e.get("status", "unknown")

        error = None
        items_procesados = None
        # El detalle completo (includeData=true) es una llamada extra por
        # ejecución — solo se pide cuando hace falta: para sacar el mensaje
        # de error de una ejecución fallida, o el conteo de items del
        # workflow principal.
        if status != "success" or incluir_items_procesados:
            detalle = await obtener_detalle_ejecucion(e.get("id", ""))
            if detalle:
                if status != "success":
                    error = _extraer_mensaje_error(detalle)
                if incluir_items_procesados:
                    items_procesados = _contar_items_procesados(detalle)

        ejecuciones.append({
            "id": e.get("id", ""),
            "startedAt": started,
            "stoppedAt": stopped,
            "status": status,
            "duracion_segundos": duracion,
            "error": error,
            "items_procesados": items_procesados,
        })

    logger.info("Historial de n8n: %d ejecuciones obtenidas para workflow %s", len(ejecuciones), workflow_id)
    return ejecuciones


async def obtener_historial_principal(limite: int = 10) -> list[dict]:
    """Obtiene el historial del workflow principal, con conteo de logs procesados."""
    return await obtener_historial_ejecuciones(
        WORKFLOW_ID_PRINCIPAL, limite, incluir_items_procesados=True
    )


async def obtener_historial_metricas(limite: int = 10) -> list[dict]:
    """Obtiene el historial del workflow de métricas de Prometheus."""
    return await obtener_historial_ejecuciones(WORKFLOW_ID_METRICAS, limite)
