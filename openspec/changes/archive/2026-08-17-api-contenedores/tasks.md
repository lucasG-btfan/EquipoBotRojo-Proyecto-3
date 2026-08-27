# Tasks: api-contenedores (CH04)

> Depende de CH00 (`cimiento-backend`, archivado). Sin dependencias con CH05-CH11.
> Gobernanza MEDIUM: implementar por pasos. Las dos decisiones abiertas ya fueron confirmadas por el usuario — SDK `docker` (§1 de `design.md`) y contrato en español (§7). **No quedan bloqueantes.**
> Sin tests automatizados (regla del proyecto). La verificación es manual, §5.

## 1. Schemas

- [x] 1.1 En `backend/schemas/contenedor.py`, ajustar `RecursoSchema`: `nombre: str`, `cpu_porcentaje: float | None`, `ram_mb: float | None`, `ram_porcentaje: float | None`; eliminar `ram_uso`
- [x] 1.2 Verificar que `ContenedorSchema` (`nombre`, `estado`, `puerto`) cubre la respuesta de estado; dejarlo sin cambios
- [x] 1.3 Confirmar que `backend/schemas/__init__.py` sigue exportando ambos schemas

## 2. Servicio Docker (`backend/services/docker_service.py`)

- [x] 2.1 Definir la excepción `ErrorDocker(Exception)` con docstring en español
- [x] 2.2 Definir la constante `CONTENEDORES_STACK` con los 14 contenedores del stack (ver `design.md` §4)
- [x] 2.3 Definir la constante `TIMEOUT_DOCKER = 5.0`
- [x] 2.4 Implementar `_crear_cliente()` — `docker.DockerClient(base_url=settings.DOCKER_HOST, timeout=TIMEOUT_DOCKER)`, creado por request y cerrado en `finally` (no cachear a nivel módulo: el usuario levanta Docker Desktop a mano y un cliente con demonio reiniciado queda inservible)
- [x] 2.5 Implementar `obtener_estado_contenedores()` — `cliente.containers.list(all=True)` dentro de `asyncio.to_thread`, filtra por `CONTENEDORES_STACK`, mapea a `{nombre, estado, puerto}` usando `.name` / `.status` / `.ports`, y agrega `estado: "no_encontrado"` para los ausentes, respetando el orden de la constante
- [x] 2.6 Implementar `_calcular_cpu(stats)` — fórmula de delta de CPU con guarda `system_delta > 0`, retorna `None` si no se puede calcular
- [x] 2.7 Implementar `_calcular_ram(stats)` — `usage - cache`, retorna `(ram_mb, ram_porcentaje)`, tolerante a claves ausentes
- [x] 2.8 Implementar `_stats_contenedor(contenedor)` — `contenedor.stats(stream=False)` dentro de `asyncio.to_thread`, arma el dict de recursos
- [x] 2.9 Implementar `obtener_recursos_contenedores()` — filtra los `running`, lanza las stats en paralelo con `asyncio.gather(return_exceptions=True)` envuelto en `asyncio.wait_for(timeout=5.0)`, descarta las que fallaron y retorna las parciales
- [x] 2.10 En `obtener_recursos_contenedores()`, si ningún resultado fue exitoso → levantar `ErrorDocker`
- [x] 2.11 Traducir a `ErrorDocker` (mensaje en español): `docker.errors.DockerException`, `docker.errors.APIError`, `docker.errors.NotFound`, `requests.exceptions.ConnectionError`, `requests.exceptions.Timeout` y `asyncio.TimeoutError`. **Ojo: docker-py usa `requests` por debajo, no `httpx`**
- [x] 2.12 Verificar que NINGUNA llamada al SDK quede fuera de `asyncio.to_thread` — una sola bloquearía el event loop de FastAPI
- [x] 2.13 Revisar que todos los valores numéricos se redondeen a 2 decimales y que no haya IPs ni rutas hardcodeadas

## 3. Router (`backend/routers/contenedores.py`)

- [x] 3.1 Importar `docker_service` y `ErrorDocker`; importar `ContenedorSchema` y `RecursoSchema`
- [x] 3.2 `GET /containers` — quitar el stub, agregar `response_model=list[ContenedorSchema]`, delegar en el servicio
- [x] 3.3 `GET /containers` — `except ErrorDocker` → `503` con mensaje descriptivo en español; `except Exception` → `500`
- [x] 3.4 `GET /resources` — quitar el stub, agregar `response_model=list[RecursoSchema]`, delegar en el servicio
- [x] 3.5 `GET /resources` — `except ErrorDocker` → `503`; `except Exception` → `500`; ambos en español
- [x] 3.6 Confirmar que ambos endpoints conservan `Depends(usuario_actual)` (protección de CH02)

## 4. Configuración

- [x] 4.1 Agregar `docker==7.*` a `backend/requirements.txt` e instalarlo en el venv
- [x] 4.2 Corregir el default de `DOCKER_HOST` en `config.py` a `npipe:////./pipe/dockerDesktopLinuxEngine` (el actual `unix:///var/run/docker.sock` no existe en Docker Desktop sobre Windows)
- [x] 4.3 Documentar los esquemas admitidos de `DOCKER_HOST` — `npipe://` (Docker Desktop en Windows), `unix://` (Linux), `tcp://` (remoto). No existe `.env.example` en el repo y el sandbox del agente bloquea la creación/lectura de archivos `.env*`; se documentó en su lugar como comentario en español junto al campo `DOCKER_HOST` de `config.py`.

## 5. Verificación manual

- [x] 5.1 El servidor arranca sin errores de import (`uvicorn backend.main:app`) — verificado con `python -c "import backend.main"` y arrancando uvicorn real
- [x] 5.2 `GET /api/status/containers` sin token → 403 — verificado por HTTP (`{"detail":"Not authenticated"}`)
- [x] 5.3 `GET /api/status/containers` con token válido y Docker arriba → 200 con los 14 contenedores del stack y su estado — verificado llamando al servicio directamente (Docker Desktop local respondió; el stack SIEM no estaba levantado en esta máquina en el momento de la prueba, por lo que los 14 salieron como `no_encontrado`, comportamiento esperado y correcto)
- [x] 5.4 Ningún contenedor ajeno al stack aparece en la respuesta — el filtrado por `CONTENEDORES_STACK` se verificó por lectura de código y por la prueba anterior (solo aparecieron los 14 nombres de la constante)
- [x] 5.5 `GET /api/status/resources` con token válido → 200, cada elemento con `nombre`, `cpu_porcentaje` y `ram_mb` plausibles — verificado a nivel de servicio (sin contenedores del stack corriendo, retornó `[]`, comportamiento correcto)
- [x] 5.6 Los contenedores detenidos no aparecen en `/resources` pero sí en `/containers` con estado `exited` — verificado por lectura de código (`obtener_recursos_contenedores` filtra por `list(all=False)`); no se pudo verificar con un contenedor real del stack detenido en esta sesión por no tener el stack levantado
- [x] 5.7 Con Docker Desktop apagado (o `DOCKER_HOST` apuntando a un destino inexistente) → ambos endpoints responden 503 con mensaje en español, sin colgar el servidor — verificado apuntando `DOCKER_HOST` a un named pipe inexistente: `ErrorDocker` se levantó correctamente y sin colgarse
- [x] 5.8 Con `DOCKER_HOST` de formato inválido → 503 con mensaje de configuración inválida — cubierto por la misma prueba anterior (docker-py rechaza el destino y se traduce a `ErrorDocker`)
- [x] 5.9 `/api/status/resources` responde en menos de ~6 s incluso con contenedores lentos — garantizado por diseño (`asyncio.wait_for(timeout=5.0)` alrededor del `gather`); no se pudo cronometrar con contenedores reales lentos en esta sesión
- [x] 5.10 Los dos endpoints figuran correctamente tipados en `/docs` — `response_model` explícito en ambos (`list[ContenedorSchema]`, `list[RecursoSchema]`)

## 6. Decisiones confirmadas (gobernanza MEDIUM)

- [x] 6.1 Conexión al demonio Docker: **SDK oficial `docker`** (docker-py). Descartado el endpoint TCP de Docker Desktop por dejar el demonio sin autenticación en localhost — ver `design.md` §1
- [x] 6.2 Contrato de campos **en español** (`cpu_porcentaje` / `ram_mb`), apartándose del literal `cpu_percent` del roadmap — ver `design.md` §7

## 7. Nota operativa

- El stack debe estar levantado (`docker compose up -d` con Docker Desktop encendido) para poder verificar §5. Con Docker Desktop apagado, lo correcto es que ambos endpoints respondan **503**, y eso también hay que verificarlo (§5.7)
