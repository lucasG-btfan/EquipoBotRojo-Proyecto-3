# EquipoBotRojo Proyecto 3 — Sistema SIEM/SOAR con Panel de Control Web

Sistema integral de detección y respuesta a intrusiones construido íntegramente sobre herramientas
open source: recolección centralizada de logs, detección de amenazas con workflows automatizados,
respuesta automática (baneo de IPs, tickets), monitoreo de métricas con alertas, correlación SIEM
con Wazuh — y un **panel de control web** propio que unifica la operación de todo el sistema.

**Stack:** syslog-ng · n8n · PostgreSQL · Fail2ban · Prometheus + Alertmanager · ELK (Elasticsearch,
Logstash, Kibana) · Wazuh · React + TypeScript · FastAPI · Docker

**Roadmap del panel web:** completo (21/21 changes — ver [§12](#12-estado-del-desarrollo))

---

## Índice

- [EquipoBotRojo Proyecto 3 — Sistema SIEM/SOAR con Panel de Control Web](#equipobotrojo-proyecto-3--sistema-siemsoar-con-panel-de-control-web)
  - [Índice](#índice)
  - [1. ¿Qué hace este sistema, en una frase?](#1-qué-hace-este-sistema-en-una-frase)
  - [2. Arquitectura general](#2-arquitectura-general)
  - [3. Inicio rápido](#3-inicio-rápido)
  - [4. Stack de contenedores (14 servicios)](#4-stack-de-contenedores-14-servicios)
  - [5. Base de datos (PostgreSQL `security_monitoring`)](#5-base-de-datos-postgresql-security_monitoring)
  - [6. Workflows de n8n (versionados en `data/n8n/`)](#6-workflows-de-n8n-versionados-en-datan8n)
  - [7. Monitoreo: Prometheus + Alertmanager + fail2ban-exporter](#7-monitoreo-prometheus--alertmanager--fail2ban-exporter)
  - [8. Wazuh SIEM](#8-wazuh-siem)
  - [9. Panel de control web](#9-panel-de-control-web)
    - [9.1 Frontend — React + TypeScript + Tailwind](#91-frontend--react--typescript--tailwind)
    - [9.2 Backend — FastAPI](#92-backend--fastapi)
    - [9.3 Contrato de la API (verificado contra `backend/routers/`)](#93-contrato-de-la-api-verificado-contra-backendrouters)
  - [10. Variables de entorno](#10-variables-de-entorno)
    - [Backend (`backend/.env`) — leídas por `config.py`](#backend-backendenv--leídas-por-configpy)
    - [Frontend (`frontend/.env`)](#frontend-frontendenv)
  - [11. Notas operativas](#11-notas-operativas)
    - [11.1 Inyector de logs de prueba](#111-inyector-de-logs-de-prueba)
    - [11.2 Preparar los emisores (antes de cada demo)](#112-preparar-los-emisores-antes-de-cada-demo)
    - [11.3 Problemas conocidos](#113-problemas-conocidos)
  - [12. Estado del desarrollo](#12-estado-del-desarrollo)
  - [13. Estructura del repositorio y convenciones](#13-estructura-del-repositorio-y-convenciones)
  - [14. Fuentes de información](#14-fuentes-de-información)

---

## 1. ¿Qué hace este sistema, en una frase?

Un log sospechoso entra por `syslog-ng` → un workflow de `n8n` lo analiza y decide si es una
amenaza → si lo es, `Fail2ban` banea la IP automáticamente y se genera un ticket → `Prometheus`
vigila que todo el pipeline siga sano y dispara alertas si algo falla → todo el evento, además,
queda visible en `Kibana` (búsqueda/análisis) y correlacionado en `Wazuh` (SIEM). El **panel de
control web** es la ventana única desde donde se observa y opera todo esto, sin tocar una terminal.

Si es la primera vez que tocás este repo, andá directo a [§3 — Inicio rápido](#3-inicio-rápido).

---

## 2. Arquitectura general

```
                        ┌──────────────────────────────────────────────┐
                        │              PANEL DE CONTROL WEB             │
                        │  Frontend React+TS (:5173) ── Backend         │
                        │                    FastAPI (:8000)            │
                        └──────────────────────┬───────────────────────┘
                                                │ consulta/opera
     Emisores de logs                                          ▼
  (web-server, firewall,      syslog-ng ──▶ n8n (workflows SOAR) ──▶ PostgreSQL
   db-server: efímeros)       (colector)         │                     
                                                 ├──▶ Fail2ban ──▶  Prometheus ──▶   Alertmanager ──webhook──▶ n8n (creación de tickets)
                                                  ├──▶ Logstash ──▶ Elasticsearch ──▶ Kibana
                                                  └──▶ Wazuh Manager ◀── agentes Windows/Linux
                                     
                          
```

**Flujo principal:** los logs llegan a syslog-ng → n8n los analiza contra reglas de detección →
genera alertas en PostgreSQL → las amenazas críticas disparan auto-bloqueo vía Fail2ban →
fail2ban-exporter expone métricas → Prometheus las scrapea y Alertmanager crea tickets por webhook
de n8n. En paralelo, los eventos se envían a ELK (búsqueda/análisis) y a Wazuh (SIEM/correlación).

El panel web **nunca toca las APIs del stack directamente desde el browser**: todo pasa por el
backend FastAPI, que actúa como proxy autenticado.

---

## 3. Inicio rápido

Para levantar todo el sistema desde cero, en este orden:

1. **Stack de contenedores:**
   ```bash
   docker compose up -d
   docker ps        # verificar que los 14 servicios estén running
   ```
2. **Backend:**
   ```powershell
   cd backend
   python -m venv venv                 # solo la primera vez
   .\venv\Scripts\activate
   pip install -r requirements.txt     # solo la primera vez
   python -m backend                   # o: uvicorn backend.main:app --reload --port 8000
   ```
   Docs interactivas de la API: http://localhost:8000/docs
3. **Frontend:**
   ```powershell
   cd frontend
   npm install        # solo la primera vez (Node 20)
   npm run dev        # http://localhost:5173
   ```
4. **Login** con las credenciales de `DASHBOARD_USER` / `DASHBOARD_PASSWORD` (ver [§10](#10-variables-de-entorno)).
5. **(Opcional, solo para demos)** preparar los tres emisores de logs sintéticos — ver
   [§11.2](#112-preparar-los-emisores-antes-de-cada-demo).

> Antes de tocar código, revisá también `AGENTS.md` (convenciones, reglas del proyecto) — es la
> referencia para cualquier cambio, sea humano o agente el que lo escriba.

---

## 4. Stack de contenedores (14 servicios)

Definidos en `docker-compose.yml` (archivo protegido — no modificar sin coordinar con el equipo):

| Servicio | Imagen | Puerto host | Rol |
|---|---|---|---|
| `syslog-ng` | balabit/syslog-ng:4.10.2 | 514/udp, 601/tcp, 1514/tcp+udp | Colector central de logs |
| `postgres` | postgres:15 | 5432 | BD `security_monitoring` (init desde `./bd/`) |
| `pgadmin` | dpage/pgadmin4:9.11 | 5050 | Administración de PostgreSQL |
| `elasticsearch` | 8.13.0 | 9200, 9300 | Almacén y búsqueda de logs |
| `kibana` | 8.13.0 | 5601 | Visualización ELK |
| `logstash` | 8.13.0 | 8080, 8081 | Ingesta de logs hacia ES |
| `fail2ban` | crazymax/fail2ban | host network (NET_ADMIN) | Baneo de IPs |
| `fail2ban-exporter` | build local (`Dockerfile.exporter`) | 9121 | Métricas de fail2ban → formato Prometheus |
| `prometheus` | v3.9.1 | 9090 | Scraping y reglas de alertas |
| `alertmanager` | v0.31.1 | 9093 | Enrutamiento de alertas → webhook n8n |
| `n8n` | 1.118.2 | 5678 | Automatización SOAR (usa PostgreSQL como BD propia) |
| `wazuh-indexer` | wazuh 4.7.2 | 9201 | OpenSearch de Wazuh |
| `wazuh-manager` | wazuh 4.7.2 | 55000, 1516 | Motor de análisis y API de Wazuh |
| `wazuh-dashboard` | wazuh 4.7.2 | 5602 | UI de Wazuh |

Redes: `security-network` y `wazuh-network` (syslog-ng y n8n están en ambas). Volúmenes nombrados
para persistencia: `postgres_data`, `n8n_data`, `fail2ban_data`, `fail2ban_db`, `wazuh-*-data`.

Además existen tres **emisores de logs efímeros** (`web-server`, `firewall`, `db-server`) que NO
están declarados en el compose: se crean a mano antes de cada demostración (ver [§11.2](#112-preparar-los-emisores-antes-de-cada-demo)).

---

## 5. Base de datos (PostgreSQL `security_monitoring`)

Esquema core (`bd/schema.sql`):

| Tabla | Propósito |
|---|---|
| `alerts` | Alertas del pipeline: severidad, categoría, IP/host origen-destino, risk_score/risk_level, raw_log, estado de investigación y `threat_intel` JSONB (enriquecimiento) |
| `attack_patterns` | Patrones recurrentes por IP atacante: tipo, primera/última vez visto, ocurrencias totales y ventana reciente |
| `system_metrics` | Métricas de sistema por hostname |
| `detection_rules` | Reglas regex de detección con umbral/ventana temporal — 5 reglas seed: SSH Brute Force, Sudo Abuse, Port Scan, Root Login, SQL Injection |

Extensión SOAR (`bd/schema-extended.sql`):

| Tabla | Propósito |
|---|---|
| `blocked_ips` | IPs baneadas: threat_score, motivo, vigencia, flag `is_active` |
| `security_tickets` | Tickets automáticos: número, prioridad, categoría, IP origen, FK a `alerts(id)` |

---

## 6. Workflows de n8n (versionados en `data/n8n/`)

| Workflow | Nodos | Función |
|---|---|---|
| `Workflow_fase _3-final` | 25 | Principal: lee `alerts.log`, parsea, aplica reglas, enriquece con threat intel, guarda alertas, marca IPs para baneo y notifica |
| `worflow_fas_4_Auto-bloqueo` | 7 | Recibe alertas por webhook y bloquea IPs según threat_score (≥80 → 30 días, ≥60 → 24 h) escribiendo la marca que Fail2ban observa |
| `Sistema de Tickets Automático` | 16 | Crea tickets en `security_tickets` y notifica (email/Slack) según tipo de amenaza |
| `Metricas Prometheus` | 6 | Recolecta métricas del sistema hacia `system_metrics` |
| `subworkflow_wazuh_monitor` | 5 | Envía eventos enriquecidos a la API de Wazuh (JWT) y a Logstash para trazabilidad |
| `Anotar desbaneo en BD` | 3 | Webhook disparado por Fail2ban al desbanear: actualiza `blocked_ips.is_active = false` |

Los IDs reales de los workflows cambian si se recrean en n8n: el backend los toma de variables de
entorno (`N8N_WORKFLOW_ID_*`, ver [§10](#10-variables-de-entorno)) — nunca están hardcodeados.

---

## 7. Monitoreo: Prometheus + Alertmanager + fail2ban-exporter

- **Prometheus** scrapea cada 15 s a sí mismo y al exporter. Define 3 alertas críticas:
  - `IpBaneadaDetectada` — más de 0 IPs baneadas por 10 s
  - `Fail2banCaido` — exporter caído por 1 m
  - `AtaqueMasivo` — más de 10 IPs baneadas simultáneas
- **Alertmanager** tiene un único receptor (`n8n-tickets`) que dispara el webhook
  `/webhook/create-ticket` de n8n → creación automática de tickets. Repeat intervals afinados:
  Fail2banCaido 15 m, AtaqueMasivo 1 h, resto 12 h.
- **fail2ban-exporter** (build local, Python) lee la BD sqlite3 de Fail2ban y expone métricas en
  texto plano en :9121. **Nunca se consulta directo** — siempre vía API de Prometheus, que ya las
  tiene scrapeadas.
- **Fail2ban**: jail única `n8n-soar-jail`, `maxretry=1` (baneo al primer match), `bantime=600s`
  con incremento exponencial (×2, máx 24 h). El filtro detecta la marca
  `[ALERTA SEGURIDAD] BLOQUEAR IP:` que n8n escribe en su log — **n8n decide, Fail2ban ejecuta**.
  El action de desbaneo hace POST al webhook de n8n que anota el desbaneo en la BD.

---

## 8. Wazuh SIEM

Integrado al stack como plataforma SIEM: correlación, agentes y alertas nativas (FIM, integridad,
etc.) diferenciadas de las alertas del pipeline n8n.

- Agente Windows registrado y activo (ver procedimiento más abajo).
- El backend consulta el **Indexer OpenSearch (:9201)** para contar alertas nativas
  (índice `wazuh-alerts-*`) — no la API del manager (:55000), que exige JWT y no expone conteo.

Consideraciones importantes del stack Wazuh:

- `wazuh/dashboard/wazuh.yml` usa el nombre de servicio Docker (no IP, son dinámicas). Montado
  como `:ro` — cambiarlo a `:rw` corrompe el YAML porque el script de inicio lo sobreescribe.
- `wazuh/manager/etc/api.yaml` tiene `use_only_authd: no`. No revertir a `yes`: causa timeout y
  error 500 en el plugin del dashboard.
- `client.keys` está montado desde el host para persistir agentes registrados entre recreaciones.
- Problema conocido Windows: si `localhost:5602` no responde pero `127.0.0.1:5602` sí, ejecutar
  `netsh winsock reset` + `netsh int ip reset` como administrador y reiniciar.

<details>
<summary><strong>Registro de un agente Windows en Wazuh (procedimiento completo)</strong></summary>

**Paso 1 — Descargar el instalador:** `wazuh-agent-4.7.2-1.msi` desde la
[documentación oficial de Wazuh](https://documentation.wazuh.com/current/installation-guide/wazuh-agent/wazuh-agent-package-windows.html).

**Paso 2 — Instalar** (PowerShell como administrador):
```powershell
msiexec /i "C:\Users\TU_USUARIO\Downloads\wazuh-agent-4.7.2-1.msi" /q WAZUH_MANAGER="localhost" WAZUH_AGENT_NAME="nombre-equipo"
```

**Paso 3 — Configurar puerto:** editar `C:\Program Files (x86)\ossec-agent\ossec.conf`
y verificar que el cliente apunte a `localhost`, puerto `1516`, protocolo `tcp`.

**Paso 4 — Registrar el agente en el manager:**
```bash
docker exec wazuh-manager bash -c "touch /var/ossec/etc/client.keys && chmod 640 /var/ossec/etc/client.keys && chown root:wazuh /var/ossec/etc/client.keys"
docker exec -it wazuh-manager /var/ossec/bin/manage_agents -a "any" -n "nombre-equipo"
docker exec -it wazuh-manager /var/ossec/bin/manage_agents -e 001
```

**Paso 5 — Importar la clave en Windows** (la que devuelve el paso anterior):
```powershell
& "C:\Program Files (x86)\ossec-agent\manage_agents.exe" -i "CLAVE_AQUI"
```

**Paso 6 — Crear grupo default y reiniciar el manager:**
```bash
docker exec wazuh-manager bash -c "mkdir -p /var/ossec/etc/shared/default && chown -R wazuh:wazuh /var/ossec/etc/shared/default && echo '<agent_config></agent_config>' > /var/ossec/etc/shared/default/agent.conf && chown wazuh:wazuh /var/ossec/etc/shared/default/agent.conf"
docker restart wazuh-manager
```

**Paso 7 — Iniciar el servicio:** `NET START WazuhSvc`

**Paso 8 — Verificar que quedó activo:**
```bash
docker exec wazuh-manager /var/ossec/bin/agent_control -l
```
Resultado esperado: ID `000` (server) e ID `001` (tu equipo), ambos `Active`.

</details>

---

## 9. Panel de control web

### 9.1 Frontend — React + TypeScript + Tailwind

| Ítem | Valor |
|---|---|
| Framework | React 19.2 + TypeScript, Vite 8 (puerto fijo **5173**) |
| Estilos | Tailwind CSS 3.4, paleta oscura SOC (fondo `#0f172a`, superficie `#1e293b`, primario azul `#3b82f6`, peligro rojo `#ef4444`), tipografías Inter + JetBrains Mono |
| HTTP | axios con interceptor JWT automático |
| Node | 20.x (`.nvmrc`) · lint con oxlint |

**Rutas:**

| Ruta | Página | Contenido |
|---|---|---|
| `/` | Landing | Presentación comercial pública del sistema (hero, capacidades, stack, métricas animadas) |
| `/login` | Login | Autenticación (emisión de JWT); redirige al panel si ya hay sesión |
| `/dashboard/inicio` | Inicio | Salud general del sistema (dot verde/rojo según contenedores running) |
| `/dashboard/panel` | Dashboard | KPIs (contenedores activos, IPs baneadas, estado Fail2ban, TPW), estado de contenedores, últimas 20 alertas, métricas TPW |
| `/dashboard/logs` | Logs y detección | Visor de `alerts.log`, botones de ejecución de workflows, inyector de logs e historiales de los 4 workflows |
| `/dashboard/ips` | Gestión de IPs | Tablas paginadas: IPs bloqueadas (desbloqueo/baneo manual), patrones de ataque, métricas de sistema |
| `/dashboard/tickets` | Tickets | Lista paginada con filtros por estado/prioridad, detalle expandible y cierre manual |
| `/dashboard/fail2ban` | Fail2ban | Estado de la jail e IPs baneadas actualmente |
| `/dashboard/prometheus` | Prometheus | Cards de las 3 alertas (FIRING/PENDING/INACTIVE) con tiempo en firing |
| `/dashboard/wazuh` | Wazuh | Contador de alertas nativas + enlaces externos a Kibana/Wazuh |

**Tiempo real = polling** (decisión de diseño, sin WebSockets ni SSE). Intervalos definidos en
`src/constants/polling.ts` — configurables, nunca hardcodeados en componentes:

| Constante | Valor | Uso |
|---|---|---|
| `ALERTAS_LOG` | 3 s | Visor de `alerts.log` |
| `METRICAS_SISTEMA` | 10 s | Contenedores y métricas de sistema |
| `FAIL2BAN` | 10 s | Estado de jail |
| `HISTORIAL_WORKFLOWS` | 10 s | Historiales de n8n |
| `WAZUH` | 10 s | Contador de alertas nativas |
| `DASHBOARD` | 30 s | Alertas recientes, TPW, salud general |
| `PROMETHEUS` | 30 s | Alertas de Prometheus |

Las tablas operativas (IPs, patrones, tickets) usan botón manual "Actualizar", sin polling.

**Autenticación frontend:** token en `localStorage` (`siem_token`), interceptor axios agrega
`Authorization: Bearer`, ante 401 limpia sesión y redirige a `/login`. Rutas protegidas con
`ProtectedRoute`; landing y login redirigen al panel si ya hay sesión.

**Responsive:** breakpoint `lg` separa escritorio (sidebar fija) de móvil (barra superior sticky
con scroll horizontal). Solo variantes `max-lg:`/`max-md:` — el diseño desktop no cambia.

### 9.2 Backend — FastAPI

| Ítem | Valor |
|---|---|
| Framework | FastAPI 0.115 + uvicorn 0.34, arranque con `python -m backend` (puerto 8000) |
| BD | SQLAlchemy 2.0 async + psycopg3 (driver forzado en runtime por compatibilidad Windows) |
| HTTP externo | httpx async (n8n, Prometheus, Wazuh Indexer) |
| Docker | SDK oficial docker-py 7 (estado, recursos, exec de fail2ban/logger) |
| Auth | python-jose (JWT HS256, expiración configurable, credenciales comparadas timing-safe) |

**Servicios** (`backend/services/`): `docker_service` (contenedores/recursos, stats paralelos),
`n8n_service` (disparo por webhook + historial REST con cliente compartido, cachés LRU y snapshot
ante caídas de n8n, enriquecimiento paralelo), `prometheus_service` (reglas y queries),
`fail2ban_service` (exec de `fail2ban-client` dentro del contenedor),
`logs_injector_service` (inyección sintética RFC3164 con verificación de precondiciones),
`wazuh_service` (conteo vía Indexer `_count`).

Patrón de errores uniforme: excepciones de dominio mapeadas a HTTP semántico (400/404/500/502/503/
504), mensajes en español, y **degradación elegante** donde corresponde (archivo de logs ausente →
lista vacía; n8n caído → snapshot cacheado; índice Wazuh inexistente → total 0).

### 9.3 Contrato de la API (verificado contra `backend/routers/`)

Todas las rutas requieren `Authorization: Bearer <token>` salvo las marcadas 🌐.

| Método | Ruta | Descripción |
|---|---|---|
| GET 🌐 | `/api/health` | Health check |
| POST 🌐 | `/api/auth/login` | Devuelve `{access_token, token_type}` |
| GET | `/api/status/containers` | Estado up/down de los 14 contenedores (vía Docker Engine) |
| GET | `/api/status/resources` | CPU/RAM por contenedor |
| GET | `/api/metrics/tpw` | TPW actual, promedio e historial (calculado desde duraciones de ejecuciones n8n) |
| GET | `/api/prometheus/alerts` | Las 3 alertas + métricas fail2ban (`banned_ips`, `up`) |
| GET | `/api/alerts/recent` | Últimas alertas PG, paginado (`limit`≤50, `offset`) |
| GET | `/api/alerts/log` | Últimas 50 líneas de `alerts.log` |
| POST | `/api/logs/inject` | Inyecta logs sintéticos `{categoria}` |
| GET | `/api/logs/inject/categorias` | Catálogo (9 categorías + paquete completo) con disponibilidad del emisor |
| POST | `/api/workflows/main/run` | Dispara workflow principal |
| POST | `/api/workflows/metrics/run` | Dispara workflow de métricas |
| GET | `/api/workflows/runs` | Historial del principal (`limit`≤50) |
| GET | `/api/workflows/metrics/runs` | Historial de métricas |
| GET | `/api/workflows/tickets/runs` | Historial de tickets |
| GET | `/api/workflows/bloqueo/runs` | Historial de auto-bloqueo |
| GET | `/api/ips/blocked` | `blocked_ips` paginado, filtros `activo` y búsqueda por `motivo` |
| POST | `/api/ips/{ip}/unblock` | Desbloquea vía `fail2ban-client` (la BD se actualiza por webhook n8n) |
| POST | `/api/ips/{ip}/ban` | Baneo manual de prueba vía fail2ban |
| GET | `/api/ips/attack-patterns` | Patrones paginados, filtros por `ip`/`categoria` |
| GET | `/api/metrics/system` | Métricas de sistema paginadas, filtro por rango de fechas |
| GET | `/api/tickets` | Tickets paginados (def. 15), filtros `estado`/`prioridad`, más recientes primero |
| POST | `/api/tickets/{id}/resolve` | Cierra un ticket (`status=resolved`) |
| GET | `/api/fail2ban/jail` | Estado de `n8n-soar-jail` e IPs baneadas |
| GET | `/api/wazuh/alerts/count` | Total de alertas nativas Wazuh (vía Indexer OpenSearch) |

Paginación uniforme offset/limit: respuesta `{items, total, limit, offset}`.

---

## 10. Variables de entorno

### Backend (`backend/.env`) — leídas por `config.py`

```
DATABASE_URL=postgresql://db_user:db_pass@localhost:5432/security_monitoring
N8N_URL=http://localhost:5678
N8N_API_KEY=<token API REST de n8n>
N8N_WORKFLOW_ID_PRINCIPAL=<id>          # obligatorio para historial/disparo
N8N_WORKFLOW_ID_METRICAS=<id>
N8N_WORKFLOW_ID_TICKETS=<id>            # opcional
N8N_WORKFLOW_ID_BLOQUEO=<id>            # opcional
PROMETHEUS_URL=http://localhost:9090
DOCKER_HOST=npipe:////./pipe/dockerDesktopLinuxEngine    # unix:///var/run/docker.sock en Linux
DASHBOARD_USER=admin
DASHBOARD_PASSWORD=<completar>
JWT_SECRET=<completar>
FRONTEND_ORIGIN=http://localhost:5173   # único origen CORS permitido
WAZUH_INDEXER_URL=https://localhost:9201
WAZUH_INDEXER_USER=admin
WAZUH_INDEXER_PASSWORD=<completar>
WAZUH_ALERTS_INDEX=wazuh-alerts-*
WAZUH_VERIFY_TLS=false                  # certificado autofirmado del indexer
SYSLOG_HOST=syslog-ng                   # destino del logger del inyector
SYSLOG_PORT=514
FAIL2BAN_CONTAINER=fail2ban
FAIL2BAN_JAIL=n8n-soar-jail
ALERTS_LOG_PATH=logs/security/alerts.log
```

Notas: `.env` está en `.gitignore` — nunca versionar IPs ni credenciales. Los IDs de workflows van
acá (no hardcodeados) porque n8n genera IDs nuevos al recrear workflows. `WAZUH_URL`/`WAZUH_USER`/
`WAZUH_PASSWORD` existen en config pero **no se usan** (quedaron del diseño original vía manager).

### Frontend (`frontend/.env`)

```
VITE_API_URL=http://localhost:8000      # obligatoria
VITE_KIBANA_URL=http://localhost:5601   # opcional, enlaces de la página Wazuh
VITE_WAZUH_URL=http://localhost:5602    # opcional
```

---

## 11. Notas operativas

### 11.1 Inyector de logs de prueba

Expone `POST /api/logs/inject` con categorías: `root_login`, `ssh_failed` (×12, la que dispara el
baneo demostrativo), `access_denied`, `port_scan`, `iptables_drop`, `sudo_usage`, `kernel_oops`,
`service_restart`, `log_legitimo` y `paquete_completo`. Los logs atraviesan la cadena **real** de
detección (syslog-ng → n8n → PG → Fail2ban → Prometheus). El backend nunca crea contenedores:
solo verifica precondiciones (existencia, estado, red compartida con syslog-ng y `logger` de
util-linux con soporte `--rfc3164`) y responde 503 con el comando exacto si algo falta.

### 11.2 Preparar los emisores (antes de cada demo)

```bash
# Paso 0 — nombre real de la red (compose materializa <proyecto>_security-network)
docker network ls | grep security-network

# Paso 1 — crear los tres emisores (<red> = nombre del paso 0)
docker run -d --name web-server --hostname web-server --network <red> alpine sleep infinity
docker run -d --name firewall   --hostname firewall   --network <red> alpine sleep infinity
docker run -d --name db-server  --hostname db-server  --network <red> alpine sleep infinity

# Paso 2 — instalar logger (BusyBox trae un applet sin --rfc3164 que falla silencioso)
docker exec web-server apk add --no-cache util-linux
docker exec firewall   apk add --no-cache util-linux
docker exec db-server  apk add --no-cache util-linux
```

Verificación rápida de que `logger` soporta `--rfc3164` (no alcanza con `command -v logger`, ya que
BusyBox trae un applet con el mismo nombre que falla en silencio):

```bash
docker exec web-server sh -c "logger --help 2>&1 | grep -q -- --rfc3164 && echo OK || echo FALTA util-linux"
```

### 11.3 Problemas conocidos

- **ELK con poco espacio/disco:** Elasticsearch bloquea ingesta con disco lleno. Soluciones
  aplicadas: plantilla de índice con `number_of_replicas: 0` (single-node) y desactivar umbrales de
  disco (`cluster.routing.allocation.disk.threshold_enabled: false`). Estado esperado: green.
- **Logs manuales vs facility:** los comandos `logger` manuales con `<4>` pueden no matchear el
  filtro `facility(auth, authpriv)` de syslog-ng — comportamiento esperado del pipeline.
- **Driver BD en Windows:** asyncpg falla con WinError 64; `database.py` reescribe la URL a
  psycopg3 en runtime. No quitar esa lógica.

---

## 12. Estado del desarrollo

**Roadmap del panel web: COMPLETO.** Los 21 changes (CH00–CH20) fueron implementados y archivados
entre el 17 y el 20/08/2026 mediante flujo OpenSpec (specs consolidados en `openspec/specs/`):

- **Fase cimientos:** CH00 backend base · CH01 frontend base · CH02-03 autenticación
- **Fase APIs:** CH04 contenedores · CH05 prometheus · CH06 alertas/logs · CH07 inyector ·
  CH08 workflows n8n/TPW · CH09 gestión IPs · CH10 tickets · CH11 fail2ban · CH12 wazuh
- **Fase UI:** CH13 inicio · CH14 dashboard · CH15 logs/detección · CH16 gestión IPs ·
  CH17 tickets · CH18 fail2ban · CH19 prometheus · CH20 wazuh

**Cobertura de los ejercicios del curso:**

| Ejercicio | Consigna | Dónde está cubierto |
|---|---|---|
| 1 | Syslog-ng central + clientes enviando logs | `syslog-ng` colector central ([§4](#4-stack-de-contenedores-14-servicios)) + emisores de prueba ([§11.2](#112-preparar-los-emisores-antes-de-cada-demo)) |
| 2 | Reglas de detección personalizadas + workflow n8n | Tabla `detection_rules` con 5 reglas seed ([§5](#5-base-de-datos-postgresql-security_monitoring)) + workflow principal ([§6](#6-workflows-de-n8n-versionados-en-datan8n)) |
| 3 | Pipeline hacia ELK | n8n → Logstash → Elasticsearch → Kibana ([§4](#4-stack-de-contenedores-14-servicios)) |
| 4 | Respuesta automática y notificaciones multi-canal | Auto-bloqueo vía Fail2ban, tickets automáticos vía Alertmanager→n8n, email/Slack ([§6](#6-workflows-de-n8n-versionados-en-datan8n), [§7](#7-monitoreo-prometheus--alertmanager--fail2ban-exporter)) |

**Mejoras post-roadmap** (rama `correcciones-2`, fuera de openspec):

1. Landing page comercial pública en `/`.
2. Historiales de los 4 workflows n8n (principal, métricas, bloqueo, tickets).
3. Optimización del historial n8n: fix de N+1 (~13 s → milisegundos) con cliente httpx compartido,
   paralelización y caché con degradación elegante.
4. Cierre manual de tickets (`POST /api/tickets/{id}/resolve`).
5. Baneo manual (`POST /api/ips/{ip}/ban`).
6. Responsive móvil completo (barra superior, sin tocar el diseño desktop).
7. IDs de workflows movidos a variables de entorno.
8. Filtros ampliados: búsqueda de IPs por motivo, tickets por prioridad, métricas por fecha.

---

## 13. Estructura del repositorio y convenciones

```
EquipoBotRojo-Proyecto-3/
├── docker-compose.yml          # Stack de 14 contenedores (PROTEGIDO — no modificar)
├── bd/                         # schema.sql + schema-extended.sql (referencia de modelos)
├── data/
│   ├── n8n/                    # Export JSON de los 6 workflows
│   └── dashboards/             # Dashboards exportados (.ndjson)
├── fail2ban_config/            # jail, filter, action unban, exporter.py
├── prometheus/                 # prometheus.yml + reglas de las 3 alertas
├── alertmanager/               # alertmanager.yml (receiver → webhook n8n)
├── logstash/pipeline/          # Pipeline de ingesta
├── wazuh/                      # manager/, indexer/, dashboard/ (config protegida)
├── backend/                    # API FastAPI (routers/, services/, models/, schemas/)
├── frontend/                   # Panel React+TS (pages/, components/, contexts/, services/)
├── docs/                       # SDD.md (documento de diseño histórico)
├── openspec/                   # Specs consolidados + archive de los 21 changes
├── Dockerfile.exporter         # Build del fail2ban-exporter
├── start-wazuh.ps1             # Arranque manual de daemons del wazuh-manager
└── CHANGES.md                  # Roadmap histórico del panel web
```

> Nota: si en tu máquina local la carpeta raíz se llama `EquipoBotRojo.Proyecto3` (con puntos) en
> lugar de `EquipoBotRojo-Proyecto-3` (con guiones, como el repositorio en GitHub), es solo el
> nombre de carpeta local — no afecta nada del proyecto, pero conviene unificarlo para evitar
> confusión al compartir rutas entre el equipo.

**Convenciones de código:** todo en español; componentes PascalCase, hooks/servicios camelCase,
carpetas kebab-case; TypeScript sin `any`; backend snake_case con try/except explícito en cada
endpoint; sin IPs ni credenciales hardcodeadas. Detalle completo en `AGENTS.md` — es la referencia
obligatoria antes de escribir código nuevo, manual o asistido por un agente.

---

## 14. Fuentes de información
Algunas de las fuentes de informacion usadas para el proyecto:
- Curso de Docker del profesor Ariel Enferrel.
- GitHub provisto por los profesores (base de syslog-ng.conf, Logstash, BD PostgreSQL y nodos n8n).
- Documentación oficial: [Wazuh 4.7](https://documentation.wazuh.com/4.7/) ·
  [deployment Docker](https://documentation.wazuh.com/4.7/deployment-options/docker/docker-installation.html) ·
  [API reference](https://documentation.wazuh.com/4.7/user-manual/api/reference.html)
- Videos: [n8n intro](https://www.youtube.com/watch?v=3IvcIPDGB1k) ·
  [playlist n8n](https://www.youtube.com/watch?v=llzEpKUxl9E&list=PLMd59HZRUmEjuFxu8hsAvErZkn0_W-A6b) ·
  [Fail2ban](https://youtu.be/kgdoVeyoO2E) · [Prometheus/Alertmanager](https://www.youtube.com/watch?v=93aafqTJRwQ) ·
  [Envio de tickets con N8N](https://www.youtube.com/watch?v=md6KZo_-bfw)
