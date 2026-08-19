# Design: api-logs-injector (CH07)

## Context

Ver `proposal.md` §Why para la motivación. Restricciones que condicionan el diseño:

- **CH04 ya fijó el patrón de acceso a Docker**: `backend/services/docker_service.py` usa el SDK oficial `docker` (docker-py), crea un cliente nuevo por operación a partir de `settings.DOCKER_HOST`, envuelve toda llamada síncrona en `asyncio.to_thread` y traduce las excepciones del SDK a una excepción propia con mensaje en español. CH07 debe seguir ese patrón, no inventar uno nuevo.
- **El archivo `Ejemplos de comandos para logs.txt` (raíz del repo) es la referencia operativa vigente** y fija la forma exacta del comando que el stack sabe procesar:
  ```
  docker exec wazuh-manager logger -n syslog-ng -P 514 -d -t sshd -p auth.warning --rfc3164 "<mensaje>"
  ```
  El comando se ejecuta **dentro de `wazuh-manager`** y envía el log por UDP al contenedor `syslog-ng` en el puerto 514.
- **`docs/SDD.md` §3.3 define el catálogo de categorías**: mensaje, cantidad de logs y "host de origen" (`web-server`, `firewall`, `db-server`) de cada una.
- **Los contenedores emisores son efímeros y los prepara el operador.** `web-server`, `firewall` y `db-server` **no están declarados en `docker-compose.yml`** — el stack declarado son 14 contenedores: `syslog-ng`, `security-postgres`, `security-pgadmin`, `elasticsearch`, `fail2ban`, `prometheus`, `alertmanager`, `fail2ban-exporter`, `kibana`, `logstash`, `n8n`, `wazuh-indexer`, `wazuh-manager`, `wazuh-dashboard`. El operador crea los emisores **a mano en cada sesión de pruebas**: los levanta en la red del stack, les instala `util-linux` con `apk add` para tener `logger`, y desde ahí emite. Este procedimiento está documentado en la tesis del proyecto y es una restricción de diseño, no un accidente. Consecuencia: su existencia al momento de una petición HTTP no puede darse por supuesta. Ver Decisión 2.
- **El `hostname` del emisor es lo que determina `source_host`.** `logger --rfc3164` escribe en la cabecera del frame syslog el hostname *local* del contenedor que ejecuta el comando. Por eso emitir desde un contenedor llamado `web-server` es la única forma de que la alerta quede registrada con ese origen — no es cosmético.
- **Las redes son de ámbito Compose**: `docker-compose.yml` declara `security-network` y `wazuh-network`, pero Docker Compose las materializa como `<proyecto>_security-network`. El nombre real no puede hardcodearse.
- Regla dura del proyecto: el agente no puede modificar `docker-compose.yml` ni la configuración de ningún contenedor del stack.

## Goals / Non-Goals

**Goals:**

- Emitir logs sintéticos que sean indistinguibles de logs reales para la cadena de detección (mismo transporte, mismo formato RFC3164, mismos `tag` y prioridad que los ejemplos verificados).
- Catálogo de categorías como única fuente de verdad, compartido por el endpoint de inyección y el endpoint de catálogo.
- Ninguna porción del comando ejecutado deriva de entrada del cliente.
- Consistencia total con el patrón Docker de CH04.

**Non-Goals:**

- Verificar que el log fue efectivamente detectado por Wazuh o persistido en PostgreSQL. El endpoint confirma emisión, no detección.
- Emular fielmente el `hostname` de origen de cada categoría (ver Decisión 2 y Riesgo 1).
- Inyección concurrente o encolada — la inyección es sincrónica dentro de la petición.

## Decisions

### 1. Reutilizar docker-py con `exec_run`, no `subprocess` contra el CLI de `docker`

**Decisión:** el servicio ejecuta `contenedor.exec_run(cmd=[...])` del SDK `docker`, envuelto en `asyncio.to_thread`, con el cliente creado igual que en `docker_service.py` (a partir de `settings.DOCKER_HOST`, cerrado en `finally`).

**Alternativa descartada:** `subprocess.run(["docker", "exec", ...])`. Requeriría que el binario `docker` esté en el `PATH` del proceso del backend — cierto hoy en la máquina del desarrollador, falso si el backend se containeriza más adelante — y agrega una segunda vía de acceso a Docker en un backend que ya tiene una. `exec_run` habla el mismo Engine API que ya usa CH04, con el mismo `DOCKER_HOST`, y devuelve `exit_code` y salida de forma estructurada en lugar de texto a parsear.

**Consecuencia:** el comando se pasa **como lista de argumentos**, nunca como string. docker-py no invoca un shell cuando `cmd` es una lista, de modo que el requisito de "sin construcción de comandos a partir de entrada del cliente" se cumple por construcción, no por saneamiento.

### 2. Los emisores son una precondición del operador; el sistema los verifica pero no los crea

**Decisión:** el backend **no crea ni arranca** los contenedores emisores. Antes de inyectar, verifica que `web-server` / `firewall` / `db-server` (según la categoría) existan y estén corriendo; si falta alguno, corta con `503` y un mensaje en español que nombra el emisor faltante e incluye el comando exacto para crearlo. Los emisores son un **paso de preparación manual del operador**, tal como está documentado en la tesis del proyecto.

**Por qué esta opción y no las otras:**

| Opción | Veredicto |
|---|---|
| **A. Verificar y fallar con mensaje claro (elegida)** | Preserva el procedimiento documentado en la tesis: los emisores se crean a mano como parte de la preparación de una prueba, y el sistema no altera esa narrativa. Mantiene el change en gobernanza LOW real: el backend sigue sin crear infraestructura, y su única escritura sobre Docker es el `exec` que emite el log. Es la opción con menos superficie de fallo (sin `pull` de imágenes, sin contenedores huérfanos, sin colisiones con lo que el operador ya creó). |
| **B. Auto-provisión idempotente** | Más cómoda en operación, pero le da al backend la capacidad de **crear infraestructura**, algo que ningún otro endpoint del panel hace y que cambia el procedimiento descrito en la tesis. Descartada por decisión del usuario. |
| **C. Declararlos en `docker-compose.yml`** | Los volvería permanentes y versionados, pero el agente tiene prohibido tocar ese archivo y el usuario prefiere no alterar el stack declarado. Descartada. |
| **D. Emitir todo desde `wazuh-manager`** | Colapsa `source_host` a un único valor y rompe la topología que el SDD describe y que los patrones de ataque distinguen. Descartada. |

**Aclaración sobre el conteo de contenedores del stack:** ninguna de las opciones A–D agregaba servicios a `docker-compose.yml`. El stack declarado sigue teniendo los mismos 14 `container_name` en todas ellas; los emisores son y siguen siendo contenedores auxiliares de prueba, creados fuera de Compose. Lo que la opción A sí preserva —y es el argumento que la sostiene— es el **procedimiento** documentado: quién crea los emisores y cuándo.

**Consecuencia — el modo de fallo se vuelve parte del contrato.** Si el operador no preparó los emisores, el inyector no funciona. Para que eso sea un fallo diagnosticable y no una frustración, el mensaje de `503` debe ser accionable: nombrar el emisor faltante y dar el comando literal para crearlo (ver Decisión 7).

### 7. El error de emisor faltante es accionable, y el catálogo reporta disponibilidad

**Decisión:** dos medidas para compensar el costo de la Decisión 2:

1. **Mensaje de error con el comando literal.** El `503` por emisor faltante incluye la línea exacta a ejecutar, construida a partir de la configuración real (nombre del emisor, red resuelta del stack):
   ```
   El contenedor emisor 'web-server' no está disponible. Creálo con:
   docker run -d --name web-server --hostname web-server --network <red> alpine sleep infinity
   docker exec web-server apk add --no-cache util-linux
   ```
2. **El endpoint de catálogo reporta el estado de cada emisor.** `GET /api/logs/inject/categorias` incluye por categoría si su emisor está disponible, de modo que el frontend puede deshabilitar la opción o mostrar un aviso **antes** de que el operador apriete "Inyectar", en lugar de fallar después.

**Por qué:** con la auto-provisión descartada, la preparación manual es un punto de fallo real —especialmente en una demostración en vivo, donde olvidar el paso previo se manifiesta como un botón que no anda. Estas dos medidas convierten ese fallo en algo que el operador ve venir y sabe resolver en un comando, sin costo arquitectónico ni cambio del procedimiento documentado.

### 3. El catálogo es una constante del módulo, con la estructura de los ejemplos verificados

**Decisión:** una constante `CATALOGO_CATEGORIAS: dict[str, CategoriaLog]` en `logs_injector_service.py`, donde cada entrada declara: `etiqueta` (texto legible en español para el desplegable), `host_origen`, y una lista de entradas de log con `tag`, `prioridad`, `mensaje` y `repeticiones`. `paquete_completo` no duplica datos: se resuelve como la concatenación de las demás categorías, calculada a partir del mismo diccionario.

**Fuentes cruzadas:** el **contenido de los mensajes** sale de `docs/SDD.md` §3.3 (que CHANGES.md marca como autoritativo para las categorías); la **estructura del comando** (`-n <host> -P <puerto> -d -t <tag> -p <prioridad> --rfc3164`) sale del archivo de ejemplos, que el usuario declaró obligatoria. Donde el archivo de ejemplos y el SDD difieren en la IP del mensaje, manda el SDD, porque es la IP que los patrones de detección y los tickets esperan.

Los `tag` y prioridades por categoría, derivados de los ejemplos:

| Categoría | tag | prioridad | repeticiones |
|---|---|---|---|
| `root_login` | `sshd` | `auth.warning` | 2 |
| `ssh_failed` | `sshd` | `auth.warning` | 12 |
| `access_denied` | `sshd` | `auth.err` | 7 |
| `port_scan` | `kernel` | `kern.warning` | 2 |
| `iptables_drop` | `kernel` | `kern.warning` | 6 |
| `sudo_usage` | `sudo` | `auth.notice` | 2 |
| `kernel_oops` | `kernel` | `kern.emerg` | 1 |
| `service_restart` | `systemd` | `daemon.info` | 2 |
| `log_legitimo` | `sshd` | `auth.info` | 1 |

`service_restart` y `log_legitimo` fueron confirmados por el usuario con ejemplo literal (`logger -n syslog-ng -P 514 -d -t systemd -p daemon.info --rfc3164 "Started OpenSSH Daemon (server)."` y `logger -n syslog-ng -P 514 -d -t sshd -p auth.info --rfc3164 "Accepted password for rafael from 192.168.1.10 port 22 ssh2"` respectivamente), coincidiendo exactamente con el `tag`/prioridad derivados por analogía. Las diez filas del catálogo quedan verificadas.

**Alternativa descartada:** catálogo en un YAML/JSON externo. Agrega un archivo de configuración, I/O y validación de esquema para un catálogo cerrado de 10 entradas que no cambia sin cambiar también el código de detección.

### 4. Una invocación de `logger` por log, secuencial

**Decisión:** por cada repetición se ejecuta un `exec_run` independiente, en orden, dentro de un único `asyncio.to_thread` que reutiliza el mismo cliente Docker. Los objetos contenedor se resuelven una sola vez al principio (uno por host de origen involucrado: `paquete_completo` toca los tres) y se cachean durante la ráfaga.

**Por qué secuencial y no en paralelo como CH04:** `paquete_completo` son 35 logs; la cadena de detección (correlación de Wazuh, `event_count` de los patrones de ataque) depende de que lleguen como una ráfaga ordenada, no como 35 conexiones simultáneas cuyo orden de llegada es indefinido. El costo es aceptable: `exec_run` sobre un contenedor ya corriendo es del orden de decenas de milisegundos.

**Consecuencia:** `paquete_completo` puede tardar varios segundos. Se define `TIMEOUT_INYECCION = 60.0` para la operación completa (`asyncio.wait_for`), separado del `TIMEOUT_DOCKER = 5.0` de CH04, que aplica al cliente.

**Un único `to_thread` para toda la ráfaga**, no uno por log: evita 35 saltos de contexto y 35 creaciones de cliente, y mantiene la ráfaga contigua.

### 5. Validación de categoría en dos capas

**Decisión:** el schema Pydantic tipa `categoria` como un `Literal` de las 10 claves (o un `StrEnum`), y el servicio vuelve a verificar la pertenencia al catálogo levantando `CategoriaInvalida`.

**Por qué duplicar:** Pydantic devuelve `422` con un mensaje en inglés generado por FastAPI; el contrato de CHANGES.md exige `400` con mensaje en español. Se registra un `exception_handler` para `RequestValidationError` acotado a este router, o —más simple y preferido— el schema tipa `categoria: str` y el servicio es el único validador, devolviendo `400` con la lista de categorías válidas. **Se opta por lo segundo**: una sola fuente de verdad para la validación, y control total sobre el código y el idioma del error. El tipado fuerte se conserva del lado del *response* y del catálogo, sin `any` en ningún punto del contrato.

### 6. Endpoint auxiliar de catálogo

`GET /api/logs/inject/categorias` existe para que el desplegable del frontend no duplique el catálogo. No estaba en el contrato mínimo de CHANGES.md, pero AGENTS.md autoriza agregar endpoints cuando son necesarios, y sin él el frontend tendría que hardcodear diez etiquetas que ya viven en el backend — violando la regla de fuente única.

## Risks / Trade-offs

- **[R1] El inyector depende de una preparación manual previa.** Es el costo aceptado de la Decisión 2: si el operador no creó los emisores, el botón "Inyectar" no funciona. El escenario más caro es una demostración en vivo. → **Mitigación:** las dos medidas de la Decisión 7 — mensaje de `503` con el comando literal para crear el emisor faltante, y estado de disponibilidad expuesto en el endpoint de catálogo para que el frontend avise antes de intentar. Además, tarea 1.4: documentar el procedimiento de preparación en el README del proyecto, alineado con lo escrito en la tesis.
- **[R1b] Los emisores creados con `alpine` requieren `apk add util-linux` y salida a internet.** `alpine` no trae `logger` de util-linux; el applet de BusyBox no soporta `--rfc3164`. Si la máquina está sin red al momento de preparar los emisores, el `apk add` falla y los logs no se emiten en el formato correcto. → **Mitigación:** el mensaje de error del sistema distingue "el contenedor no existe" de "el contenedor existe pero no puede emitir" (R6). El procedimiento documentado incluye el `apk add` como paso explícito, no como detalle opcional.
- **[R2] Efectos reales sobre el stack.** Una inyección de `ssh_failed` (12 logs) puede disparar Fail2ban y bloquear la IP del mensaje, crear tickets y encender alertas de Prometheus. Es el comportamiento buscado, pero es escritura real sobre el sistema. → **Mitigación:** las IPs de los mensajes son fijas y públicas de ejemplo, nunca la IP del operador; el desbloqueo manual ya existe (`POST /api/ips/{ip}/unblock`, CH09).
- **[R3] `paquete_completo` puede saturar la cadena.** 35 logs seguidos generan trabajo real en Wazuh, n8n y PostgreSQL. → **Mitigación:** timeout explícito de 60 s y respuesta que reporta la cantidad emitida; no se agrega throttling porque la ráfaga concentrada es justamente lo que hace realista al escenario de ataque.
- **[R4] Resuelto.** `service_restart` y `log_legitimo` fueron confirmados por el usuario con ejemplo literal (ver Decisión 3); coinciden con lo derivado por analogía. Ya no hay filas del catálogo sin verificar.
- **[R5] Docker Desktop caído en Windows.** Mismo modo de fallo que CH04. → **Mitigación:** se reutiliza la traducción de errores de `docker_service.py`; el endpoint responde `503` con mensaje en español, no `500`.
- **[R6] Emisor existente pero sin `logger`.** El operador levantó `web-server` con `alpine` pero olvidó el `apk add util-linux`. El contenedor existe y corre, así que la verificación de existencia pasa, pero el `exec_run` falla con `logger: not found`. → **Mitigación:** el sistema trata este caso como un error distinto del "no existe": el `503` dice explícitamente que falta `util-linux` y da el comando `docker exec <emisor> apk add --no-cache util-linux`. El endpoint de catálogo lo refleja como emisor no disponible. En ningún caso el sistema modifica ni destruye un contenedor creado por el operador.
- **[R7] Emisor fuera de la red del stack.** Si el operador crea el emisor sin `--network`, queda en la red `bridge` por defecto y no resuelve el nombre `syslog-ng`; el `logger` se ejecuta sin error visible pero el log nunca llega. Es un fallo silencioso, el peor tipo. → **Mitigación:** la verificación previa incluye que el emisor comparta al menos una red con `SYSLOG_HOST`; si no, `503` con el comando `docker network connect <red> <emisor>`.
- **[Trade-off] Duplicación parcial de helpers de Docker.** `_crear_cliente()` y `_traducir_error()` viven en `docker_service.py`. Importarlos desde el nuevo servicio acopla un servicio a otro; duplicarlos duplica código. → **Se importan** desde `backend.services.docker_service`: son utilidades genéricas de acceso a Docker, no lógica de contenedores, y una tercera capa (`docker_client.py`) sería sobre-ingeniería para dos consumidores. Si aparece un tercer consumidor, se extraen.

## Migration Plan

No hay migración: el endpoint existe como stub y ningún cliente lo consume. El despliegue es reiniciar el backend. Rollback = revertir el commit; el stub vuelve a responder "Endpoint no implementado".

Las dos variables de entorno nuevas tienen valor por defecto funcional, de modo que un `.env` existente sigue arrancando sin cambios.

**Precondición operativa:** el inyector requiere que los emisores estén creados. El procedimiento queda documentado en el README (tarea 1.4) y es el mismo que el operador ya ejecuta hoy.

## Open Questions

- ¿Debería el endpoint devolver también la salida (`exit_code`, stderr) de cada `logger` para diagnóstico, o alcanza con el mensaje agregado? Se puede resolver después sin cambiar specs ni tareas: sería un campo opcional adicional en la respuesta.
