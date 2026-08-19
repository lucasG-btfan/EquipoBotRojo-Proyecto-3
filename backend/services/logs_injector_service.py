"""Servicio de inyección de logs de prueba — genera tráfico syslog sintético
dentro del stack SIEM para poder demostrar y verificar la cadena completa de
detección (syslog-ng → Wazuh → n8n → PostgreSQL → Fail2ban → Prometheus) sin
depender de un ataque real.

Reutiliza el patrón de acceso a Docker fijado en CH04 (`docker_service.py`):
SDK oficial `docker` (docker-py), cliente nuevo por operación a partir de
`settings.DOCKER_HOST`, ejecución síncrona envuelta en `asyncio.to_thread`.

Este servicio NO crea, arranca ni modifica ningún contenedor. Los emisores
(`web-server`, `firewall`, `db-server`) son una precondición que el operador
prepara a mano (ver `README.md`); el servicio solo los verifica y ejecuta
`logger` dentro de ellos. Ver `openspec/changes/api-logs-injector/design.md`
para el detalle de las decisiones.
"""

import asyncio
from dataclasses import dataclass

import docker
import docker.errors

from backend.config import settings
from backend.services.docker_service import ErrorDocker, _crear_cliente, _traducir_error

TIMEOUT_INYECCION = 60.0

EMISORES = ("web-server", "firewall", "db-server")

NOMBRE_PAQUETE_COMPLETO = "paquete_completo"
ETIQUETA_PAQUETE_COMPLETO = "Paquete completo"


class ErrorInyeccionLogs(Exception):
    """El mecanismo de emisión (demonio Docker o contenedor emisor) no está disponible."""


class CategoriaInvalida(Exception):
    """La categoría solicitada no pertenece al catálogo cerrado."""


@dataclass(frozen=True)
class EntradaLog:
    """Una línea de log a emitir: tag, prioridad syslog, mensaje y repeticiones."""
    tag: str
    prioridad: str
    mensaje: str
    repeticiones: int


@dataclass(frozen=True)
class CategoriaLog:
    """Una categoría del catálogo: etiqueta legible, host de origen y sus entradas de log."""
    etiqueta: str
    host_origen: str
    entradas: tuple[EntradaLog, ...]


# Catálogo cerrado — mensajes y cantidades según docs/SDD.md §3.3; tag y prioridad
# según los ejemplos verificados en `Ejemplos de comandos para logs.txt` y, para
# `service_restart` / `log_legitimo`, el ejemplo literal confirmado por el usuario
# (design.md §Decisión 3).
CATALOGO_CATEGORIAS: dict[str, CategoriaLog] = {
    "root_login": CategoriaLog(
        etiqueta="Intento de login root",
        host_origen="web-server",
        entradas=(
            EntradaLog(
                tag="sshd",
                prioridad="auth.warning",
                mensaje="Failed password for root from 185.220.101.9 port 22 ssh2",
                repeticiones=2,
            ),
        ),
    ),
    "ssh_failed": CategoriaLog(
        etiqueta="Fallo de contraseña SSH",
        host_origen="web-server",
        entradas=(
            EntradaLog(
                tag="sshd",
                prioridad="auth.warning",
                mensaje="Failed password for admin from 45.33.32.156 port 22 ssh2",
                repeticiones=12,
            ),
        ),
    ),
    "access_denied": CategoriaLog(
        etiqueta="Acceso denegado",
        host_origen="web-server",
        entradas=(
            EntradaLog(
                tag="sshd",
                prioridad="auth.err",
                mensaje="Access denied to /var/www/html/.htpasswd from 54.210.15.20",
                repeticiones=7,
            ),
        ),
    ),
    "port_scan": CategoriaLog(
        etiqueta="Escaneo de puertos",
        host_origen="firewall",
        entradas=(
            EntradaLog(
                tag="kernel",
                prioridad="kern.warning",
                mensaje="SCAN detected SRC=194.165.16.99 DPT=22 DPT=80 DPT=443 DPT=3306 DPT=8080",
                repeticiones=2,
            ),
        ),
    ),
    "iptables_drop": CategoriaLog(
        etiqueta="Bloqueo iptables",
        host_origen="firewall",
        entradas=(
            EntradaLog(
                tag="kernel",
                prioridad="kern.warning",
                mensaje="iptables: DROP IN=eth0 OUT= SRC=45.142.212.100 DST=192.168.1.1 PROTO=TCP DPT=22",
                repeticiones=6,
            ),
        ),
    ),
    "sudo_usage": CategoriaLog(
        etiqueta="Uso de sudo",
        host_origen="db-server",
        entradas=(
            EntradaLog(
                tag="sudo",
                prioridad="auth.notice",
                mensaje="db_admin : TTY=pts/0 ; PWD=/home/db_admin ; USER=root ; COMMAND=/bin/bash",
                repeticiones=2,
            ),
        ),
    ),
    "kernel_oops": CategoriaLog(
        etiqueta="Kernel oops",
        host_origen="db-server",
        entradas=(
            EntradaLog(
                tag="kernel",
                prioridad="kern.emerg",
                mensaje="Oops: BUG: unable to handle kernel NULL pointer dereference at 0000000000000000",
                repeticiones=1,
            ),
        ),
    ),
    "service_restart": CategoriaLog(
        etiqueta="Reinicio de servicio",
        host_origen="db-server",
        entradas=(
            EntradaLog(
                tag="systemd",
                prioridad="daemon.info",
                mensaje="Started OpenSSH Daemon (server).",
                repeticiones=2,
            ),
        ),
    ),
    "log_legitimo": CategoriaLog(
        etiqueta="Log legítimo",
        host_origen="web-server",
        entradas=(
            EntradaLog(
                tag="sshd",
                prioridad="auth.info",
                mensaje="Accepted password for rafael from 192.168.1.10 port 22 ssh2",
                repeticiones=1,
            ),
        ),
    ),
}

CATEGORIAS_VALIDAS = tuple(CATALOGO_CATEGORIAS) + (NOMBRE_PAQUETE_COMPLETO,)


def _construir_comando(entrada: EntradaLog) -> list[str]:
    """Arma el comando `logger` como lista de argumentos — nunca un string, nunca un shell."""
    return [
        "logger",
        "-n", settings.SYSLOG_HOST,
        "-P", str(settings.SYSLOG_PORT),
        "-d",
        "-t", entrada.tag,
        "-p", entrada.prioridad,
        "--rfc3164", entrada.mensaje,
    ]


def _resolver_entradas(categoria: str) -> list[tuple[str, EntradaLog]]:
    """Devuelve la lista de (host_origen, entrada) a emitir para la categoría pedida.

    Levanta `CategoriaInvalida` si la clave no está en el catálogo. `paquete_completo`
    se expande como la concatenación ordenada de las nueve categorías individuales.
    """
    if categoria == NOMBRE_PAQUETE_COMPLETO:
        resultado: list[tuple[str, EntradaLog]] = []
        for datos_categoria in CATALOGO_CATEGORIAS.values():
            for entrada in datos_categoria.entradas:
                resultado.append((datos_categoria.host_origen, entrada))
        return resultado

    datos_categoria = CATALOGO_CATEGORIAS.get(categoria)
    if datos_categoria is None:
        raise CategoriaInvalida(
            f"Categoría inválida: '{categoria}'. "
            f"Categorías válidas: {', '.join(CATEGORIAS_VALIDAS)}"
        )
    return [(datos_categoria.host_origen, entrada) for entrada in datos_categoria.entradas]


def _resolver_redes_syslog(cliente: docker.DockerClient) -> set[str]:
    """Inspecciona `SYSLOG_HOST` y devuelve los nombres reales de sus redes.

    No hardcodea `security-network`: Compose la materializa como
    `<proyecto>_security-network`, por lo que el nombre real se resuelve en runtime.
    """
    contenedor = cliente.containers.get(settings.SYSLOG_HOST)
    redes = contenedor.attrs.get("NetworkSettings", {}).get("Networks", {})
    return set(redes.keys())


def _verificar_emisor_sync(cliente: docker.DockerClient, nombre: str, redes_syslog: set[str]):
    """Verifica que el emisor `nombre` esté listo para emitir. Nunca crea, arranca ni
    modifica un contenedor: si algo falta, levanta `ErrorInyeccionLogs` con el comando
    literal para resolverlo (design.md §Decisión 7, riesgos R6/R7).
    """
    try:
        contenedor = cliente.containers.get(nombre)
    except docker.errors.NotFound:
        raise ErrorInyeccionLogs(
            f"El contenedor emisor '{nombre}' no está disponible. Creálo con:\n"
            f"docker run -d --name {nombre} --hostname {nombre} --network <red> alpine sleep infinity\n"
            f"docker exec {nombre} apk add --no-cache util-linux"
        )

    if contenedor.status != "running":
        raise ErrorInyeccionLogs(
            f"El contenedor emisor '{nombre}' existe pero no está en ejecución "
            f"(estado: {contenedor.status}). Iniciálo con:\n"
            f"docker start {nombre}"
        )

    redes_contenedor = set(contenedor.attrs.get("NetworkSettings", {}).get("Networks", {}).keys())
    if not (redes_contenedor & redes_syslog):
        red_ejemplo = next(iter(redes_syslog), "<red>")
        raise ErrorInyeccionLogs(
            f"El contenedor emisor '{nombre}' no comparte red con '{settings.SYSLOG_HOST}' "
            f"y sus logs se perderían. Conectálo con:\n"
            f"docker network connect {red_ejemplo} {nombre}"
        )

    # No alcanza con `command -v logger`: la imagen `alpine` trae el applet `logger` de
    # BusyBox preinstalado, que no soporta `--rfc3164` (silenciosamente falla en el
    # `exec_run` real). Se verifica que la variante instalada sea la de util-linux
    # comprobando que su `--help` liste `--rfc3164` (design.md riesgo R1b/R6).
    resultado = contenedor.exec_run(["sh", "-c", "logger --help 2>&1 | grep -q -- --rfc3164"])
    if resultado.exit_code != 0:
        raise ErrorInyeccionLogs(
            f"El contenedor emisor '{nombre}' no tiene instalada la variante de 'logger' "
            f"de util-linux (solo trae la de BusyBox, que no soporta '--rfc3164'). "
            f"Instalála con:\n"
            f"docker exec {nombre} apk add --no-cache util-linux"
        )

    return contenedor


def _inyectar_sync(entradas: list[tuple[str, EntradaLog]]) -> int:
    """Ejecuta la ráfaga completa de forma síncrona — se ejecuta dentro de un único
    `asyncio.to_thread`. Verifica todos los emisores involucrados antes de emitir el
    primer log; si un `exec_run` falla a mitad de camino, aborta e informa cuántos
    logs alcanzaron a emitirse.
    """
    cliente = _crear_cliente()
    try:
        redes_syslog = _resolver_redes_syslog(cliente)

        hosts_involucrados = sorted({host for host, _ in entradas})
        contenedores_por_host = {
            host: _verificar_emisor_sync(cliente, host, redes_syslog)
            for host in hosts_involucrados
        }

        total = sum(entrada.repeticiones for _, entrada in entradas)
        emitidos = 0
        for host, entrada in entradas:
            contenedor = contenedores_por_host[host]
            comando = _construir_comando(entrada)
            for _ in range(entrada.repeticiones):
                resultado = contenedor.exec_run(comando)
                if resultado.exit_code != 0:
                    raise ErrorInyeccionLogs(
                        f"Falló la emisión de un log en '{host}' "
                        f"(código de salida {resultado.exit_code}). "
                        f"Se alcanzaron a emitir {emitidos} de {total} logs."
                    )
                emitidos += 1
        return emitidos
    finally:
        cliente.close()


async def inyectar_categoria(categoria: str) -> int:
    """Inyecta los logs de la categoría pedida y devuelve la cantidad efectivamente
    emitida. Levanta `CategoriaInvalida` (400) o `ErrorInyeccionLogs` (503).
    """
    entradas = _resolver_entradas(categoria)

    try:
        return await asyncio.wait_for(
            asyncio.to_thread(_inyectar_sync, entradas),
            timeout=TIMEOUT_INYECCION,
        )
    except ErrorInyeccionLogs:
        raise
    except asyncio.TimeoutError as e:
        raise ErrorInyeccionLogs(
            "Se agotó el tiempo de espera inyectando los logs"
        ) from e
    except Exception as e:
        raise ErrorInyeccionLogs(str(_traducir_error(e))) from e


def _emisores_disponibles_sync() -> dict[str, bool]:
    """Comprueba la disponibilidad de los tres emisores. Nunca levanta: ante cualquier
    fallo (Docker caído, emisor no listo), la categoría afectada queda en `False`.
    """
    try:
        cliente = _crear_cliente()
    except ErrorDocker:
        return {emisor: False for emisor in EMISORES}

    try:
        try:
            redes_syslog = _resolver_redes_syslog(cliente)
        except Exception:
            return {emisor: False for emisor in EMISORES}

        disponibilidad: dict[str, bool] = {}
        for emisor in EMISORES:
            try:
                _verificar_emisor_sync(cliente, emisor, redes_syslog)
                disponibilidad[emisor] = True
            except Exception:
                disponibilidad[emisor] = False
        return disponibilidad
    finally:
        cliente.close()


async def listar_categorias() -> list[dict]:
    """Devuelve el catálogo aplanado para el frontend, incluyendo `paquete_completo`
    y la disponibilidad del emisor de cada categoría. Si Docker no responde, el
    catálogo se devuelve igual con `emisor_disponible = False`, no con error.
    """
    disponibilidad = await asyncio.to_thread(_emisores_disponibles_sync)

    resultado = []
    for clave, datos_categoria in CATALOGO_CATEGORIAS.items():
        cantidad = sum(entrada.repeticiones for entrada in datos_categoria.entradas)
        resultado.append({
            "categoria": clave,
            "etiqueta": datos_categoria.etiqueta,
            "host_origen": datos_categoria.host_origen,
            "cantidad_logs": cantidad,
            "emisor_disponible": disponibilidad.get(datos_categoria.host_origen, False),
        })

    cantidad_total = sum(item["cantidad_logs"] for item in resultado)
    resultado.append({
        "categoria": NOMBRE_PAQUETE_COMPLETO,
        "etiqueta": ETIQUETA_PAQUETE_COMPLETO,
        "host_origen": ", ".join(EMISORES),
        "cantidad_logs": cantidad_total,
        "emisor_disponible": all(disponibilidad.values()),
    })
    return resultado
