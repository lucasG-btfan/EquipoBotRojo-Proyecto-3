"""Servicio de integración con n8n — ejecución y monitoreo de workflows."""

from __future__ import annotations

import asyncio
import logging
import time
from collections import OrderedDict

import httpx

from backend.config import settings

logger = logging.getLogger("backend.services.n8n")

# ── Timeouts para requests a n8n (segundos) ─────────────────────────────────
# Webhooks: disparan workflows que pueden tardar en aceptarse → margen amplio.
TIMEOUT_N8N = 10.0
# Consultas de API (historial/detalles): el panel las consulta por polling,
# una respuesta lenta satura el backend → timeout corto.
TIMEOUT_N8N_API = 5.0

# ── URLs de webhook de los workflows ────────────────────────────────────────
# Estos webhooks están configurados como triggers adicionales en los workflows
# de n8n, permitiendo ejecutarlos manualmente desde el dashboard.
WEBHOOK_ANALISIS_URL = f"{settings.N8N_URL.rstrip('/')}/webhook/ejecutar-analisis"
WEBHOOK_METRICAS_URL = f"{settings.N8N_URL.rstrip('/')}/webhook/ejecutar-metricas"

# ── IDs de los workflows (n8n) cuyo historial se muestra en el panel ───────
# Viven en la configuración (`N8N_WORKFLOW_ID_PRINCIPAL` /
# `N8N_WORKFLOW_ID_METRICAS`): al recrear un workflow en n8n su ID cambia y
# se actualiza por entorno, sin tocar código.

# Nodo del workflow principal cuyo conteo de items de salida se usa como
# "cantidad de logs procesados" — específico de la estructura actual de ese
# workflow (Workflow_fase _3-final). Si el workflow se reestructura y este
# nodo se renombra, el conteo vuelve a caer a `None` sin romper el endpoint.
NODO_LOGS_ESTRUCTURADOS = "Estructurar Entradas de Log"
NODO_SIN_ALERTAS = "Sin alertas"

# ── Cliente HTTP compartido ────────────────────────────────────────────────
# Un único cliente reutiliza conexiones (keep-alive) y evita crear un cliente
# nuevo por llamada (que generaba flood de resoluciones DNS).
_CLIENTE_HTTP: httpx.AsyncClient | None = None


def _obtener_cliente() -> httpx.AsyncClient:
    """Devuelve el cliente HTTP compartido, recreándolo si está cerrado."""
    global _CLIENTE_HTTP
    if _CLIENTE_HTTP is None or _CLIENTE_HTTP.is_closed:
        _CLIENTE_HTTP = httpx.AsyncClient(
            timeout=TIMEOUT_N8N,
            limits=httpx.Limits(
                max_connections=20,
                max_keepalive_connections=10,
                keepalive_expiry=30.0,
            ),
        )
    return _CLIENTE_HTTP


# ── Cache de detalles de ejecuciones FINALIZADAS ───────────────────────────
# Una ejecución finalizada es inmutable: su detalle (error / items procesados)
# nunca cambia. Cacheamos la respuesta de n8n por `execution_id` para no
# repetir el fan-out de detalles en cada poll del frontend.
_CACHE_DETALLES_TTL = 600.0  # 10 minutos
_CACHE_DETALLES_MAX = 200
_cache_detalles: OrderedDict[str, tuple[float, dict]] = OrderedDict()


def _cache_detalle_get(execution_id: str) -> dict | None:
    entrada = _cache_detalles.get(execution_id)
    if entrada is None:
        return None
    ts, detalle = entrada
    if time.monotonic() - ts > _CACHE_DETALLES_TTL:
        _cache_detalles.pop(execution_id, None)
        return None
    _cache_detalles.move_to_end(execution_id)
    return detalle


def _cache_detalle_put(execution_id: str, detalle: dict) -> None:
    _cache_detalles[execution_id] = (time.monotonic(), detalle)
    _cache_detalles.move_to_end(execution_id)
    while len(_cache_detalles) > _CACHE_DETALLES_MAX:
        _cache_detalles.popitem(last=False)


# Última respuesta válida del listado por workflow: ante un fallo puntual de
# n8n se devuelve esta foto reciente en vez de vaciar el historial del panel.
_ULTIMO_HISTORIAL_TTL = 120.0
_ultimo_historial: dict[str, tuple[float, list[dict]]] = {}


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
        respuesta = await _obtener_cliente().post(url)
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

    # Ejecución finalizada → inmutable: si ya está cacheada, no se reconsulta.
    detalle_cacheado = _cache_detalle_get(execution_id)
    if detalle_cacheado is not None:
        return detalle_cacheado

    headers = {
        "X-N8N-API-KEY": settings.N8N_API_KEY,
        "Accept": "application/json",
    }

    try:
        respuesta = await _obtener_cliente().get(
            f"{settings.N8N_URL.rstrip('/')}/api/v1/executions/{execution_id}",
            params={"includeData": "true"},
            headers=headers,
            timeout=TIMEOUT_N8N_API,
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
        detalle = respuesta.json()
    except ValueError:
        return None
    _cache_detalle_put(execution_id, detalle)
    return detalle


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
def _historial_degradado(workflow_id: str) -> list[dict]:
    """Devuelve la última foto válida del historial si sigue fresca, o [].

    Ante un fallo puntual de n8n es mejor mostrar el último historial conocido
    que vaciar el panel del usuario (degradación elegante).
    """
    snapshot = _ultimo_historial.get(workflow_id)
    if snapshot is None:
        return []
    ts, datos = snapshot
    antiguedad = time.monotonic() - ts
    if antiguedad > _ULTIMO_HISTORIAL_TTL:
        return []
    logger.warning(
        "n8n no respondió — se sirve última foto del historial de %s (%.0fs de antigüedad)",
        workflow_id,
        antiguedad,
    )
    return datos


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
        respuesta = await _obtener_cliente().get(
            f"{settings.N8N_URL.rstrip('/')}/api/v1/executions",
            params={"workflowId": workflow_id, "limit": limite},
            headers=headers,
            timeout=TIMEOUT_N8N_API,
        )
    except (httpx.ConnectError, httpx.TimeoutException, httpx.HTTPError) as e:
        logger.warning("Error al consultar historial de n8n: %s", e)
        return _historial_degradado(workflow_id)

    if respuesta.status_code != 200:
        logger.warning("n8n respondió HTTP %d al consultar historial: %s", respuesta.status_code, respuesta.text[:200])
        return _historial_degradado(workflow_id)

    try:
        datos = respuesta.json()
    except ValueError:
        logger.warning("Respuesta de n8n no es JSON válido al consultar historial")
        return _historial_degradado(workflow_id)

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

    # 1) Base del historial con los datos que ya trae el listado (sin llamadas
    #    extra). El detalle completo solo se pide cuando aporta algo: mensaje
    #    de error de una ejecución fallida, o conteo de items del principal.
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

        ejecuciones.append({
            "id": e.get("id", ""),
            "startedAt": started,
            "stoppedAt": stopped,
            "status": status,
            "duracion_segundos": duracion,
            "error": None,
            "items_procesados": None,
        })

    # 2) Enriquecimiento en PARALELO: cada detalle es una llamada HTTP propia;
    #    hacerlas en secuencia multiplicaba la latencia total por N ejecuciones.
    async def _enriquecer(ejecucion: dict, necesita_error: bool, necesita_items: bool) -> None:
        if not (necesita_error or necesita_items) or not ejecucion["id"]:
            return
        detalle = await obtener_detalle_ejecucion(ejecucion["id"])
        if detalle is None:
            return  # best-effort: el campo queda en None, el historial no se rompe
        if necesita_error:
            ejecucion["error"] = _extraer_mensaje_error(detalle)
        if necesita_items:
            ejecucion["items_procesados"] = _contar_items_procesados(detalle)

    await asyncio.gather(*[
        _enriquecer(e, necesita_error=e["status"] != "success",
                    necesita_items=incluir_items_procesados)
        for e in ejecuciones
    ])

    _ultimo_historial[workflow_id] = (time.monotonic(), ejecuciones)

    logger.info("Historial de n8n: %d ejecuciones obtenidas para workflow %s", len(ejecuciones), workflow_id)
    return ejecuciones


async def obtener_historial_principal(limite: int = 10) -> list[dict]:
    """Obtiene el historial del workflow principal, con conteo de logs procesados."""
    return await obtener_historial_ejecuciones(
        settings.N8N_WORKFLOW_ID_PRINCIPAL, limite, incluir_items_procesados=True
    )


async def obtener_historial_metricas(limite: int = 10) -> list[dict]:
    """Obtiene el historial del workflow de métricas de Prometheus."""
    return await obtener_historial_ejecuciones(settings.N8N_WORKFLOW_ID_METRICAS, limite)
