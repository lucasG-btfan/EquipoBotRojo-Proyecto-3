"""Servicio de integración con Wazuh — conteo de alertas nativas vía el indexador.

Consulta el *indexador* de Wazuh (OpenSearch, puerto publicado `9201`), no la
API del manager (`55000`): en Wazuh 4.7.2 el manager no expone conteo de
alertas y exige un flujo de autenticación con JWT en vez de Basic Auth. Las
alertas nativas (FIM, integridad, rootcheck) se indexan en los índices
`wazuh-alerts-*`, y `_count` obtiene el total sin transferir el detalle. Ver
`openspec/changes/api-wazuh/design.md` §1 para el detalle de la decisión.
"""

from __future__ import annotations

import ssl

import httpx

from backend.config import settings

TIMEOUT_WAZUH = 5.0

MENSAJE_ALERTAS = "Alertas nativas de Wazuh (FIM, integridad, etc.)"


class ErrorWazuh(Exception):
    """Wazuh (el indexador) no respondió de forma utilizable."""


def _extraer_total(datos: dict) -> int:
    """Extrae el total de alertas del cuerpo de respuesta de `_count`.

    Función pura: no toca la red. La respuesta esperada de OpenSearch trae
    `count` como entero (ej. ``{"count": 42, "_shards": {...}}``).
    """
    total = datos.get("count")
    if not isinstance(total, int) or isinstance(total, bool):
        raise ErrorWazuh("No se pudo interpretar la respuesta de Wazuh: falta o es inválido el campo 'count'")
    return total


async def contar_alertas_wazuh() -> dict:
    """Cuenta las alertas nativas de Wazuh consultando el indexador.

    Retorna un dict con ``total`` (int) y ``mensaje`` (str). Un índice
    `wazuh-alerts-*` todavía inexistente (stack recién levantado) se trata
    como `total: 0`, no como error.
    """
    url = f"{settings.WAZUH_INDEXER_URL.rstrip('/')}/{settings.WAZUH_ALERTS_INDEX}/_count"

    try:
        async with httpx.AsyncClient(
            timeout=TIMEOUT_WAZUH, verify=settings.WAZUH_VERIFY_TLS
        ) as cliente:
            respuesta = await cliente.get(
                url,
                auth=(settings.WAZUH_INDEXER_USER, settings.WAZUH_INDEXER_PASSWORD),
            )
    except httpx.TimeoutException as e:
        raise ErrorWazuh(
            f"La consulta a Wazuh superó el tiempo máximo de espera ({TIMEOUT_WAZUH}s)"
        ) from e
    except httpx.ConnectError as e:
        if _es_error_certificado(e):
            raise ErrorWazuh("Problema de certificado TLS con Wazuh") from e
        raise ErrorWazuh(
            f"No se pudo conectar con Wazuh en {settings.WAZUH_INDEXER_URL}"
        ) from e
    except httpx.HTTPError as e:
        raise ErrorWazuh(f"Error de conexión con Wazuh: {e}") from e

    if respuesta.status_code == 404:
        cuerpo_texto = respuesta.text or ""
        if "index_not_found_exception" in cuerpo_texto:
            return {"total": 0, "mensaje": MENSAJE_ALERTAS}
        raise ErrorWazuh(
            f"Wazuh respondió con error (código {respuesta.status_code}): {cuerpo_texto[:200]}"
        )

    if respuesta.status_code in (401, 403):
        raise ErrorWazuh("Las credenciales de Wazuh fueron rechazadas")

    if respuesta.status_code != 200:
        raise ErrorWazuh(
            f"Wazuh respondió con error (código {respuesta.status_code}): {(respuesta.text or '')[:200]}"
        )

    try:
        datos = respuesta.json()
    except ValueError as e:
        raise ErrorWazuh("No se pudo interpretar la respuesta de Wazuh: no es JSON válido") from e

    total = _extraer_total(datos)
    return {"total": total, "mensaje": MENSAJE_ALERTAS}


def _es_error_certificado(error: Exception) -> bool:
    """Determina si un `httpx.ConnectError` se originó en la verificación TLS.

    httpx envuelve los errores de `ssl` dentro de `ConnectError`; hay que
    inspeccionar la cadena de causas para distinguir "certificado no
    confiable" de "no se pudo conectar" (host caído, puerto cerrado, etc.).
    """
    causa: BaseException | None = error
    while causa is not None:
        if isinstance(causa, ssl.SSLError):
            return True
        causa = causa.__cause__ or causa.__context__
    return False
