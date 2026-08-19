# Design: api-fail2ban (CH11)

## Context

Motivación en `proposal.md` — Why. Requisitos de comportamiento en `specs/estado-fail2ban/spec.md`.

Estado actual relevante:

- `backend/routers/fail2ban.py` tiene `GET /api/fail2ban/jail` como stub protegido con `Depends(usuario_actual)`.
- `backend/services/fail2ban_service.py` es un stub que retorna `{}`. Su docstring dice "vía Prometheus", lo que ya no aplica: Prometheus da el contador, no la lista de IPs.
- `backend/services/docker_service.py` (CH04) ya resuelve el acceso al demonio Docker con el SDK `docker` (docker-py), incluyendo `DOCKER_HOST`, `ErrorDocker`, traducción de excepciones a mensajes en español, timeout de 5 s y ejecución en `asyncio.to_thread` (el SDK es síncrono).
- `backend/schemas/fail2ban.py` tiene un `JailSchema` (`nombre`/`estado`/`total_baneadas`) que no coincide con el contrato del roadmap.

Restricción dura del proyecto: no se toca `docker-compose.yml` ni la configuración del contenedor `fail2ban`. El backend solo puede leer.

Salida típica que hay que interpretar:

```
Status for the jail: n8n-soar-jail
|- Filter
|  |- Currently failed: 0
|  |- Total failed:     12
|  `- File list:        /var/log/security/alerts.log
`- Actions
   |- Currently banned: 3
   |- Total banned:     7
   `- Banned IP list:   1.2.3.4 5.6.7.8 9.10.11.12
```

## Goals / Non-Goals

**Goals:**

- Obtener nombre de jail, cantidad de baneadas y lista de IPs con una sola llamada, sin estado compartido ni caché.
- Reutilizar la infraestructura Docker de CH04 en lugar de crear un segundo camino de acceso al demonio.
- Aislar el parsing de la salida textual en una función pura, para que sea la parte fácil de razonar y de cambiar si el formato de `fail2ban-client` varía.
- Que toda falla llegue al router como una excepción de dominio propia y salga como `503` en español.

**Non-Goals:**

- Soportar múltiples jails en una misma respuesta.
- Reemplazar la métrica `fail2ban_banned_ips` de Prometheus (CH05) en el Dashboard general.
- Cualquier operación de escritura sobre Fail2ban.

## Decisions

### 1. Ejecutar `fail2ban-client` vía `exec_run` del SDK `docker`, no `subprocess`

El roadmap describe el comando como `docker exec fail2ban fail2ban-client status n8n-soar-jail`. Se implementa con `cliente.containers.get(<contenedor>).exec_run([...])` del SDK `docker`, no lanzando el CLI `docker` con `subprocess`.

Motivos:

- El SDK ya es dependencia del proyecto desde CH04 y respeta `DOCKER_HOST` (named pipe en Windows, socket Unix en Linux). No agrega dependencias ni supuestos nuevos.
- `subprocess` exigiría que el binario `docker` esté en el `PATH` del proceso del backend, algo que no se cumple si el backend corre containerizado, y obligaría a construir una línea de comandos como texto.
- El comando se pasa como **lista de argumentos**, nunca como string interpolado a un shell. Aunque el nombre de la jail viene de configuración y no del usuario, esto elimina de raíz cualquier riesgo de inyección de comandos.

Alternativas descartadas:

- **Consultar solo Prometheus (`fail2ban_banned_ips`)**: da el contador pero no la lista de IPs, que es justamente el detalle que pide la sección Fail2ban del dashboard (SDD §3.6).
- **Leer la base de datos de Fail2ban (`fail2ban.sqlite3`)**: acopla el backend al formato interno de Fail2ban y requeriría montar un volumen — es decir, tocar `docker-compose.yml`, prohibido.
- **`fail2ban-client status <jail> --output json`**: no está disponible de forma consistente en las versiones empaquetadas; se prefiere parsear el formato estable de texto.

### 2. Reutilizar `_crear_cliente()` de `docker_service` en lugar de duplicarlo

`fail2ban_service` importa el helper de creación de cliente y la traducción de errores de `docker_service` en vez de instanciar su propio `DockerClient`. Mantiene un único punto donde se decide cómo se habla con Docker, y hereda el timeout de 5 s y los mensajes en español ya escritos.

Para no depender de nombres privados entre módulos, en `docker_service` se agregan dos alias públicos — `crear_cliente = _crear_cliente` y `traducir_error = _traducir_error` — que `fail2ban_service` importa. No se renombra ni se toca el código existente de CH04: cero cambio de comportamiento en `/api/status/*`.

Alternativa descartada: duplicar la lógica de cliente en `fail2ban_service`. Barato hoy, pero dos lugares donde arreglar el mismo bug de transporte mañana.

### 3. Excepción de dominio propia `ErrorFail2ban`

El router necesita responder `503` tanto si falla Docker como si falla Fail2ban, pero con mensajes distinguibles. El servicio captura `ErrorDocker` y lo re-lanza envuelto en `ErrorFail2ban` con el mensaje ya compuesto en español. El router entonces tiene un único `except ErrorFail2ban → 503` más un `except Exception → 500`, igual que `contenedores.py`.

Casos que producen `ErrorFail2ban`:

| Situación | Mensaje (idea) |
|---|---|
| Contenedor no existe / detenido | "El contenedor de Fail2ban no está disponible: …" |
| Demonio Docker caído | "No se pudo contactar al demonio Docker: …" |
| `exit_code != 0` | "Fail2ban respondió un error al consultar la jail '<jail>': …" |
| Jail inexistente | "La jail '<jail>' no existe en Fail2ban" |
| Timeout | "Se agotó el tiempo de espera consultando a Fail2ban" |
| Salida no parseable | "No se pudo interpretar la respuesta de Fail2ban" |

### 4. Parser como función pura sobre el texto de salida

`_parsear_estado_jail(salida: str) -> dict` no toca Docker: recibe el texto y devuelve `{"jail", "baneadas", "ips"}`.

Reglas de parsing:

- Nombre de jail: línea `Status for the jail: <nombre>`. Si no aparece, se usa el nombre de la jail configurada (el comando la nombra explícitamente, así que no es ambiguo).
- Lista de IPs: se toma lo que sigue a `Banned IP list:` y se separa por espacios en blanco, descartando vacíos.
- `baneadas`: se toma de `Currently banned:` si está presente; si no, se deriva de `len(ips)`.
- Si el texto no contiene ni `Banned IP list` ni `Currently banned`, se considera no interpretable → `ErrorFail2ban`.

**Decisión no obvia:** cuando `Currently banned` y `len(ips)` no coinciden (puede pasar si una IP expira entre que Fail2ban imprime el contador y la lista), se retorna `baneadas = len(ips)`. La respuesta debe ser internamente consistente: el frontend muestra el contador junto a la lista, y un número que no cuadra con las filas visibles se lee como un bug del panel.

### 5. Nombre de jail y de contenedor por configuración

`FAIL2BAN_CONTAINER` (default `fail2ban`) y `FAIL2BAN_JAIL` (default `n8n-soar-jail`) en `backend/config.py`. Los defaults son los valores reales del stack actual, así que no requieren `.env` nuevo. Sigue la regla del proyecto de no embeber identificadores de infraestructura en el código, y hace el endpoint reutilizable si la jail se renombra — igual que se hizo con `SYSLOG_HOST`/`SYSLOG_PORT` en CH07.

### 6. `JailSchema` se reescribe según el contrato del roadmap

Pasa a `{ "jail": str, "baneadas": int, "ips": list[str] }`. El `JailSchema` actual (`nombre`/`estado`/`total_baneadas`) fue un placeholder de CH00 que nunca se consumió. `IPBaneadaSchema` se deja como está: no se usa en este change, y borrarlo es ruido innecesario.

## Risks / Trade-offs

- **El formato de salida de `fail2ban-client` puede cambiar entre versiones** → el parsing está aislado en una función pura y no asume posiciones fijas: busca etiquetas (`Banned IP list:`, `Currently banned:`) en cualquier línea. Una salida no reconocible produce `503` con mensaje claro, no una respuesta vacía silenciosa.
- **`exec_run` es una llamada bloqueante del SDK** → se ejecuta con `asyncio.to_thread` y bajo `asyncio.wait_for` con el mismo timeout de 5 s de CH04, para no bloquear el event loop ni colgar la petición.
- **El backend necesita acceso al demonio Docker para funcionar** → ya es el caso desde CH04 para `/api/status/*`; no se introduce una superficie nueva. Todo lo que se ejecuta es un comando fijo de solo lectura, con argumentos que provienen de configuración del operador y nunca de la petición HTTP.
- **Polling cada 10 s desde el frontend (CH18) implica un `exec` cada 10 s** → `fail2ban-client status` es liviano y el costo es comparable al de las stats de contenedores que ya se consultan. No se agrega caché: cachear introduciría estado y ventanas de desincronización para ahorrar muy poco.
- **El contador de Prometheus y el de este endpoint pueden diferir momentáneamente** → son fuentes distintas con tiempos de scrape distintos. Es esperado; este endpoint es el autoritativo para la vista de detalle.

## Migration Plan

No aplica migración de datos. El endpoint pasa de stub a implementación real; no hay consumidores en producción todavía (la vista es CH18). Rollback = revertir el commit.
