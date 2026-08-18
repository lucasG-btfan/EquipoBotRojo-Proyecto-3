"""Servicio de integración con Docker — consulta estado y métricas de contenedores.

Usa el SDK oficial `docker` (docker-py), que habla `npipe://`, `unix://` y `tcp://`
de forma transparente según `settings.DOCKER_HOST`. El SDK es síncrono: toda
llamada se ejecuta con `asyncio.to_thread` para no bloquear el event loop de
FastAPI. Ver `openspec/changes/api-contenedores/design.md` para el detalle de
las decisiones.
"""

import asyncio

import docker
import docker.errors
import requests.exceptions

from backend.config import settings

TIMEOUT_DOCKER = 5.0

CONTENEDORES_STACK = (
    "n8n", "fail2ban", "prometheus", "alertmanager", "syslog-ng",
    "wazuh-manager", "wazuh-indexer", "wazuh-dashboard",
    "elasticsearch", "logstash", "kibana",
    "security-postgres", "fail2ban-exporter", "security-pgadmin",
)


class ErrorDocker(Exception):
    """El demonio Docker no está disponible o respondió de forma inesperada."""


def _crear_cliente() -> docker.DockerClient:
    """Crea un cliente Docker nuevo a partir de `DOCKER_HOST`.

    No se cachea a nivel módulo: si el demonio se reinició (el usuario levanta
    Docker Desktop a mano), un cliente viejo queda inservible y no se recupera solo.
    """
    try:
        return docker.DockerClient(base_url=settings.DOCKER_HOST, timeout=TIMEOUT_DOCKER)
    except docker.errors.DockerException as e:
        raise ErrorDocker(f"Configuración de acceso a Docker inválida: {e}") from e


def _traducir_error(e: Exception) -> ErrorDocker:
    """Traduce excepciones de docker-py/requests a `ErrorDocker` con mensaje en español."""
    if isinstance(e, docker.errors.NotFound):
        return ErrorDocker(f"El contenedor ya no existe en el demonio Docker: {e}")
    if isinstance(e, docker.errors.APIError):
        return ErrorDocker(f"El demonio Docker respondió un error: {e}")
    if isinstance(e, docker.errors.DockerException):
        return ErrorDocker(f"No se pudo contactar al demonio Docker: {e}")
    if isinstance(e, (requests.exceptions.ConnectionError, requests.exceptions.Timeout)):
        return ErrorDocker(f"El demonio Docker no responde: {e}")
    if isinstance(e, asyncio.TimeoutError):
        return ErrorDocker("Se agotó el tiempo de espera consultando al demonio Docker")
    return ErrorDocker(f"Error inesperado al consultar Docker: {e}")


def _obtener_puerto(contenedor) -> str | None:
    """Extrae el primer puerto publicado del contenedor, si existe."""
    puertos = contenedor.ports or {}
    for bindings in puertos.values():
        if bindings:
            return str(bindings[0].get("HostPort"))
    return None


def _listar_contenedores_sync() -> list[dict]:
    """Llamada síncrona al SDK — se ejecuta dentro de `asyncio.to_thread`."""
    cliente = _crear_cliente()
    try:
        contenedores = cliente.containers.list(all=True)
        por_nombre = {c.name: c for c in contenedores}

        resultado = []
        for nombre in CONTENEDORES_STACK:
            contenedor = por_nombre.get(nombre)
            if contenedor is None:
                resultado.append({"nombre": nombre, "estado": "no_encontrado", "puerto": None})
            else:
                resultado.append({
                    "nombre": nombre,
                    "estado": contenedor.status,
                    "puerto": _obtener_puerto(contenedor),
                })
        return resultado
    finally:
        cliente.close()


async def obtener_estado_contenedores() -> list[dict]:
    """Obtiene el estado de cada contenedor relevante del stack SIEM."""
    try:
        return await asyncio.to_thread(_listar_contenedores_sync)
    except ErrorDocker:
        raise
    except Exception as e:
        raise _traducir_error(e) from e


def _calcular_cpu(stats: dict) -> float | None:
    """Calcula el porcentaje de CPU a partir del delta entre `cpu_stats` y `precpu_stats`."""
    try:
        cpu_stats = stats.get("cpu_stats", {})
        precpu_stats = stats.get("precpu_stats", {})

        cpu_delta = cpu_stats.get("cpu_usage", {}).get("total_usage", 0) - \
            precpu_stats.get("cpu_usage", {}).get("total_usage", 0)
        system_delta = cpu_stats.get("system_cpu_usage", 0) - \
            precpu_stats.get("system_cpu_usage", 0)

        if system_delta <= 0:
            return None

        online_cpus = cpu_stats.get("online_cpus") or \
            len(cpu_stats.get("cpu_usage", {}).get("percpu_usage") or []) or 1

        return round((cpu_delta / system_delta) * online_cpus * 100, 2)
    except (KeyError, TypeError, ZeroDivisionError):
        return None


def _calcular_ram(stats: dict) -> tuple[float | None, float | None]:
    """Calcula RAM usada en MB y su porcentaje sobre el límite del contenedor."""
    try:
        memory_stats = stats.get("memory_stats", {})
        usage = memory_stats.get("usage")
        limite = memory_stats.get("limit")
        cache = memory_stats.get("stats", {}).get("cache", 0)

        if usage is None:
            return None, None

        ram_bytes = usage - cache
        ram_mb = round(ram_bytes / (1024 * 1024), 2)

        ram_porcentaje = None
        if limite:
            ram_porcentaje = round(ram_bytes / limite * 100, 2)

        return ram_mb, ram_porcentaje
    except (KeyError, TypeError, ZeroDivisionError):
        return None, None


def _stats_contenedor_sync(contenedor) -> dict:
    """Llamada síncrona a `stats()` — se ejecuta dentro de `asyncio.to_thread`."""
    stats = contenedor.stats(stream=False)
    cpu_porcentaje = _calcular_cpu(stats)
    ram_mb, ram_porcentaje = _calcular_ram(stats)
    return {
        "nombre": contenedor.name,
        "cpu_porcentaje": cpu_porcentaje,
        "ram_mb": ram_mb,
        "ram_porcentaje": ram_porcentaje,
    }


async def _stats_contenedor(contenedor) -> dict:
    return await asyncio.to_thread(_stats_contenedor_sync, contenedor)


def _listar_contenedores_activos_sync() -> list:
    cliente = _crear_cliente()
    try:
        contenedores = cliente.containers.list(all=False)
        return [c for c in contenedores if c.name in CONTENEDORES_STACK]
    finally:
        cliente.close()


async def obtener_recursos_contenedores() -> list[dict]:
    """Consulta CPU/RAM de cada contenedor en ejecución del stack, en paralelo.

    Tolerante a fallos parciales: si algunos contenedores no responden dentro
    del timeout, se retornan los que sí respondieron. Si ninguno responde,
    levanta `ErrorDocker`.
    """
    try:
        activos = await asyncio.to_thread(_listar_contenedores_activos_sync)
    except ErrorDocker:
        raise
    except Exception as e:
        raise _traducir_error(e) from e

    if not activos:
        return []

    try:
        resultados = await asyncio.wait_for(
            asyncio.gather(*(_stats_contenedor(c) for c in activos), return_exceptions=True),
            timeout=TIMEOUT_DOCKER,
        )
    except asyncio.TimeoutError as e:
        raise _traducir_error(e) from e

    exitosos = [r for r in resultados if not isinstance(r, Exception)]

    if not exitosos:
        raise ErrorDocker("No se pudo obtener el consumo de recursos de ningún contenedor")

    return exitosos
