# Proposal: api-fail2ban (CH11)

## Why

La sección **Fail2ban** del panel necesita mostrar el estado de la jail `n8n-soar-jail` y el detalle de las IPs baneadas en este momento. Hoy `GET /api/fail2ban/jail` es un stub creado en CH00 que devuelve `{"mensaje": "Endpoint no implementado"}` y `services/fail2ban_service.py` retorna un diccionario vacío. Prometheus ya expone el *contador* de IPs baneadas (`fail2ban_banned_ips`, CH05), pero no la lista de IPs: el único origen de ese detalle es el propio `fail2ban-client` dentro del contenedor `fail2ban`.

## What Changes

- **`backend/services/fail2ban_service.py`** — implementación real de la consulta a Fail2ban:
  - `obtener_estado_jail()` ejecuta `fail2ban-client status <jail>` **dentro del contenedor `fail2ban`** usando el SDK `docker` ya presente en el proyecto (`exec_run`), no un `subprocess` contra el CLI de Docker.
  - Parser propio de la salida de texto de `fail2ban-client status`: nombre de la jail, cantidad de IPs actualmente baneadas y lista de IPs.
  - Excepción propia `ErrorFail2ban` para que el router pueda distinguir "Fail2ban no responde" de un error genérico.
- **`backend/routers/fail2ban.py`** — `GET /api/fail2ban/jail` deja de ser stub, se tipa con `response_model` y devuelve datos reales.
  - `503` con mensaje descriptivo en español si el contenedor `fail2ban` no existe, está caído, el demonio Docker no responde, o `fail2ban-client` retorna un código de salida distinto de 0.
- **`backend/schemas/fail2ban.py`** — `JailSchema` se ajusta al contrato del roadmap: `{ "jail": str, "baneadas": int, "ips": list[str] }`. El `IPBaneadaSchema` actual (con `baneada_desde` / `baneada_hasta`) no se usa en este change porque `fail2ban-client status` no expone esas marcas de tiempo.
- **`backend/config.py`** — se agregan `FAIL2BAN_CONTAINER` (por defecto `fail2ban`) y `FAIL2BAN_JAIL` (por defecto `n8n-soar-jail`) para no dejar el nombre del contenedor ni el de la jail embebidos en el código.

Sin cambios de contrato rompientes: el endpoint ya existía como stub y ningún consumidor del frontend está implementado todavía (la vista es CH18).

## Capabilities

### New Capabilities

- `estado-fail2ban`: estado de la jail de Fail2ban (nombre, cantidad de IPs baneadas y detalle de esas IPs) expuesto por el backend al dashboard.

### Modified Capabilities

Ninguna.

## Impact

- **Código afectado:** `backend/services/fail2ban_service.py`, `backend/routers/fail2ban.py`, `backend/schemas/fail2ban.py`, `backend/config.py`.
- **APIs:** `GET /api/fail2ban/jail` (ya protegida con `Depends(usuario_actual)` desde CH02).
- **Dependencias:** ninguna nueva. Se reutiliza el SDK `docker` incorporado en CH04.
- **Variables de entorno:** dos nuevas y opcionales, con valores por defecto funcionales para el stack actual (`FAIL2BAN_CONTAINER=fail2ban`, `FAIL2BAN_JAIL=n8n-soar-jail`). Se reutiliza `DOCKER_HOST`.
- **Sistemas externos:** solo lectura contra el contenedor `fail2ban` vía Docker Engine API. No se modifica `docker-compose.yml`, la configuración de Fail2ban ni ningún workflow de n8n.
- **Gobernanza:** MEDIUM — adaptador de dominio de solo lectura, sin efectos sobre datos de usuario ni seguridad. Implementación por pasos, con las decisiones no obvias marcadas en `design.md`.

## No-alcance

- Frontend: la vista Fail2ban que consume este endpoint es CH18.
- Acciones de escritura sobre Fail2ban (banear/desbanear manualmente). El desbloqueo manual de IPs vive en `POST /api/ips/{ip}/unblock` (CH06).
- Estado de múltiples jails: este change reporta una sola jail, la configurada.
- Marcas de tiempo de baneo por IP: `fail2ban-client status` no las expone.
- Reemplazar la métrica `fail2ban_up` / `fail2ban_banned_ips` de Prometheus (CH05), que sigue siendo la fuente del contador en el Dashboard general.
- Tests automatizados (regla del proyecto: no se crean salvo pedido explícito).
