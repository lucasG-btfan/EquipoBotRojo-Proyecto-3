# CHANGES.md — Roadmap Operativo del SIEM Dashboard

> Generado desde `AGENTS.md`, `docs/SDD.md`, `bd/schema.sql`, `bd/schema-extended.sql` y `openspec/config.yaml`.
> Fecha: 2026-08-17

---

## Resumen Ejecutivo

El proyecto consiste en un **panel de control web (SIEM Dashboard)** completo, construido desde cero sobre React+TypeScript+Tailwind (frontend) y FastAPI (backend), consumiendo PostgreSQL, n8n, Prometheus y Wazuh del stack Docker existente.

**Estado actual:** Solo existen los archivos `.env` en `frontend/` y `backend/`. No hay scaffolding, ni código, ni endpoints. El esquema de BD está completo y no se modifica.

**Alcance total:** 21 changes, organizados en 5 fases, con dependencias claras.

---

## Árbol de Dependencias

```
CH00 [cimiento-backend]
  └─→ CH01 [cimiento-frontend]
        ├─→ CH02 [auth-backend]
        │     └─→ CH03 [auth-frontend]
        ├─→ CH04 [api-contenedores]
        ├─→ CH05 [api-prometheus]
        ├─→ CH06 [api-alertas]
        ├─→ CH07 [api-logs-injector]
        ├─→ CH08 [api-workflows]
        ├─→ CH09 [api-ips]
        ├─→ CH10 [api-tickets]
        ├─→ CH11 [api-fail2ban]
        ├─→ CH12 [api-wazuh]
        └─→ CH13 [ui-inicio]
              └─→ CH14 [ui-dashboard]
                    └─→ CH15 [ui-logs-deteccion]
                          └─→ CH16 [ui-gestion-ips]
                                └─→ CH17 [ui-tickets]
                                      └─→ CH18 [ui-fail2ban]
                                            └─→ CH19 [ui-prometheus]
                                                  └─→ CH20 [ui-wazuh]
```

> **Nota:** Los cambios de backend API (CH04–CH12) son independientes entre sí y pueden ejecutarse en paralelo una vez completado CH00. Los cambios de frontend (CH13–CH20) son secuenciales porque cada página se integra al layout existente.

---

## Fase 0 — Cimiento

### CH00: `cimiento-backend`

| Campo | Valor |
|---|---|
| **Objetivo** | Crear el proyecto FastAPI desde cero: estructura de carpetas, conexión a PostgreSQL, configuración CORS, manejo de variables de entorno, middlewares base y pydantic models del esquema de BD |
| **Gobernanza** | MEDIUM |
| **Depende de** | Ninguno |
| **Artefactos** | proposal, design, tasks |

**Alcance detallado:**

1. **Estructura de carpetas:**
   ```
   backend/
   ├── main.py              ← FastAPI app, CORS, lifespan
   ├── config.py            ← Settings desde .env (pydantic-settings)
   ├── database.py          ← Motor async SQLAlchemy + session
   ├── auth.py              ← utilidades JWT (generar, verificar, middleware)
   ├── dependencies.py      ← Dependency injection (get_db, get_current_user)
   ├── routers/
   │   ├── __init__.py
   │   ├── auth.py          ← POST /api/auth/login
   │   ├── contenedores.py  ← GET /api/status/containers, /api/status/resources
   │   ├── prometheus.py    ← GET /api/prometheus/alerts
   │   ├── alertas.py       ← GET /api/alerts/recent, /api/alerts/log
   │   ├── logs.py          ← POST /api/logs/inject
   │   ├── workflows.py     ← POST /api/workflows/main/run, GET /api/workflows/runs, GET /api/metrics/tpw
   │   ├── ips.py           ← GET /api/ips/blocked, POST /api/ips/{ip}/unblock, GET /api/ips/attack-patterns
   │   ├── tickets.py       ← GET /api/tickets
   │   ├── fail2ban.py      ← GET /api/fail2ban/jail
   │   ├── wazuh.py         ← GET /api/wazuh/alerts/count
   │   └── metrics.py       ← GET /api/metrics/system
   ├── services/
   │   ├── __init__.py
   │   ├── docker_service.py
   │   ├── prometheus_service.py
   │   ├── n8n_service.py
   │   ├── fail2ban_service.py
   │   └── wazuh_service.py
   ├── models/
   │   ├── __init__.py
   │   ├── alert.py
   │   ├── attack_pattern.py
   │   ├── system_metric.py
   │   ├── blocked_ip.py
   │   └── ticket.py
   ├── schemas/
   │   ├── __init__.py
   │   └── (schemas Pydantic de request/response)
   └── requirements.txt
   ```

2. **Configuración (`config.py`):**
   - Variables desde `.env`: `DATABASE_URL`, `N8N_URL`, `N8N_API_KEY`, `PROMETHEUS_URL`, `DOCKER_HOST`, `DASHBOARD_USER`, `DASHBOARD_PASSWORD`, `JWT_SECRET`, `FRONTEND_ORIGIN`, `WAZUH_URL`, `WAZUH_USER`, `WAZUH_PASSWORD`
   - pydantic-settings `BaseSettings`

3. **CORS (`main.py`):**
   - `allow_origins=[FRONTEND_ORIGIN]` (NUNCA `*`)
   - Métodos: GET, POST
   - Headers: Authorization, Content-Type

4. **Base de datos (`database.py`):**
   - SQLAlchemy async engine con `DATABASE_URL`
   - Session factory
   - Dependency `get_db`

5. **Modelos SQLAlchemy (`models/`):**
   - Un modelo por tabla del esquema: `Alert`, `AttackPattern`, `SystemMetric`, `BlockedIP`, `SecurityTicket`
   - Mapeo exacto a las columnas de `bd/schema.sql` y `bd/schema-extended.sql`
   - Tipos correctos: `INET` → String, `JSONB` → JSON, `TIMESTAMP` → DateTime, `SERIAL` → Integer autoincrement

6. **Schemas Pydantic (`schemas/`):**
   - Response schemas para cada modelo (campos exactos del SDD.md)
   - Request schemas donde aplique (login body, inyector body, paginación)

7. **Requerimientos (`requirements.txt`):**
   ```
   fastapi==0.115.*
   uvicorn[standard]==0.34.*
   sqlalchemy[asyncio]==2.0.*
   asyncpg==0.30.*
   pydantic-settings==2.7.*
   python-jose[cryptography]==3.3.*
   httpx==0.28.*
   python-dotenv==1.0.*
   ```

8. **Endpoint stub:** Solo el endpoint de login (CH02) se implementa completamente aquí; el resto se crean como stubs con `pass` para que la app arranque sin errores.

---

### CH01: `cimiento-frontend`

| Campo | Valor |
|---|---|
| **Objetivo** | Crear el proyecto React+TypeScript+Tailwind desde cero con Vite, configurar routing, layout base (sidebar), cliente HTTP (axios), constants de polling y estructura de carpetas |
| **Gobernanza** | MEDIUM |
| **Depende de** | CH00 |
| **Artefactos** | proposal, design, tasks |

**Alcance detallado:**

1. **Scaffolding:**
   ```bash
   npm create vite@latest frontend -- --template react-ts
   ```
   - Configurar Tailwind CSS
   - Configurar `tsconfig.json` estricto (no `any`)
   - Verificar `.nvmrc` → Node 20.x

2. **Estructura de carpetas:**
   ```
   frontend/
   ├── src/
   │   ├── main.tsx
   │   ├── App.tsx                    ← Router principal
   │   ├── constants/
   │   │   └── polling.ts             ← INTERVALOS_POLLING = { alertasLog: 3000, metricas: 10000, fail2ban: 10000, dashboard: 30000, prometheus: 30000 }
   │   ├── contexts/
   │   │   └── AuthContext.tsx         ← Estado de autenticación, token, login/logout
   │   ├── hooks/
   │   │   └── usePolling.ts          ← Hook genérico de polling configurable
   │   ├── services/
   │   │   └── apiClient.ts           ← Instancia axios con baseURL, interceptor JWT, manejo de errores
   │   ├── types/
   │   │   ├── alertas.ts             ← Interfaces de alertas, attack_patterns, etc.
   │   │   ├── contenedores.ts
   │   │   ├── tickets.ts
   │   │   └── metrics.ts
   │   ├── components/
   │   │   ├── layout/
   │   │   │   ├── Sidebar.tsx        ← Navegación lateral con íconos y labels
   │   │   │   └── Layout.tsx         ← Shell: sidebar + área de contenido
   │   │   └── common/
   │   │       ├── Badge.tsx          ← Badge de estado/severidad con colores
   │   │       ├── Card.tsx           ← Card base oscura
   │   │       ├── Tabla.tsx          ← Tabla paginada genérica
   │   │       └── Spinner.tsx        ← Loading indicator
   │   └── pages/
   │       ├── LoginPage.tsx          ← (stub, se completa en CH03)
   │       └── DashboardPage.tsx      ← (stub, se completa en CH14)
   ├── index.html
   ├── package.json
   ├── tsconfig.json
   ├── tailwind.config.js
   └── vite.config.ts
   ```

3. **Cliente HTTP (`apiClient.ts`):**
   - `baseURL` desde `VITE_API_URL`
   - Interceptor de request: agrega `Authorization: Bearer {token}` si existe
   - Interceptor de response: si 401 → redirige a login
   - Manejo centralizado de errores

4. **Routing (`App.tsx`):**
   - Ruta `/login` → LoginPage
   - Rutas protegidas con `ProtectedRoute` wrapper
   - Todas las rutas del dashboard bajo `/dashboard/*`
   - Redirección raíz → `/dashboard/inicio`

5. **Layout:**
   - Sidebar fija a la izquierda con secciones: Inicio, Dashboard, Logs, IPs, Tickets, Fail2ban, Prometheus, Wazuh
   - Colores del SDD: fondo `#0f172a`, cards `#1e293b`, acentos `#3b82f6` / `#ef4444`
   - Tipografía: Inter (general), JetBrains Mono (logs)

6. **Constants de polling (`polling.ts`):**
   ```typescript
   export const INTERVALOS_POLLING = {
     ALERTAS_LOG: 3000,
     METRICAS_SISTEMA: 10000,
     FAIL2BAN: 10000,
     DASHBOARD: 30000,
     PROMETHEUS: 30000,
   } as const
   ```

7. **Dependencias (`package.json`):**
   ```json
   {
     "axios": "^1.7.*",
     "react-router-dom": "^6.28.*",
     "lucide-react": "^0.468.*"
   }
   ```

---

## Fase 1 — Autenticación

### CH02: `auth-backend`

| Campo | Valor |
|---|---|
| **Objetivo** | Implementar login completo: endpoint POST /api/auth/login, generación de JWT, middleware de verificación de token, decorator para rutas protegidas |
| **Gobernanza** | HIGH (seguridad) |
| **Depende de** | CH00 |
| **Artefactos** | proposal, design, tasks |

**Alcance detallado:**

1. **POST `/api/auth/login`:**
   - Body: `{ "usuario": "...", "contraseña": "..." }`
   - Valida contra `DASHBOARD_USER` y `DASHBOARD_PASSWORD` de .env
   - Éxito: retorna `{ "access_token": "...", "token_type": "bearer" }`
   - Error: 401 `{ "detail": "Credenciales incorrectas" }`

2. **JWT (`auth.py`):**
   - `crear_token(data: dict, expiracion_horas: int = 8)` → firma con `JWT_SECRET`
   - `verificar_token(token: str)` → decodifica, valida expiración
   - Payload mínimo: `{"sub": "admin", "exp": ...}`

3. **Middleware de autenticación:**
   - Dependency `get_current_user` que extrae token del header `Authorization: Bearer ...`
   - Si token falta o es inválido → 401
   - Se aplica como dependency en todas las rutas excepto `/api/auth/login`

4. **Seguridad:**
   - Contraseñas comparadas con `hmac.compare_digest` (timing-safe)
   - Expiración del JWT configurable (default 8 horas)
   - No se almacena hash de la contraseña — se valida directo contra env vars

---

### CH03: `auth-frontend`

| Campo | Valor |
|---|---|
| **Objetivo** | Implementar pantalla de login, contexto de autenticación, manejo de token, rutas protegidas y redirect automático |
| **Gobernanza** | HIGH (seguridad) |
| **Depende de** | CH01, CH02 |
| **Artefactos** | proposal, design, tasks |

**Alcance detallado:**

1. **LoginPage (`LoginPage.tsx`):**
   - Formulario con usuario y contraseña
   - Estilo SOC oscuro consistente
   - Loading state mientras se autentica
   - Mensaje de error en español si falla
   - Al éxito: guarda token en localStorage y redirige a `/dashboard/inicio`

2. **AuthContext (`AuthContext.tsx`):**
   - `token: string | null`
   - `isAuthenticated: boolean`
   - `login(usuario, contraseña): Promise<void>`
   - `logout(): void`
   - Lee token de `localStorage` al montar

3. **ProtectedRoute:**
   - Wrapper que verifica `isAuthenticated`
   - Si no autenticado → redirect a `/login`

4. **Persistencia:**
   - Token almacenado en `localStorage` (no cookies)
   - Al cerrar sesión: limpia token y redirige a login

---

## Fase 2 — Backend API

> Todos los cambios de esta fase dependen de CH00 y son **independientes entre sí**. Pueden ejecutarse en cualquier orden o en paralelo.

### CH04: `api-contenedores`

| Campo | Valor |
|---|---|
| **Objetivo** | Implementar endpoints de estado y recursos de contenedores Docker |
| **Gobernanza** | MEDIUM |
| **Depende de** | CH00 |
| **Artefactos** | tasks |

**Endpoints:**

1. **GET `/api/status/containers`:**
   - Consulta Docker API (via `DOCKER_HOST` o httpx a Docker socket)
   - Retorna: `[{ "nombre": "n8n", "estado": "running" }, ...]`
   - Contenedores relevantes: n8n, fail2ban, prometheus, alertmanager, syslog-ng, wazuh-manager, wazuh-indexer, wazuh-dashboard, elasticsearch, logstash, kibana, security-postgres, fail2ban-exporter, security-pgadmin
   - Manejo de errores: si Docker no responde → 503 con mensaje descriptivo

2. **GET `/api/status/resources`:**
   - Consumo CPU/RAM por contenedor (vía Docker API stats)
   - Retorna: `[{ "nombre": "n8n", "cpu_percent": 2.3, "ram_mb": 256 }, ...]`
   - Timeout corto (5s) — si Docker no responde, retorna datos parciales

**Servicio:** `docker_service.py` — encapsula toda la interacción con Docker

---

### CH05: `api-prometheus`

| Campo | Valor |
|---|---|
| **Objetivo** | Implementar endpoints de métricas y alertas de Prometheus |
| **Gobernanza** | MEDIUM |
| **Depende de** | CH00 |
| **Artefactos** | tasks |

**Endpoints:**

1. **GET `/api/prometheus/alerts`:**
   - Consulta `PROMETHEUS_URL/api/v1/rules`
   - Retorna estado de las 3 alertas: `IpBaneadaDetectada`, `Fail2banCaido`, `AtaqueMasivo`
   - Formato: `[{ "nombre": "...", "estado": "firing"|"pending"|"inactive", "valor_actual": "...", "tiempo_activo": "..." }]`
   - Si Prometheus no responde → 503

**Servicio:** `prometheus_service.py` — encapsula queries a Prometheus

> **Nota:** Las métricas de fail2ban (`fail2ban_banned_ips`, `fail2ban_up`) se consultan aquí también pero se exponen vía el endpoint de Dashboard (CH06) o vía un endpoint dedicado que el frontend consuma en la página Dashboard.

---

### CH06: `api-alertas`

| Campo | Valor |
|---|---|
| **Objetivo** | Implementar endpoints de alertas PostgreSQL y visor de alerts.log |
| **Gobernanza** | MEDIUM |
| **Depende de** | CH00 |
| **Artefactos** | tasks |

**Endpoints:**

1. **GET `/api/alerts/recent`:**
   - Consulta tabla `alerts`, ordenada por `timestamp` DESC
   - Query params: `?limit=5` (default), `?offset=0`
   - Retorna: `{ "items": [...], "total": N, "limit": 5, "offset": 0 }`
   - Campos: id, timestamp, severity, category, source_host, source_ip, target_host, event_count, description, risk_score, risk_level

2. **GET `/api/alerts/log`:**
   - Lee las últimas 50 líneas del archivo de log (ruta configurable por env var `ALERTS_LOG_PATH`)
   - Retorna: `{ "lineas": ["..."] }`
   - Si el archivo no existe → retorna array vacío (no error 500)

---

### CH07: `api-logs-injector`

| Campo | Valor |
|---|---|
| **Objetivo** | Implementar endpoint de inyección de logs de prueba |
| **Gobernanza** | LOW |
| **Depende de** | CH00 |
| **Artefactos** | tasks |

**Endpoint:**

1. **POST `/api/logs/inject`:**
   - Body: `{ "categoria": "root_login" }`
   - Categorías válidas (según SDD.md):
     - `root_login` → 2 logs desde web-server
     - `ssh_failed` → 12 logs desde web-server
     - `access_denied` → 7 logs desde web-server
     - `port_scan` → 2 logs desde firewall
     - `iptables_drop` → 6 logs desde firewall
     - `sudo_usage` → 2 logs desde db-server
     - `kernel_oops` → 1 log desde db-server
     - `service_restart` → 2 logs desde db-server
     - `paquete_completo` → todos combinados
     - `log_legitimo` → 1 log desde web-server
   - Ejecuta comandos `logger` en el contenedor correspondiente (`docker exec web-server logger ...`)
   - Retorna: `{ "mensaje": "X logs inyectados para categoría Y" }`
   - Error si categoría inválida → 400

---

### CH08: `api-workflows`

| Campo | Valor |
|---|---|
| **Objetivo** | Implementar endpoints para ejecutar y monitorear workflows de n8n, incluyendo métricas TPW |
| **Gobernanza** | MEDIUM |
| **Depende de** | CH00 |
| **Artefactos** | tasks |

**Endpoints:**

1. **POST `/api/workflows/main/run`:**
   - Ejecuta workflow principal: `POST N8N_URL/api/v1/workflows/IlZkF2tpQcwn5ibI/run`
   - Header: `X-N8N-API-KEY: {N8N_API_KEY}`
   - Retorna: `{ "mensaje": "Workflow ejecutado correctamente", "execution_id": "..." }`
   - Error si n8n no responde → 503

2. **POST `/api/workflows/metrics/run`:**
   - Ejecuta workflow de métricas: `POST N8N_URL/api/v1/workflows/S8KYnwHGovQ9pc7G/run`
   - Header: `X-N8N-API-KEY: {N8N_API_KEY}`

3. **GET `/api/workflows/runs`:**
   - Consulta: `GET N8N_URL/api/v1/executions?workflowId=IlZkF2tpQcwn5ibI&limit=10`
   - Header: `X-N8N-API-KEY: {N8N_API_KEY}`
   - Retorna: `[{ "id": "...", "startedAt": "...", "stoppedAt": "...", "status": "success"|"error", "duracion_segundos": 1.08 }]`

4. **GET `/api/metrics/tpw`:**
   - Reutiliza los datos de `/api/workflows/runs`
   - Calcula promedio de duración
   - Retorna: `{ "promedio_segundos": 1.081, "ultima_ejecucion_segundos": 0.994, "ejecuciones": [...] }`

**Servicio:** `n8n_service.py` — encapsula toda la interacción con n8n

---

### CH09: `api-ips`

| Campo | Valor |
|---|---|
| **Objetivo** | Implementar endpoints de gestión de IPs bloqueadas, patrones de ataque y métricas del sistema |
| **Gobernanza** | HIGH (afecta bloqueo/desbloqueo de IPs) |
| **Depende de** | CH00 |
| **Artefactos** | proposal, tasks |

**Endpoints:**

1. **GET `/api/ips/blocked`:**
   - Consulta tabla `blocked_ips`
   - Query params: `?limit=20&offset=0&activo=true` (filtro opcional por estado)
   - Retorna: `{ "items": [...], "total": N, "limit": 20, "offset": 0 }`
   - Campos: id, ip_address, threat_score, reason, blocked_at, blocked_until, is_active

2. **POST `/api/ips/{ip}/unblock`:**
   - Ejecuta: `docker exec fail2ban fail2ban-client set n8n-soar-jail unbanip {ip}`
   - **NO modifica PostgreSQL directamente** — fail2ban dispara el workflow "Anotar desbaneo en BD" (ID: `BOKa87UsdZCW0BOC`) automáticamente
   - Retorna: `{ "mensaje": "IP {ip} desbaneada correctamente" }`
   - Error si la IP no está baneada → 404

3. **GET `/api/ips/attack-patterns`:**
   - Consulta tabla `attack_patterns`
   - Query params: `?limit=20&offset=0&ip=...&categoria=...` (filtros opcionales)
   - Orden: `last_seen` DESC
   - Retorna: `{ "items": [...], "total": N, "limit": 20, "offset": 0 }`
   - Campos: id, pattern_type, source_ip, target_host, first_seen, last_seen, occurrence_count, recent_count, is_blocked

4. **GET `/api/metrics/system`:**
   - Consulta tabla `system_metrics`
   - Query params: `?limit=20&offset=0`
   - Orden: `timestamp` DESC
   - Retorna: `{ "items": [...], "total": N, "limit": 20, "offset": 0 }`
   - Campos: id, timestamp, hostname, metric_name, metric_value, unit

---

### CH10: `api-tickets`

| Campo | Valor |
|---|---|
| **Objetivo** | Implementar endpoint de consulta paginada de tickets |
| **Gobernanza** | MEDIUM |
| **Depende de** | CH00 |
| **Artefactos** | tasks |

**Endpoint:**

1. **GET `/api/tickets`:**
   - Query params: `?limit=15&offset=0&estado=open` (filtro opcional por estado)
   - Orden: `created_at` DESC (más recientes primero)
   - Retorna: `{ "items": [...], "total": N, "limit": 15, "offset": 0 }`
   - Campos: id, ticket_number, title, description, status, priority, category, source_ip, threat_score, assigned_to, created_at, updated_at, alert_reference

---

### CH11: `api-fail2ban`

| Campo | Valor |
|---|---|
| **Objetivo** | Implementar endpoint de estado de la jail de fail2ban |
| **Gobernanza** | MEDIUM |
| **Depende de** | CH00 |
| **Artefactos** | tasks |

**Endpoint:**

1. **GET `/api/fail2ban/jail`:**
   - Ejecuta: `docker exec fail2ban fail2ban-client status n8n-soar-jail`
   - Parsea el resultado: nombre de la jail, cantidad de IPs baneadas, lista de IPs
   - Retorna: `{ "jail": "n8n-soar-jail", "baneadas": 3, "ips": ["1.2.3.4", ...] }`
   - Error si fail2ban no responde → 503

---

### CH12: `api-wazuh`

| Campo | Valor |
|---|---|
| **Objetivo** | Implementar endpoint de conteo de alertas nativas de Wazuh |
| **Gobernanza** | MEDIUM |
| **Depende de** | CH00 |
| **Artefactos** | tasks |

**Endpoint:**

1. **GET `/api/wazuh/alerts/count`:**
   - Consulta: `GET WAZUH_URL:55000/alerts?limit=1` (vía httpx, `verify=False` probable)
   - Header: Basic Auth con `WAZUH_USER` / `WAZUH_PASSWORD`
   - Retorna: `{ "total": N, "mensaje": "Alertas nativas de Wazuh (FIM, integridad, etc.)" }`
   - Error si Wazuh no responde → 503 con mensaje descriptivo

---

## Fase 3 — Frontend Pages

> Todos los cambios de esta fase dependen de CH01 y de su respectivo backend. Son secuenciales porque cada página se integra al layout existente.

### CH13: `ui-inicio`

| Campo | Valor |
|---|---|
| **Objetivo** | Página de bienvenida/presentación profesional del sistema |
| **Gobernanza** | LOW |
| **Depende de** | CH01 |
| **Artefactos** | tasks |

**Contenido (según SDD §3.1):**
- Nombre del sistema y descripción breve
- Listado de tecnologías con íconos: Wazuh, n8n, Elasticsearch, Fail2ban, Prometheus, PostgreSQL, Syslog-ng
- Indicador visual de estado general del sistema (verde/rojo según si los servicios principales responden)
- Botón "Ir al Dashboard"
- Estilo: fondo `#0f172a`, cards `#1e293b`, tipografía Inter

---

### CH14: `ui-dashboard`

| Campo | Valor |
|---|---|
| **Objetivo** | Vista principal con métricas en tiempo real: contenedores, Prometheus, alertas PostgreSQL, TPW |
| **Gobernanza** | MEDIUM |
| **Depende de** | CH01, CH04, CH05, CH06, CH08 |
| **Artefactos** | tasks |

**Contenido (según SDD §3.2):**
- Tarjetas de estado de contenedores: card por cada contenedor mostrando nombre y estado (running/stopped con badge de color)
- Métricas de Prometheus: IPs baneadas (`fail2ban_banned_ips`), estado fail2ban (`fail2ban_up`)
- Últimas 5 alertas de PostgreSQL: tabla con timestamp, severidad, categoría, IP origen, risk level
- Métricas de desempeño TPW: último tiempo, promedio, lista de últimas ejecuciones con duración y estado
- **Polling:** 10 segundos para contenedores/métricas, 30 segundos para alertas/TPW (usar `usePolling` con `INTERVALOS_POLLING`)

---

### CH15: `ui-logs-deteccion`

| Campo | Valor |
|---|---|
| **Objetivo** | Herramientas operativas: visor de logs, triggers de workflows, inyector de logs, historial de ejecuciones |
| **Gobernanza** | MEDIUM |
| **Depende de** | CH01, CH06, CH07, CH08 |
| **Artefactos** | tasks |

**Contenido (según SDD §3.3):**
- **Visor de alerts.log:** últimas 50 líneas, fondo oscuro, fuente JetBrains Mono, scroll automático, polling cada 3 segundos
- **Ejecutar workflows:** dos botones con spinner:
  - "Ejecutar análisis de logs" → POST /api/workflows/main/run
  - "Ejecutar métricas Prometheus" → POST /api/workflows/metrics/run
  - Mensaje de éxito/error
- **Inyector de logs:** dropdown con 10 categorías predefinidas + botón "Inyectar"
- **Historial de ejecuciones n8n:** tabla últimas 10 ejecuciones con fecha, duración, estado (badge de color)

---

### CH16: `ui-gestion-ips`

| Campo | Valor |
|---|---|
| **Objetivo** | Tablas de gestión de IPs: blocked_ips, attack_patterns, system_metrics |
| **Gobernanza** | HIGH (desbloqueo de IPs) |
| **Depende de** | CH01, CH09 |
| **Artefactos** | tasks |

**Contenido (según SDD §3.4):**
- **Tabla blocked_ips:** IP, fecha bloqueo, fecha desbloqueo, estado (badge), botón "Desbloquear" por fila. Paginación 20/página
- **Tabla attack_patterns:** IP, tipo patrón, primera vez, última vez, ocurrencias recientes, bloqueada (sí/no). Paginación 20/página
- **Tabla system_metrics:** timestamp, hostname, métrica, valor, unidad. Paginación 20/página
- **Modal de confirmación** antes de desbloquear IP

---

### CH17: `ui-tickets`

| Campo | Valor |
|---|---|
| **Objetivo** | Lista paginada de tickets con filtros y badges de color |
| **Gobernanza** | LOW |
| **Depende de** | CH01, CH10 |
| **Artefactos** | tasks |

**Contenido (según SDD §3.5):**
- Tabla paginada 15/página, ordenada por `created_at` DESC
- Columnas: número ticket, título, categoría, prioridad (badge), estado (badge), IP origen, risk score, fecha creación
- Colores prioridad: critical=rojo, high=naranja, medium=amarillo, low=gris
- Colores estado: urgent=rojo, open=azul, resolved=verde, closed=gris
- Filtro por estado (dropdown)

---

### CH18: `ui-fail2ban`

| Campo | Valor |
|---|---|
| **Objetivo** | Vista del estado de la jail de fail2ban |
| **Gobernanza** | LOW |
| **Depende de** | CH01, CH11 |
| **Artefactos** | tasks |

**Contenido (según SDD §3.6):**
- Card con nombre de la jail (`n8n-soar-jail`) y cantidad de IPs baneadas
- Lista de IPs baneadas con badge rojo
- Botón de refresh manual
- Timestamp de última actualización
- **Polling:** cada 10 segundos

---

### CH19: `ui-prometheus`

| Campo | Valor |
|---|---|
| **Objetivo** | Vista del estado de las 3 alertas de Prometheus |
| **Gobernanza** | LOW |
| **Depende de** | CH01, CH05 |
| **Artefactos** | tasks |

**Contenido (según SDD §3.7):**
- Tres cards: `IpBaneadaDetectada`, `Fail2banCaido`, `AtaqueMasivo`
- Cada card: nombre, estado (FIRING=rojo, PENDING=amarillo, INACTIVE=verde), valor actual, tiempo activo si FIRING
- **Polling:** cada 30 segundos

---

### CH20: `ui-wazuh`

| Campo | Valor |
|---|---|
| **Objetivo** | Vista del contador de alertas nativas de Wazuh |
| **Gobernanza** | LOW |
| **Depende de** | CH01, CH12 |
| **Artefactos** | tasks |

**Contenido (según SDD §3.8):**
- Contador de alertas nativas de Wazuh (FIM, integridad de archivos)
- Nota aclaratoria: las alertas de seguridad procesadas por n8n se ven en Dashboard y Tickets
- Estilo card con número grande

---

## Fase 4 — Integración Final (Opcional)

> Esta fase se ejecuta después de completar todas las anteriores. Consiste en testing manual, ajustes de UX, optimización de polling y validación end-to-end.

- Verificar que todos los polling intervalos funcionan correctamente
- Validar que el JWT expira y redirige al login
- Probar el flujo completo: login → dashboard → logs → inyectar → ver alerta → IPs → desbloquear
- Verificar paginación en todas las tablas
- Ajustes de responsive (mínimo 1280px)

---

## Fuera de Alcance

> Estas funcionalidades **NO se implementan** en ningún change:

- Autenticación de múltiples usuarios (solo un usuario fijo)
- Edición de reglas de detección desde el panel
- Modificación de workflows de n8n desde el panel
- Historiales de más de 30 días
- WebSockets o Server-Sent Events (solo polling)
- Consumo directo de fail2ban-exporter (siempre vía Prometheus)
- Modificación de docker-compose, workflows de n8n, o cualquier archivo del stack existente
- Tests automatizados (salvo que se soliciten explícitamente)

---

## Discrepancias a Resolver

> Existen diferencias menores entre AGENTS.md y SDD.md en URLs de endpoints. **La fuente canonical es AGENTS.md** para los nombres de rutas. SDD.md aporta la semántica y formato de respuesta.

| Concepto | AGENTS.md (canonical) | SDD.md | Resolución |
|---|---|---|---|
| Contenedores | `/api/status/containers` | `/api/contenedores` | Usar AGENTS.md |
| Alertas recientes | `/api/alerts/recent` | `/api/alertas` | Usar AGENTS.md |
| Log viewer | `/api/alerts/log` | `/api/logs/alerts` | Usar AGENTS.md |
| Workflow run | `/api/workflows/main/run` | `/api/workflows/analisis` | Usar AGENTS.md |
| Blocked IPs | `/api/ips/blocked` | `/api/ips/bloqueadas` | Usar AGENTS.md |
| Attack patterns | `/api/ips/attack-patterns` | `/api/ips/patrones` | Usar AGENTS.md |
| System metrics | `/api/metrics/system` | `/api/ips/metricas` | Usar AGENTS.md |
| Fail2ban | `/api/fail2ban/jail` | `/api/fail2ban/estado` | Usar AGENTS.md |

---

## Orden de Implementación Sugerido

### Sprint 1 — Fundamentos (2-3 horas)
1. **CH00** cimiento-backend
2. **CH01** cimiento-frontend

### Sprint 2 — Auth + Primeras APIs (3-4 horas)
3. **CH02** auth-backend
4. **CH03** auth-frontend
5. **CH04** api-contenedores (primer endpoint funcional para probar)

### Sprint 3 — Backend APIs Core (4-5 horas, paralelizable)
6. **CH05** api-prometheus
7. **CH06** api-alertas
8. **CH08** api-workflows (incluye TPW)
9. **CH09** api-ips
10. **CH10** api-tickets
11. **CH11** api-fail2ban
12. **CH12** api-wazuh
13. **CH07** api-logs-injector

### Sprint 4 — Frontend Pages (5-6 horas, secuencial)
14. **CH13** ui-inicio
15. **CH14** ui-dashboard
16. **CH15** ui-logs-deteccion
17. **CH16** ui-gestion-ips
18. **CH17** ui-tickets
19. **CH18** ui-fail2ban
20. **CH19** ui-prometheus
21. **CH20** ui-wazuh

### Sprint 5 — Integración (1-2 horas)
22. Validación end-to-end
23. Ajustes de UX y responsive

**Tiempo estimado total: 15-20 horas de desarrollo**

---

## Siguientes Pasos Recomendados

1. **Crear el primer change:** `openspec new change "cimiento-backend"` (CH00)
2. Generar proposal + design + tasks para CH00
3. Implementar CH00 → CH01 → luego paralelizar APIs
4. Repetir el ciclo propose → apply → archive por cada change

¿Confirmas este roadmap o quieres ajustar algo antes de empezar a crear changes?
