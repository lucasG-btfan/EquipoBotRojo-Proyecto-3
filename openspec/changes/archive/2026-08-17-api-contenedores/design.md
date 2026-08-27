# Design: api-contenedores (CH04)

## Contexto

CH00 dejó el andamiaje listo: el router `backend/routers/contenedores.py` ya está registrado en `main.py` con prefijo `/api/status`, ya está protegido con `Depends(usuario_actual)` (CH02), y `backend/services/docker_service.py` expone las dos funciones asíncronas como stub. Este change solo rellena el servicio y conecta el router.

## Entorno real (verificado)

Antes de elegir cliente hay que fijar un hecho que cambia la decisión:

- `192.168.100.160` **es esta misma máquina** (IP LAN del host Windows, confirmada con `ipconfig`). El stack no corre en un host remoto: corre en **Docker Desktop local**.
- `docker context ls` reporta el endpoint `npipe:////./pipe/dockerDesktopLinuxEngine`. En Windows, Docker Desktop **no expone un socket Unix**: expone un *named pipe*.
- Por lo tanto el default `DOCKER_HOST=unix:///var/run/docker.sock` de `config.py` **no aplica en este entorno**.

Esto invalida la premisa de que basta con `httpx`: **`httpx` no sabe hablar named pipes de Windows** (su parámetro `uds` requiere un socket `AF_UNIX` real, que Docker Desktop no ofrece).

## Decisión 1 — Cliente Docker: SDK oficial `docker` (docker-py) — **DECIDIDA**

Ambas opciones evaluadas son **solo lectura** contra el demonio y ninguna toca el stack: no modifican `docker-compose.yml`, ni los contenedores, ni los workflows de n8n.

| Opción | Veredicto |
|---|---|
| Habilitar `tcp://localhost:2375` en Docker Desktop y seguir con `httpx` | **Descartada.** No agregaba dependencias, pero deja el demonio Docker accesible **sin autenticación** en localhost — control equivalente a root para cualquier proceso de la máquina. Además exige un paso manual que hay que repetir si se reinstala Docker Desktop. |
| SDK oficial `docker` (docker-py) | **ELEGIDA.** Habla `npipe://`, `unix://` y `tcp://` de forma transparente: funciona con Docker Desktop **sin configuración manual ni checkbox**, sin bajar la seguridad del demonio, y seguiría funcionando sin cambios si el stack se moviera a un host Linux. |

**Dependencia nueva `docker==7.*` — aprobada explícitamente por el usuario** (regla dura del proyecto: consultar antes de instalar).

### Consecuencia: el SDK es síncrono

docker-py bloquea. Toda llamada al SDK DEBE ejecutarse fuera del event loop con `asyncio.to_thread(...)`, o congelaría todas las peticiones concurrentes de FastAPI mientras espera a Docker. Esta es la única complejidad que introduce la decisión y está reflejada en `tasks.md` §2.

El cliente se crea **una vez por request** y se cierra en un `finally` — no se cachea a nivel módulo, porque un cliente cuyo demonio se reinició (algo esperable: el usuario levanta Docker Desktop a mano) queda inservible y no se recupera solo.

## Decisión 2 — Resolución de `DOCKER_HOST`

El servicio lee `settings.DOCKER_HOST` y nunca hardcodea ruta ni IP. Con el SDK no hace falta interpretar el esquema a mano:

```python
cliente = docker.DockerClient(base_url=settings.DOCKER_HOST, timeout=TIMEOUT_DOCKER)
```

acepta `npipe://`, `unix://` y `tcp://` directamente.

**Hay que corregir el default de `DOCKER_HOST`** en `config.py` y `.env.example`: el actual `unix:///var/run/docker.sock` no existe en Docker Desktop sobre Windows. El valor correcto para este entorno es:

```
DOCKER_HOST=npipe:////./pipe/dockerDesktopLinuxEngine
```

(tomado de `docker context ls`, contexto `desktop-linux`, que es el activo).

> Alternativa equivalente: `docker.from_env()` respeta la variable de entorno `DOCKER_HOST` del proceso y cae al default de la plataforma si no está. Se prefiere el `base_url` explícito para que la configuración pase siempre por `config.py` y sea visible en un solo lugar.

## Decisión 3 — Llamadas del SDK usadas

| Función | Llamada docker-py | Notas |
|---|---|---|
| Estado | `cliente.containers.list(all=True)` | `all=True` para que también aparezcan los detenidos (`exited`), no solo los `running`. |
| Recursos | `contenedor.stats(stream=False)` | `stream=False` devuelve una sola muestra que ya incluye `precpu_stats`, suficiente para calcular el delta de CPU en una única llamada. |

De cada objeto `Container` se usan `.name` (ya viene sin la barra inicial, a diferencia del campo `Names` del API crudo), `.status` y `.ports`. El dict que devuelve `.stats()` es la respuesta cruda del Engine API, así que la fórmula de §5 no cambia.

## Decisión 4 — Lista de contenedores relevantes

Constante del servicio, en el orden en que conviene mostrarlos:

```python
CONTENEDORES_STACK = (
    "n8n", "fail2ban", "prometheus", "alertmanager", "syslog-ng",
    "wazuh-manager", "wazuh-indexer", "wazuh-dashboard",
    "elasticsearch", "logstash", "kibana",
    "security-postgres", "fail2ban-exporter", "security-pgadmin",
)
```

Verificada contra los `container_name` de `docker-compose.yml`: coincide exactamente con los 14 contenedores del stack. Se filtra por esta lista para no ensuciar el dashboard con contenedores ajenos, y se reporta `estado: "no_encontrado"` para los que la lista incluye pero Docker no conoce — así el operador ve el hueco en vez de una fila que desaparece.

## Decisión 5 — Cálculo de CPU y RAM

Fórmula estándar del Docker Engine API:

```
cpu_delta    = cpu_stats.cpu_usage.total_usage - precpu_stats.cpu_usage.total_usage
system_delta = cpu_stats.system_cpu_usage      - precpu_stats.system_cpu_usage
online_cpus  = cpu_stats.online_cpus (o len(cpu_usage.percpu_usage))
cpu_porcentaje = (cpu_delta / system_delta) * online_cpus * 100   # si system_delta > 0
```

RAM:

```
ram_bytes      = memory_stats.usage - memory_stats.stats.cache   # cache puede no existir
ram_mb         = ram_bytes / (1024 * 1024)
ram_porcentaje = ram_bytes / memory_stats.limit * 100
```

Ambos valores se redondean a 2 decimales. Toda clave se lee con `.get()` con default, porque el shape de `stats` varía entre versiones de Docker y entre Linux/Windows; una clave faltante debe dar `None`, nunca un `KeyError`.

## Decisión 6 — Paralelismo y degradación parcial

`obtener_recursos_contenedores()` consulta las stats de todos los contenedores `running` **en paralelo**: cada `contenedor.stats(stream=False)` va envuelto en `asyncio.to_thread(...)` y todos se lanzan juntos con `asyncio.gather(..., return_exceptions=True)`, bajo un `asyncio.wait_for(..., timeout=5.0)` global. Los resultados que sean excepción se descartan y se retorna el resto. Es la única forma de cumplir "timeout corto de 5 s" con 14 contenedores: en serie, 14 llamadas de ~1 s ya superarían el presupuesto.

`stats(stream=False)` es la llamada más lenta del SDK (el demonio muestrea ~1 s antes de responder), así que el paralelismo no es una optimización opcional acá: es lo que hace viable el endpoint.

> **Nota de implementación:** `asyncio.to_thread` usa el threadpool por defecto del intérprete. Con 14 llamadas concurrentes no hay problema, pero conviene no subir ese número sin revisar el tamaño del pool.

Si **ninguna** llamada tuvo éxito, se asume que Docker está caído y se levanta `ErrorDocker` → `503`.

## Decisión 7 — Contrato de respuesta: nombres de campo en español — **DECIDIDA**

El roadmap escribe el ejemplo como `{"nombre": "n8n", "cpu_percent": 2.3, "ram_mb": 256}`, pero `schemas/contenedor.py` (creado en CH00) ya define `cpu_porcentaje` / `ram_porcentaje` / `ram_uso`, y la regla dura del proyecto es que todo va en español.

**Se mantiene el español** y se ajusta el schema para cubrir el dato de MB que pedía el roadmap:

```python
class RecursoSchema(BaseModel):
    nombre: str
    cpu_porcentaje: float | None = None
    ram_mb: float | None = None
    ram_porcentaje: float | None = None
```

Se elimina `ram_uso: str | None` (era un string sin formato definido, redundante con `ram_mb`). `ContenedorSchema` queda como está (`nombre`, `estado`, `puerto`); `puerto` se rellena desde `.ports` cuando hay un puerto publicado, y queda `None` si no.

**Confirmado por el usuario:** apartarse del literal del roadmap (`cpu_percent`) para respetar la regla dura de "todo en español". Ningún consumidor existe todavía, así que el costo es cero ahora y no lo sería después. El roadmap (`CHANGES.md`) queda desactualizado en ese detalle a propósito — no se toca, porque las reglas del proyecto priman sobre el ejemplo del roadmap.

## Manejo de errores

```python
class ErrorDocker(Exception):
    """El demonio Docker no está disponible o respondió de forma inesperada."""
```

El servicio traduce a `ErrorDocker`, con mensaje en español, las excepciones de docker-py y del transporte:

| Excepción | Cuándo |
|---|---|
| `docker.errors.DockerException` | Falla al construir el cliente (incluye `DOCKER_HOST` inválido) |
| `docker.errors.APIError` | El demonio respondió un error |
| `docker.errors.NotFound` | El contenedor desapareció entre el `list()` y el `stats()` |
| `requests.exceptions.ConnectionError` / `Timeout` | El demonio no responde. **docker-py usa `requests` por debajo, no `httpx`** — es un detalle fácil de errar al escribir los `except`. |
| `asyncio.TimeoutError` | Se agotó el presupuesto de 5 s del `wait_for` |

El router:

```python
try:
    return await docker_service.obtener_estado_contenedores()
except ErrorDocker as e:
    raise HTTPException(status_code=503, detail=f"No se pudo contactar al demonio Docker: {e}")
except Exception as e:
    raise HTTPException(status_code=500, detail=f"Error al obtener contenedores: {e}")
```

Nunca se deja escapar una excepción sin capturar, y ningún mensaje expone traza cruda.

## Fuera de alcance del diseño

Sin tests automatizados (regla del proyecto). La verificación es manual, vía `/docs` y `curl`, y está enumerada en `tasks.md` §5.
