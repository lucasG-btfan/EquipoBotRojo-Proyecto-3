# Proposal: api-logs-injector (CH07)

## Why

La sección **Logs y detección** del panel necesita un inyector de logs de prueba: un selector de categorías y un botón que genere tráfico sintético realista contra el stack SIEM, para poder demostrar y verificar la cadena completa de detección (syslog-ng → Wazuh → n8n → PostgreSQL → Fail2ban → Prometheus) sin depender de un ataque real. Hoy `POST /api/logs/inject` existe como stub creado en CH00 y devuelve `{"mensaje": "Endpoint no implementado"}`, de modo que la única forma de disparar la cadena es ejecutar comandos `docker exec ... logger ...` a mano desde una terminal.

## What Changes

- **`backend/services/logs_injector_service.py`** (nuevo) — servicio que ejecuta los comandos `logger` dentro de un contenedor del stack vía el SDK oficial `docker` (docker-py), reutilizando el patrón ya establecido en CH04 (`asyncio.to_thread` sobre el SDK síncrono).
  - Catálogo de categorías como constante del módulo: por cada categoría, la lista de logs a emitir con su `tag`, prioridad syslog, mensaje y cantidad de repeticiones, más el contenedor emisor (`web-server`, `firewall` o `db-server`).
  - `verificar_emisores(hosts)` — comprueba que los contenedores emisores que la categoría necesita existan, estén corriendo y compartan red con `syslog-ng`. El backend **no los crea**: son una precondición que el operador prepara a mano, según el procedimiento documentado en la tesis del proyecto.
  - `inyectar_categoria(categoria)` — resuelve el catálogo, verifica los emisores, ejecuta los `logger` correspondientes y devuelve la cantidad de logs efectivamente inyectados.
  - Excepción propia `ErrorInyeccionLogs` para que el router distinga "categoría inválida" (400) de "Docker/contenedor no disponible" (503).
- **`backend/routers/logs.py`** — `POST /api/logs/inject` deja de ser stub:
  - Recibe body `{ "categoria": "root_login" }` validado por un schema Pydantic.
  - Responde `{ "mensaje": "X logs inyectados para categoría Y" }`.
  - `400` si la categoría no existe (mensaje en español, listando las categorías válidas).
  - `503` si el demonio Docker o el contenedor emisor no están disponibles.
  - Sigue protegido con `Depends(usuario_actual)` desde CH02.
  - Se agrega `GET /api/logs/inject/categorias` para que el desplegable del frontend no tenga que hardcodear el catálogo (etiqueta legible, cantidad de logs y **disponibilidad del emisor** por categoría, para poder avisar antes de intentar).
- **`backend/schemas/logs.py`** (nuevo) — `InyeccionLogsRequest`, `InyeccionLogsResponse`, `CategoriaLogSchema`. Sin `any` en el contrato: la categoría se tipa como `Literal`/enum de las 10 categorías válidas.
- **`backend/config.py`** — nuevas variables de entorno `SYSLOG_HOST` / `SYSLOG_PORT` (destino del `logger`, por defecto `syslog-ng` / `514`). Ningún nombre de host ni puerto queda hardcodeado en el servicio.
- **`README.md`** — se documenta el procedimiento de preparación de los emisores, que es precondición del inyector.

Sin cambios de contrato rompientes: el endpoint ya existía como stub y ningún consumidor del frontend está implementado todavía.

## Capabilities

### New Capabilities

- `inyeccion-logs`: generación controlada de logs sintéticos de prueba dentro del stack SIEM, por categoría predefinida, expuesta por el backend al dashboard.

### Modified Capabilities

Ninguna.

## Impact

- **Código afectado:** `backend/services/logs_injector_service.py` (nuevo), `backend/schemas/logs.py` (nuevo), `backend/routers/logs.py`, `backend/config.py`.
- **APIs:** `POST /api/logs/inject` (implementación real), `GET /api/logs/inject/categorias` (nuevo, auxiliar del frontend). Ambas protegidas con JWT.
- **Dependencias:** ninguna nueva. Se reutiliza `docker==7.*`, ya aprobado e instalado en CH04.
- **Variables de entorno:** se agregan `SYSLOG_HOST` y `SYSLOG_PORT`, ambas con valor por defecto funcional. Se reutiliza `DOCKER_HOST`, ya declarada.
- **Sistemas externos:** el backend ejecuta procesos dentro de los contenedores emisores y emite tráfico syslog real que dispara la cadena de detección (Wazuh, n8n, Fail2ban, tickets en PostgreSQL). **No crea, modifica ni elimina ningún contenedor**: los emisores los prepara el operador. No modifica `docker-compose.yml`, ni la configuración de ningún contenedor del stack, ni workflows de n8n. El stack declarado sigue siendo de 14 contenedores.
- **Precondición operativa:** el inyector requiere que `web-server`, `firewall` y `db-server` estén creados a mano, en la red del stack y con `util-linux` instalado. Si faltan, el endpoint responde `503` con el comando exacto para crearlos.
- **Riesgo acotado:** el comando ejecutado nunca se construye a partir de texto libre del usuario. El cliente solo elige una clave de un catálogo cerrado; los argumentos de `logger` salen de constantes del servidor y se pasan como lista de argumentos (nunca `shell=True` ni interpolación de strings en un shell).
- **Gobernanza:** LOW — catálogo cerrado, sin efectos sobre datos de usuario ni sobre el modelo de seguridad del panel. Implementación autónoma, con las decisiones no obvias documentadas en `design.md`.

## No-alcance

- Frontend: el selector desplegable y el botón "Inyectar" de la sección **Logs y detección** son un change aparte.
- Inyección de logs arbitrarios o definidos por el usuario — el catálogo es cerrado y vive en el servidor.
- Lectura del `alerts.log` resultante (`GET /api/alerts/log`), ya implementada en CH06.
- Disparo de workflows de n8n tras la inyección — es CH08; la cadena se dispara sola por el flujo normal del stack.
- Verificación automática de que el log llegó a Wazuh/PostgreSQL — el endpoint confirma la emisión, no la detección.
- Tests automatizados (regla del proyecto: no se crean salvo pedido explícito).
