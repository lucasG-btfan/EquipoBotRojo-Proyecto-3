# AGENTS.md

## Descripción del proyecto

Panel de control web (SIEM Dashboard) para el proyecto EquipoBotRojo-Proyecto-3, una arquitectura SIEM/SOAR basada en herramientas de código abierto. El frontend permite visualizar y operar el sistema de detección de intrusiones en tiempo real.

## Stack tecnológico

- **Frontend:** React + TypeScript + Tailwind CSS
- **Backend:** FastAPI (Python)
- **Base de datos:** PostgreSQL (ya existente en el stack Docker)
- **APIs externas consumidas:** n8n (REST), Prometheus (REST — incluye las métricas de fail2ban-exporter, consultadas vía Prometheus y no directamente contra el exporter)

## Versiones y gestores de paquetes

- **Node:** 20.x (ver `.nvmrc` en `frontend/`)
- **Gestor de paquetes frontend:** npm
- **Python:** 3.11+
- **Gestor de paquetes backend:** `venv` + `pip`, dependencias fijadas en `requirements.txt`

## Estructura de carpetas esperada

```
EquipoBotRojo-Proyecto-3/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── types/
│   │   └── hooks/
│   ├── public/
│   ├── .nvmrc
│   └── package.json
├── backend/
│   ├── routers/
│   ├── services/
│   ├── models/
│   ├── main.py
│   └── requirements.txt
└── docs/
```

## Convenciones de código

- Todo el código, comentarios, nombres de variables, mensajes de error y documentación en **español**.
- **Backend (Python):** archivos y carpetas en `snake_case`.
- **Frontend (React/TypeScript):**
  - Nombre de archivo de componente **igual al nombre del componente**, en `PascalCase` (ej. `TablaAlertas.tsx` exporta `TablaAlertas`). No usar kebab-case para archivos de componentes.
  - Archivos que no son componentes (hooks, servicios, utilidades) en `camelCase` (ej. `useAlertas.ts`, `apiClient.ts`).
  - Carpetas en `kebab-case`.
- Funciones y variables en `camelCase`.
- Constantes en `SCREAMING_SNAKE_CASE`.
- Sin comentarios obvios — solo comentar lógica no evidente.

## Reglas para el agente

- Nunca modificar archivos fuera de `frontend/` y `backend/`.
- Nunca tocar `docker-compose.yml`, archivos de configuración de contenedores, workflows de n8n, ni ningún archivo del stack existente.
- Nunca hardcodear IPs ni credenciales — usar variables de entorno.
- Siempre tipar correctamente en TypeScript — prohibido usar `any`.
- Cada endpoint del backend debe tener manejo de errores explícito (try/except con respuesta HTTP y mensaje de error en español, nunca dejar pasar una excepción sin capturar).
- El frontend consume el backend, no las APIs del stack directamente.
- Usar `axios` para llamadas HTTP en el frontend.
- Usar `httpx` para llamadas HTTP en el backend.
- Antes de instalar cualquier dependencia no listada en este documento, preguntar primero.
- Usar el archivo ./bd/schema.sql (o schema-extended...) como referencia obligatoria de la estructura de tablas y tipos de datos para crear los modelos en FastAPI.

## Autenticación

El dashboard requiere login básico antes de mostrar cualquier sección. No es necesario un sistema de usuarios completo: alcanza con un único usuario/contraseña fijo definido por variable de entorno (`DASHBOARD_USER`, `DASHBOARD_PASSWORD`) y un JWT de sesión emitido por el backend. Todas las rutas del backend excepto `/api/auth/login` deben requerir el token.

## CORS

El backend debe permitir explícitamente el origen `http://localhost:5173` (y el que corresponda en el entorno de despliegue, vía variable de entorno `FRONTEND_ORIGIN`). No usar `allow_origins=["*"]`.

## Tiempo real: mecanismo

"Tiempo real" en este proyecto significa **polling por intervalo**, no WebSockets ni Server-Sent Events:

- Visor de `alerts.log`: polling cada 3 segundos.
- Métricas de Prometheus / estado de contenedores: polling cada 10 segundos.
- Estado de la jail de Fail2ban: polling cada 10 segundos.

Estos intervalos deben ser configurables en el frontend vía constantes, no hardcodeados dentro de cada componente.

## Variables de entorno

### Backend (`.env`)

```
DATABASE_URL=postgresql://db_user:db_pass@192.168.100.160:5432/security_monitoring
N8N_URL=http://192.168.100.160:5678
N8N_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyNDcwNGYxYy1hYzU4LTRlNDctYjg3Ni03NGYzOTI1NDA1M2QiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzg2OTEzMDM5fQ.oz1Fr7ey6eiDEzaRuksrKDbxoNSAR6RbrJRFYzPLHI0
PROMETHEUS_URL=http://192.168.100.160:9090
DOCKER_HOST=unix:///var/run/docker.sock
DASHBOARD_USER=admin
DASHBOARD_PASSWORD=<completar>
JWT_SECRET=<completar>
FRONTEND_ORIGIN=http://localhost:5173
SYSLOG_HOST=syslog-ng
SYSLOG_PORT=514
FAIL2BAN_CONTAINER=fail2ban
FAIL2BAN_JAIL=n8n-soar-jail
WAZUH_INDEXER_URL=https://localhost:9201
WAZUH_INDEXER_USER=admin
WAZUH_INDEXER_PASSWORD=<completar>
WAZUH_ALERTS_INDEX=wazuh-alerts-*
WAZUH_VERIFY_TLS=False
```

> `SYSLOG_HOST` / `SYSLOG_PORT` (CH07): destino del `logger` que usa el inyector de logs de prueba. Valores por defecto funcionales para el stack actual — no requieren configuración adicional salvo que se renombre el colector syslog.

> `FAIL2BAN_CONTAINER` / `FAIL2BAN_JAIL` (CH11): contenedor y jail que consulta `GET /api/fail2ban/jail` vía `fail2ban-client status` dentro del contenedor. Valores por defecto funcionales para el stack actual (`fail2ban` / `n8n-soar-jail`) — no requieren configuración adicional salvo que se renombre el contenedor o la jail.

> `WAZUH_INDEXER_URL` / `WAZUH_INDEXER_USER` / `WAZUH_INDEXER_PASSWORD` / `WAZUH_ALERTS_INDEX` / `WAZUH_VERIFY_TLS` (CH12): conexión al **indexador** de Wazuh (OpenSearch, puerto publicado `9201`) que consulta `GET /api/wazuh/alerts/count` vía `_count` sobre el índice `WAZUH_ALERTS_INDEX`. No confundir con `WAZUH_URL` / `WAZUH_USER` / `WAZUH_PASSWORD`, que apuntan a la API del *manager* (`55000`) y no se usan para este endpoint — ver `openspec/changes/api-wazuh/design.md` §1.


> `fail2ban-exporter` no se consume directamente: expone métricas en formato texto plano de Prometheus, no JSON. Todas las métricas relacionadas con Fail2ban (`fail2ban_banned_ips`, `fail2ban_up`, etc.) se obtienen consultando la API de Prometheus (`PROMETHEUS_URL/api/v1/query`), que ya las tiene scrapeadas.

### Frontend (`.env`)

```
VITE_API_URL=http://localhost:8000
```

`.env` de ambas carpetas deben estar en `.gitignore` — no versionar la IP real del stack ni credenciales.

## Paginación

Todas las tablas paginadas (`attack_patterns`, tickets) usan paginación **offset/limit**:

- Query params: `?limit=20&offset=0`.
- Respuesta: `{ "items": [...], "total": N, "limit": 20, "offset": 0 }`.
- Tickets se ordenan por fecha de creación descendente (más recientes primero) por defecto.
- Las tablas grandes (`attack_patterns` en particular) no deben cargar más de 20-50 filas por request.

## Endpoints del backend (mínimo esperado)

Este es el contrato mínimo que el frontend espera del backend. El agente puede agregar endpoints adicionales si son necesarios, pero estos deben existir con esta forma:

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/login` | Login, devuelve JWT |
| GET | `/api/status/containers` | Estado up/down de cada contenedor Docker |
| GET | `/api/status/resources` | Consumo de CPU/RAM por contenedor (vía Docker API) |
| GET | `/api/metrics/tpw` | Últimas mediciones de TPW y promedio |
| GET | `/api/alerts/log` | Últimas líneas de `alerts.log` |
| GET | `/api/alerts/recent` | Últimas alertas desde PostgreSQL |
| POST | `/api/logs/inject` | Ejecuta un comando `logger` de prueba predefinido |
| POST | `/api/workflows/main/run` | Dispara el workflow principal de n8n |
| GET | `/api/workflows/runs` | Historial de últimas ejecuciones de n8n |
| GET | `/api/ips/blocked` | Tabla `blocked_ips`, con filtro por estado activo/inactivo |
| POST | `/api/ips/{ip}/unblock` | Fuerza el desbloqueo de una IP |
| GET | `/api/ips/attack-patterns` | Tabla `attack_patterns`, paginada, con filtro por IP/categoría |
| GET | `/api/metrics/system` | Tabla `system_metrics` |
| GET | `/api/tickets` | Lista paginada de tickets, filtro por estado |
| GET | `/api/fail2ban/jail` | Estado de la jail, IPs baneadas actuales |
| GET | `/api/prometheus/alerts` | Estado de las 3 alertas (firing/inactive) |
| GET | `/api/wazuh/alerts/count` | Cantidad de alertas nativas de Wazuh (FIM, etc.) |

## Secciones del dashboard

1. **Inicio** — presentación comercial y profesional del sistema: qué es, qué componentes integra, estado general de salud (resumen, no detalle).
2. **Dashboard** — estado de contenedores (up/down) y consumo de CPU/RAM, métricas de Prometheus (IPs baneadas, `fail2ban_up`), últimas alertas de PostgreSQL, métricas de desempeño (último TPW, promedio, histórico de las últimas N ejecuciones).
3. **Logs y detección** — visor de `alerts.log` en tiempo real, botón para ejecutar el workflow principal y el de métricas de Prometheus, inyector de logs de prueba, historial de ejecuciones de n8n (éxito/error).
4. **Gestión de IPs** — tabla `blocked_ips` con estado activo/inactivo y botón de desbloqueo manual por IP, tabla `system_metrics`, tabla `attack_patterns` con paginación y filtro por IP/categoría.
5. **Tickets** — lista paginada (más recientes primero) con fecha y estado, filtro por estado.
6. **Fail2ban** — estado de la jail, cantidad de IPs baneadas y su detalle.
7. **Prometheus** — estado de las 3 alertas (`IpBaneadaDetectada`, `Fail2banCaido`, `AtaqueMasivo`).
8. **Wazuh** — contador de alertas nativas (ej. FIM), diferenciadas de las alertas que llegan vía n8n.

## Lo que NO debe hacer el agente

- No crear tests automatizados salvo que se pidan explícitamente.
- No hacer git push ni git merge en github, salvo pedido explicito del usuario.
- No instalar dependencias no mencionadas sin consultar primero.
- No cambiar el puerto del backend (usar 8000).
- No cambiar el puerto del frontend (usar 5173).
- No asumir que el stack Docker está en localhost — usar las variables de entorno.
- No implementar WebSockets ni SSE para el "tiempo real" — usar polling según lo especificado arriba.
- No consultar `fail2ban-exporter` directamente — pasar siempre por la API de Prometheus.
