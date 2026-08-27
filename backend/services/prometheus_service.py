"""Servicio de integración con Prometheus — consulta métricas y alertas.

Usa httpx.AsyncClient para consultar la API de Prometheus de forma asíncrona.
Todas las métricas de Fail2ban se obtienen vía Prometheus (nunca directamente del exporter).
"""

from __future__ import annotations

import httpx

from backend.config import settings

# ── Timeout para todas las consultas a Prometheus (segundos) ────────────────
TIMEOUT_PROMETHEUS = 5.0

# ── Alertas que el dashboard siempre muestra ────────────────────────────────
ALERTAS_ESPERADAS: dict[str, str] = {
    "IpBaneadaDetectada": "IP baneada detectada por Fail2ban",
    "Fail2banCaido": "Fail2ban no está activo",
    "AtaqueMasivo": "Ataque masivo detectado",
}


# ── Excepciones personalizadas ──────────────────────────────────────────────
class PrometheusConnectionError(Exception):
    """No se pudo conectar con la API de Prometheus."""


class PrometheusTimeoutError(Exception):
    """La consulta a Prometheus excedió el tiempo de espera."""


class PrometheusResponseError(Exception):
    """Prometheus retornó una respuesta con formato inesperado."""


# ── Funciones auxiliares ─────────────────────────────────────────────────────
async def _consultar_prometheus(endpoint: str, params: dict | None = None) -> dict:
    """Consulta un endpoint de la API de Prometheus con timeout configurable.

    Parámetros:
        endpoint: ruta relativa (ej. ``/api/v1/rules``).
        params: query-string opcional.

    Retorna:
        El JSON deserializado de la respuesta.

    Lanza:
        PrometheusConnectionError: si no se puede establecer conexión.
        PrometheusTimeoutError: si la consulta supera TIMEOUT_PROMETHEUS.
        PrometheusResponseError: si la respuesta tiene formato inesperado.
    """
    url = f"{settings.PROMETHEUS_URL.rstrip('/')}{endpoint}"

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT_PROMETHEUS) as cliente:
            respuesta = await cliente.get(url, params=params)
    except httpx.ConnectError as e:
        raise PrometheusConnectionError(
            f"No se pudo conectar con Prometheus en {settings.PROMETHEUS_URL}: {e}"
        ) from e
    except httpx.TimeoutException as e:
        raise PrometheusTimeoutError(
            f"La consulta a Prometheus tardó más de {TIMEOUT_PROMETHEUS}s: {e}"
        ) from e
    except httpx.HTTPError as e:
        raise PrometheusResponseError(
            f"Error HTTP al consultar Prometheus: {e}"
        ) from e

    # Verificar que la respuesta sea exitosa
    if respuesta.status_code != 200:
        raise PrometheusResponseError(
            f"Prometheus respondió HTTP {respuesta.status_code}: {respuesta.text}"
        )

    try:
        datos = respuesta.json()
    except ValueError as e:
        raise PrometheusResponseError(
            f"La respuesta de Prometheus no es JSON válido: {e}"
        ) from e

    return datos


def _extraer_estado_alertas(datos_rules: dict) -> list[dict]:
    """Extrae el estado de las 3 alertas esperadas de la respuesta de /api/v1/rules.

    Si una alerta no existe en la configuración de Prometheus, se retorna
    con ``estado: "no_configurada"``.
    """
    # Construir un mapa nombre → estado desde las reglas de Prometheus
    mapa_alertas: dict[str, str] = {}

    for grupo in datos_rules.get("data", {}).get("groups", []):
        for regla in grupo.get("rules", []):
            nombre = regla.get("name", "")
            if nombre in ALERTAS_ESPERADAS:
                mapa_alertas[nombre] = regla.get("state", "desconocido")

    resultado = []
    for nombre, descripcion in ALERTAS_ESPERADAS.items():
        resultado.append({
            "nombre": nombre,
            "descripcion": descripcion,
            "estado": mapa_alertas.get(nombre, "no_configurada"),
        })

    return resultado


def _extraer_metrica_fail2ban(datos_query: dict) -> float | None:
    """Extrae el valor numérico de una respuesta de /api/v1/query.

    Retorna ``None`` si no hay resultados o el formato es inesperado.
    """
    resultados = datos_query.get("data", {}).get("result", [])
    if not resultados:
        return None

    valor_str = resultados[0].get("value", [None, None])[1]
    if valor_str is None:
        return None

    try:
        return float(valor_str)
    except (ValueError, TypeError):
        return None


# ── Funciones públicas ──────────────────────────────────────────────────────
async def obtener_estado_alertas() -> list[dict]:
    """Consulta el estado de las 3 alertas definidas en Prometheus.

    Retorna una lista de 3 objetos con ``nombre``, ``descripcion`` y ``estado``.
    Las alertas ausentes en Prometheus se marcan como ``"no_configurada"``.
    """
    datos = await _consultar_prometheus("/api/v1/rules")
    return _extraer_estado_alertas(datos)


async def obtener_metricas_fail2ban() -> dict:
    """Consulta las métricas de Fail2ban a través de Prometheus.

    Retorna un dict con ``banned_ips`` (int | None) y ``up`` (float | None).
    """
    banned_ips_datos = await _consultar_prometheus(
        "/api/v1/query", params={"query": "fail2ban_banned_ips"}
    )
    up_datos = await _consultar_prometheus(
        "/api/v1/query", params={"query": "fail2ban_up"}
    )

    banned_ips = _extraer_metrica_fail2ban(banned_ips_datos)
    up = _extraer_metrica_fail2ban(up_datos)

    # banned_ips es un conteo, debe ser entero
    return {
        "banned_ips": int(banned_ips) if banned_ips is not None else None,
        "up": up,
    }


async def obtener_alertas_completas() -> dict:
    """Orquesta las consultas de alertas y métricas de Fail2ban.

    Retorna un dict con ``alertas``, ``fail2ban`` y ``ultima_actualizacion``.
    """
    from datetime import datetime, timezone

    alertas = await obtener_estado_alertas()
    fail2ban = await obtener_metricas_fail2ban()

    return {
        "alertas": alertas,
        "fail2ban": fail2ban,
        "ultima_actualizacion": datetime.now(timezone.utc).isoformat(),
    }


async def obtener_metricas_tpw() -> dict:
    """Obtiene las últimas mediciones de TPW desde Prometheus. Stub: retorna dict vacío."""
    return {}


async def obtener_alertas_prometheus() -> list[dict]:
    """Obtiene el estado de las alertas de Prometheus. Stub: retorna lista vacía."""
    return []
