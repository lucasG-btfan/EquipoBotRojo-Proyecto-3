# Tasks: api-fail2ban (CH11)

## 1. Configuración y contrato

- [x] 1.1 Agregar `FAIL2BAN_CONTAINER: str = "fail2ban"` y `FAIL2BAN_JAIL: str = "n8n-soar-jail"` a `Settings` en `backend/config.py`, con comentario que explique que los defaults son los del stack actual (design §5)
- [x] 1.2 Reescribir `JailSchema` en `backend/schemas/fail2ban.py` como `jail: str`, `baneadas: int`, `ips: list[str]`, según el contrato del roadmap (design §6). Dejar `IPBaneadaSchema` sin cambios
- [x] 1.3 Documentar las dos variables nuevas en el bloque de `.env` del backend en `CLAUDE.md`, siguiendo el formato usado para `SYSLOG_HOST`/`SYSLOG_PORT` de CH07

## 2. Acceso a Docker reutilizable

- [x] 2.1 En `backend/services/docker_service.py`, exponer los alias públicos `crear_cliente = _crear_cliente` y `traducir_error = _traducir_error` sin modificar el código existente de CH04 (design §2)

## 3. Servicio de Fail2ban

- [x] 3.1 Reemplazar el docstring obsoleto de `backend/services/fail2ban_service.py` ("vía Prometheus") por la descripción real: consulta a `fail2ban-client` dentro del contenedor `fail2ban` vía Docker Engine API
- [x] 3.2 Definir la excepción `ErrorFail2ban` en `fail2ban_service.py`, con docstring en español
- [x] 3.3 Implementar `_parsear_estado_jail(salida: str) -> dict` como función pura: extrae `jail` de `Status for the jail:`, las IPs de `Banned IP list:` separando por espacios y descartando vacíos, y `baneadas` como `len(ips)` (design §4). Levanta `ErrorFail2ban` si la salida no contiene ni `Banned IP list` ni `Currently banned`
- [x] 3.4 Implementar `_ejecutar_status_sync(contenedor: str, jail: str) -> str`: obtiene el contenedor con `crear_cliente()`, ejecuta `exec_run(["fail2ban-client", "status", jail])` **pasando el comando como lista, nunca como string** (design §1), y retorna la salida decodificada. Cierra el cliente en `finally`
- [x] 3.5 Traducir a `ErrorFail2ban` los fallos de 3.4 con mensajes en español distinguibles: contenedor inexistente o detenido, demonio Docker caído (envolviendo `ErrorDocker`), `exit_code != 0`, y jail inexistente detectada en la salida (design §3)
- [x] 3.6 Implementar `async def obtener_estado_jail() -> dict`: lee `settings.FAIL2BAN_CONTAINER` y `settings.FAIL2BAN_JAIL`, ejecuta 3.4 con `asyncio.to_thread` bajo `asyncio.wait_for(timeout=5.0)`, aplica 3.3 y retorna `{"jail", "baneadas", "ips"}`. El `TimeoutError` se traduce a `ErrorFail2ban` con mensaje de tiempo agotado

## 4. Endpoint

- [x] 4.1 En `backend/routers/fail2ban.py`, tipar `GET /jail` con `response_model=JailSchema` y delegar en `fail2ban_service.obtener_estado_jail()`, manteniendo `Depends(usuario_actual)`
- [x] 4.2 Manejo de errores explícito siguiendo el patrón de `routers/contenedores.py`: `except ErrorFail2ban` → `503` con el mensaje del servicio, `except Exception` → `500` con mensaje genérico en español

## 5. Verificación manual

- [x] 5.1 Levantar el backend y verificar en `/docs` que `GET /api/fail2ban/jail` declara el schema `jail`/`baneadas`/`ips` y exige token
- [x] 5.2 Con el stack arriba, consultar el endpoint con token válido y confirmar `200` con la jail real, el contador y la lista de IPs coherentes entre sí
- [x] 5.3 Confirmar `503` con mensaje en español al detener el contenedor `fail2ban` (o apuntando `FAIL2BAN_CONTAINER` a un nombre inexistente), y `503` distinto al apuntar `FAIL2BAN_JAIL` a una jail inexistente
- [x] 5.4 Confirmar que el endpoint rechaza la petición sin token de sesión
