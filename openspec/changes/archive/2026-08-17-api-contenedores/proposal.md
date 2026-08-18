# Proposal: api-contenedores (CH04)

## Why

La sección **Dashboard** del panel necesita mostrar qué contenedores del stack SIEM están arriba y cuánto CPU/RAM consume cada uno. Hoy `GET /api/status/containers` y `GET /api/status/resources` existen como stubs creados en CH00 y devuelven `{"mensaje": "Endpoint no implementado"}`, y `services/docker_service.py` retorna listas vacías. Sin estos endpoints el operador no tiene ninguna visibilidad del estado de salud de la infraestructura que el SIEM monitorea.

## What Changes

- **`backend/services/docker_service.py`** — implementación real de la integración con el Docker Engine API:
  - Resolución del transporte a partir de `DOCKER_HOST` (socket Unix o TCP), sin hardcodear rutas ni IPs.
  - `obtener_estado_contenedores()` — lista contenedores y su estado.
  - `obtener_recursos_contenedores()` — consulta stats de cada contenedor en paralelo y calcula CPU % y RAM en MB.
  - Excepción propia `ErrorDocker` para que el router pueda distinguir "Docker caído" de un error genérico.
- **`backend/routers/contenedores.py`** — los dos endpoints dejan de ser stub, se tipan con `response_model` y devuelven datos reales.
  - `GET /api/status/containers` → `503` con mensaje descriptivo en español si el demonio Docker no responde.
  - `GET /api/status/resources` → tolerante a fallos: devuelve datos parciales (los contenedores que sí respondieron) con timeout corto de 5 s.
- **`backend/schemas/contenedor.py`** — ajuste de `RecursoSchema` para exponer RAM en megabytes (`ram_mb`) además del porcentaje, según el contrato del roadmap.
- **Filtrado por lista de contenedores relevantes del stack**, definida como constante del servicio (no hardcodeada dentro de los endpoints).

Sin cambios de contrato rompientes: ambos endpoints ya existían y ningún consumidor del frontend está implementado todavía.

## Capabilities

### New Capabilities

- `estado-contenedores`: estado up/down y consumo de recursos (CPU/RAM) de los contenedores del stack SIEM, expuesto por el backend al dashboard.

### Modified Capabilities

Ninguna.

## Impact

- **Código afectado:** `backend/services/docker_service.py`, `backend/routers/contenedores.py`, `backend/schemas/contenedor.py`.
- **APIs:** `GET /api/status/containers`, `GET /api/status/resources` (ambas ya protegidas con `Depends(usuario_actual)` desde CH02).
- **Dependencias: se agrega `docker==7.*` (SDK oficial), aprobado explícitamente por el usuario.** El stack corre en Docker Desktop sobre Windows, que expone un *named pipe* y no un socket Unix — y `httpx` no habla named pipes. Se evaluó como alternativa habilitar el endpoint TCP de Docker Desktop para seguir con `httpx` sin dependencias nuevas, pero se descartó porque deja el demonio Docker sin autenticación en localhost. Ver `design.md` §1.
- **Variables de entorno:** se reutiliza `DOCKER_HOST`, ya declarada en `config.py`. No se agregan variables nuevas, pero **hay que corregir su valor por defecto**: el actual (`unix:///var/run/docker.sock`) no existe en Windows; corresponde `npipe:////./pipe/dockerDesktopLinuxEngine`.
- **Sistemas externos:** solo lectura contra el Docker Engine API. No se modifica `docker-compose.yml` ni ningún contenedor.
- **Gobernanza:** MEDIUM — adaptador de dominio, sin efectos sobre datos de usuario ni seguridad. Implementación por pasos, con las decisiones no obvias marcadas en `design.md`.

## No-alcance

- Frontend: la sección Dashboard que consume estos endpoints es un change aparte.
- Acciones de escritura sobre Docker (start/stop/restart de contenedores).
- Streaming de stats o WebSockets — el "tiempo real" es polling cada 10 s desde el frontend.
- Métricas de host (CPU/RAM de la máquina), que llegan por Prometheus en CH05.
- Tests automatizados (regla del proyecto: no se crean salvo pedido explícito).
