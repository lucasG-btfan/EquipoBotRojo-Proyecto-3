"""Servicio de integración con Fail2ban — consulta estado de jail vía Docker Engine API.

Ejecuta `fail2ban-client status <jail>` dentro del contenedor `fail2ban` usando
`exec_run` del SDK `docker`, reutilizando el cliente y la traducción de errores
de `docker_service` (CH04). No usa `subprocess`: ver
`openspec/changes/api-fail2ban/design.md` §1 para el detalle de la decisión.
"""

import asyncio

import docker.errors

from backend.config import settings
from backend.services.docker_service import ErrorDocker, crear_cliente, traducir_error

TIMEOUT_FAIL2BAN = 5.0


class ErrorFail2ban(Exception):
    """Fail2ban o el contenedor que lo aloja no respondió de forma utilizable."""


def _parsear_estado_jail(salida: str) -> dict:
    """Interpreta la salida de texto de `fail2ban-client status <jail>`.

    Función pura: no toca Docker. Busca las etiquetas en cualquier línea, sin
    asumir posiciones fijas, para tolerar variaciones de formato entre versiones.
    """
    if "Banned IP list" not in salida and "Currently banned" not in salida:
        raise ErrorFail2ban("No se pudo interpretar la respuesta de Fail2ban")

    nombre_jail = ""
    ips: list[str] = []

    for linea in salida.splitlines():
        linea = linea.strip()
        if "Status for the jail:" in linea:
            nombre_jail = linea.split("Status for the jail:", 1)[1].strip()
        elif "Banned IP list:" in linea:
            resto = linea.split("Banned IP list:", 1)[1]
            ips = [ip for ip in resto.split() if ip]

    return {
        "jail": nombre_jail,
        "baneadas": len(ips),
        "ips": ips,
    }


def _ejecutar_status_sync(contenedor_nombre: str, jail: str) -> str:
    """Ejecuta `fail2ban-client status <jail>` dentro del contenedor de Fail2ban.

    Llamada síncrona y bloqueante — se ejecuta dentro de `asyncio.to_thread`.
    """
    cliente = crear_cliente()
    try:
        try:
            contenedor = cliente.containers.get(contenedor_nombre)
        except docker.errors.NotFound as e:
            raise ErrorFail2ban(
                f"El contenedor de Fail2ban no está disponible: no existe '{contenedor_nombre}'"
            ) from e

        if contenedor.status != "running":
            raise ErrorFail2ban(
                f"El contenedor de Fail2ban no está disponible: '{contenedor_nombre}' "
                f"está en estado '{contenedor.status}'"
            )

        try:
            resultado = contenedor.exec_run(["fail2ban-client", "status", jail])
        except docker.errors.APIError as e:
            raise traducir_error(e) from e

        salida = (resultado.output or b"").decode("utf-8", errors="replace")

        if resultado.exit_code != 0:
            if "does not exist" in salida or "Sorry but the jail" in salida:
                raise ErrorFail2ban(f"La jail '{jail}' no existe en Fail2ban")
            raise ErrorFail2ban(
                f"Fail2ban respondió un error al consultar la jail '{jail}': {salida.strip()}"
            )

        return salida
    except ErrorDocker as e:
        raise ErrorFail2ban(f"No se pudo contactar al demonio Docker: {e}") from e
    finally:
        cliente.close()


async def obtener_estado_jail() -> dict:
    """Obtiene el estado de la jail de Fail2ban configurada por variables de entorno."""
    contenedor = settings.FAIL2BAN_CONTAINER
    jail = settings.FAIL2BAN_JAIL

    try:
        salida = await asyncio.wait_for(
            asyncio.to_thread(_ejecutar_status_sync, contenedor, jail),
            timeout=TIMEOUT_FAIL2BAN,
        )
    except asyncio.TimeoutError as e:
        raise ErrorFail2ban("Se agotó el tiempo de espera consultando a Fail2ban") from e
    except ErrorFail2ban:
        raise
    except Exception as e:
        raise ErrorFail2ban(f"Error inesperado al consultar Fail2ban: {e}") from e

    return _parsear_estado_jail(salida)


def _ejecutar_ban_sync(contenedor_nombre: str, jail: str, ip: str) -> None:
    """Ejecuta `fail2ban-client set <jail> banip <ip>` dentro del contenedor de Fail2ban.

    Llamada síncrona y bloqueante — se ejecuta dentro de `asyncio.to_thread`.
    """
    cliente = crear_cliente()
    try:
        try:
            contenedor = cliente.containers.get(contenedor_nombre)
        except docker.errors.NotFound as e:
            raise ErrorFail2ban(
                f"El contenedor de Fail2ban no está disponible: no existe '{contenedor_nombre}'"
            ) from e

        if contenedor.status != "running":
            raise ErrorFail2ban(
                f"El contenedor de Fail2ban no está disponible: '{contenedor_nombre}' "
                f"está en estado '{contenedor.status}'"
            )

        try:
            resultado = contenedor.exec_run(["fail2ban-client", "set", jail, "banip", ip])
        except docker.errors.APIError as e:
            raise traducir_error(e) from e

        salida = (resultado.output or b"").decode("utf-8", errors="replace")

        if resultado.exit_code != 0:
            raise ErrorFail2ban(
                f"Fail2ban respondió un error al banear IP {ip} en jail '{jail}': {salida.strip()}"
            )
    except ErrorDocker as e:
        raise ErrorFail2ban(f"No se pudo contactar al demonio Docker: {e}") from e
    finally:
        cliente.close()


async def banear_ip(ip: str) -> dict:
    """Banea una IP en la jail de Fail2ban configurada por variables de entorno."""
    contenedor = settings.FAIL2BAN_CONTAINER
    jail = settings.FAIL2BAN_JAIL

    try:
        await asyncio.wait_for(
            asyncio.to_thread(_ejecutar_ban_sync, contenedor, jail, ip),
            timeout=TIMEOUT_FAIL2BAN,
        )
    except asyncio.TimeoutError as e:
        raise ErrorFail2ban("Se agotó el tiempo de espera banneando IP") from e
    except ErrorFail2ban:
        raise
    except Exception as e:
        raise ErrorFail2ban(f"Error inesperado al banear IP: {e}") from e

    return {"ip": ip, "jail": jail, "mensaje": f"IP {ip} baneada correctamente en {jail}"}
