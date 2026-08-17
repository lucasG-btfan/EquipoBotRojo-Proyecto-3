# SDD.md — Panel de Control SIEM/SOAR

## 1. Descripción general

Panel de control web para el sistema SIEM/SOAR del proyecto EquipoBotRojo. Permite visualizar el estado del sistema de detección de intrusiones, operar los workflows de automatización, consultar alertas y gestionar el estado de las IPs bloqueadas, todo desde una interfaz unificada y profesional.

El sistema consta de:
- **Frontend:** aplicación React + TypeScript + Tailwind CSS, corriendo en `localhost:5173`
- **Backend:** API REST en FastAPI (Python), corriendo en `localhost:8000`
- **Stack existente:** no se modifica — el backend lo consume por IP

---

## 2. Arquitectura
Browser
└── Frontend React (localhost:5173)
└── Backend FastAPI (localhost:8000)
├── PostgreSQL (192.168.100.160:5432)
├── n8n API (192.168.100.160:5678)
├── Prometheus API (192.168.100.160:9090)
└── fail2ban-exporter (192.168.100.160:9121)

El frontend **nunca** llama directamente a las APIs del stack — todo pasa por el backend, que actúa como proxy y capa de seguridad.

---

## 3. Secciones del frontend

### 3.0 Autenticación
Pantalla de login que aparece antes de cualquier sección del dashboard. Muestra un formulario con usuario y contraseña. Al autenticarse correctamente, el backend emite un JWT que el frontend almacena y envía en cada request subsiguiente como header `Authorization: Bearer {token}`. Si el token expira o es inválido, redirige automáticamente al login.

### 3.1 Inicio
Página de bienvenida con presentación del sistema. Debe transmitir profesionalismo y claridad.

Contenido:
- Nombre del sistema y descripción breve
- Listado de tecnologías utilizadas con íconos (Wazuh, n8n, Elasticsearch, Fail2ban, Prometheus, PostgreSQL, Syslog-ng)
- Indicador visual del estado general del sistema (verde/rojo según si los servicios principales responden)
- Botón "Ir al Dashboard"

### 3.2 Dashboard
Vista principal con métricas en tiempo real. Se actualiza automáticamente cada 30 segundos.

Contenido:
- **Tarjetas de estado de contenedores:** un card por cada contenedor relevante mostrando nombre y estado (running/stopped). Contenedores: `n8n`, `fail2ban`, `prometheus`, `alertmanager`, `syslog-ng`, `wazuh-manager`, `wazuh-indexer`, `wazuh-dashboard`, `elasticsearch`, `logstash`, `kibana`, `security-postgres`, `fail2ban-exporter`, `security-pgadmin`
- **Métricas de Prometheus:** IPs baneadas actualmente (`fail2ban_banned_ips`) y estado de fail2ban (`fail2ban_up`)
- **Últimas 5 alertas de PostgreSQL** (tabla `alerts`): timestamp, severidad, categoría, IP origen, risk level
- **Métricas de desempeño (TPW):** último tiempo de procesamiento del workflow principal, promedio de las últimas N ejecuciones, lista de las últimas ejecuciones con duración y estado (éxito/error)

### 3.3 Logs y detección
Herramientas operativas del sistema.

Contenido:
- **Visor de alerts.log:** muestra las últimas 50 líneas del archivo `/home/node/logs/security/alerts` en tiempo real (polling cada 10 segundos). Fondo oscuro, fuente monoespaciada, scroll automático al final
- **Ejecutar workflows:** dos botones separados:
  - "Ejecutar análisis de logs" — dispara el workflow principal de n8n
  - "Ejecutar métricas Prometheus" — dispara el workflow de métricas
  - Cada botón muestra un spinner mientras espera respuesta y un mensaje de éxito/error
- **Inyector de logs de prueba:** selector desplegable con categorías predefinidas y botón "Inyectar". Categorías disponibles:
  - Root Login Attempt — `Failed password for root from 185.220.101.9 port 22 ssh2` (2 logs, desde web-server)
  - SSH Failed Password x12 — `Failed password for admin from 45.33.32.156 port 22 ssh2` (12 logs, desde web-server)
  - Access Denied x7 — `Access denied to /var/www/html/.htpasswd from 54.210.15.20` (7 logs, desde web-server)
  - Port Scan — `SCAN detected SRC=194.165.16.99 DPT=22 DPT=80 DPT=443 DPT=3306 DPT=8080` (2 logs, desde firewall)
  - Iptables DROP x6 — `iptables: DROP IN=eth0 OUT= SRC=45.142.212.100 DST=192.168.1.1 PROTO=TCP DPT=22` (6 logs, desde firewall)
  - Sudo Usage — `db_admin : TTY=pts/0 ; PWD=/home/db_admin ; USER=root ; COMMAND=/bin/bash` (2 logs, desde db-server)
  - Kernel Oops — `Oops: BUG: unable to handle kernel NULL pointer dereference at 0000000000000000` (1 log, desde db-server)
  - Service Restart — `Started MySQL Community Server.` (2 logs, desde db-server)
  - Paquete completo — todos los anteriores combinados
  - Log legítimo — `Accepted password for rafael from 192.168.1.10 port 22 ssh2` (1 log, desde web-server)
  - **Historial de ejecuciones de n8n:** tabla con las últimas 10 ejecuciones del workflow principal mostrando fecha, duración en segundos y estado (éxito/error con badge de color)

### 3.4 Gestión de IPs
Tablas de datos con paginación y lazy loading.

Contenido:
- **Tabla blocked_ips:** columnas: IP, fecha de bloqueo, fecha estimada de desbloqueo, estado (activo/inactivo con badge de color). Paginación de 20 registros por página
   - Cada fila de `blocked_ips` tiene un botón "Desbloquear" que llama a `POST /api/ips/{ip}/unblock` y actualiza `is_active = false` en la BD
- **Tabla attack_patterns:** columnas: IP, tipo de patrón, primera vez visto, última vez visto, cantidad de ocurrencias recientes, bloqueada (sí/no). Paginación de 20 registros por página, ordenada por `last_seen` descendente
- **Tabla system_metrics:** columnas: timestamp, hostname, métrica, valor, unidad. Paginación de 20 registros por página, ordenada por `timestamp` descendente

### 3.5 Tickets
Lista de tickets generados por el sistema.

Contenido:
- Tabla con paginación de 15 por página, ordenada por `created_at` descendente (más recientes primero)
- Columnas: número de ticket, título, categoría, prioridad (badge con color), estado (badge con color), IP origen, risk score, fecha de creación
- Colores de prioridad: critical=rojo, high=naranja, medium=amarillo, low=gris
- Colores de estado: urgent=rojo, open=azul, resolved=verde, closed=gris

### 3.6 Fail2ban
Estado actual de la jail.

Contenido:
- Card con nombre de la jail (`n8n-soar-jail`) y cantidad de IPs baneadas actualmente
- Lista de IPs baneadas actualmente con badge rojo
- Botón de refresh manual
- Timestamp de última actualización

### 3.7 Prometheus
Estado de las alertas de Prometheus.

Contenido:
- Tres cards, una por alerta:
  - `IpBaneadaDetectada` — severidad: critical
  - `Fail2banCaido` — severidad: critical
  - `AtaqueMasivo` — severidad: critical
- Cada card muestra: nombre, estado (FIRING/PENDING/INACTIVE con color rojo/amarillo/verde), valor actual de la métrica, tiempo activo si está en FIRING
- Se actualiza cada 30 segundos

### 3.8 Wazuh
Estado y alertas del agente Wazuh.

Contenido:
- Contador de alertas nativas de Wazuh (FIM, integridad de archivos, etc.) diferenciadas de las alertas que llegan vía n8n
- Nota aclaratoria de que las alertas de seguridad procesadas por n8n se visualizan en la sección Dashboard y Tickets

---

## 4. Backend — Endpoints

### 4.0 Autenticación
```
POST /api/auth/login
Body: { "usuario": "admin", "contraseña": "..." }
Devuelve: { "access_token": "...", "token_type": "bearer" }

Todas las demás rutas requieren header: Authorization: Bearer {token}
Las credenciales se validan contra las variables de entorno DASHBOARD_USER y DASHBOARD_PASSWORD.
```

### 4.1 Contenedores

GET /api/contenedores

Devuelve el estado de cada contenedor relevante consultando el socket de Docker.

Respuesta:
```json
[
  { "nombre": "n8n", "estado": "running" },
  { "nombre": "fail2ban", "estado": "running" }
]
```

### 4.2 Prometheus
GET /api/prometheus/metricas

Consulta `fail2ban_banned_ips` y `fail2ban_up` desde la API de Prometheus.

GET /api/prometheus/alertas

Consulta el estado de las 3 alertas desde `http://PROMETHEUS_URL/api/v1/rules`.

### 4.3 Alertas PostgreSQL

GET /api/alertas?pagina=1&limite=5

Devuelve alertas de la tabla `alerts` ordenadas por `timestamp` descendente.

### 4.4 Logs

GET /api/logs/alerts

Devuelve las últimas 50 líneas del archivo `/home/node/logs/security/alerts`.

### 4.5 Workflows n8n

POST /api/workflows/analisis
Ejecuta el workflow principal de análisis de logs a través de la API REST de n8n.
- **Workflow Target:** `Workflow_fase _3-final`
- **ID:** `IlZkF2tpQcwn5ibI`
- **Request a n8n:** `POST http://N8N_URL/api/v1/workflows/IlZkF2tpQcwn5ibI/run`
- **Header:** `X-N8N-API-KEY: {N8N_API_KEY}`

GET /api/workflows/runs
Devuelve las últimas 10 ejecuciones del workflow principal desde la API de n8n.
- Request a n8n: GET http://N8N_URL/api/v1/executions?workflowId=IlZkF2tpQcwn5ibI&limit=10
- Header: X-N8N-API-KEY: {N8N_API_KEY}
- Respuesta incluye: id, startedAt, stoppedAt, status, duracion_segundos (calculada)

GET /api/metrics/tpw
Obtiene las últimas 10 ejecuciones del workflow principal y calcula el promedio de duración.
- Usa los mismos datos que /api/workflows/runs
- Respuesta: { "promedio_segundos": 1.081, "ultima_ejecucion_segundos": 0.994, "ejecuciones": [...] }

POST /api/workflows/metricas
Ejecuta el workflow de recolección de métricas de Prometheus.
- **Workflow Target:** `Metricas Prometheus`
- **ID:** `S8KYnwHGovQ9pc7G`
- **Request a n8n:** `POST http://N8N_URL/api/v1/workflows/S8KYnwHGovQ9pc7G/run`
- **Header:** `X-N8N-API-KEY: {N8N_API_KEY}`

*(Nota: Otros workflows activos del stack para posibles integraciones: Auto-bloqueo [`mk0m9Wef9tFWpqL4`], Monitor Wazuh [`2FjuAyoNnVKfExpe`], Desbaneo BD [`BOKa87UsdZCW0BOC`], Tickets Automáticos [`B0ZXhvCLkdwUOVKj`]).*

### 4.6 Inyector de logs

POST /api/logs/inyectar
Body: { "categoria": "root_login" }
Ejecuta los comandos `logger` correspondientes a la categoría seleccionada usando el contenedor `web-server`, `db-server` o `firewall` según corresponda.

Categorías válidas: `root_login`, `ssh_failed`, `access_denied`, `port_scan`, `iptables_drop`, `sudo_usage`, `kernel_oops`, `service_restart`, `paquete_completo`, `log_legitimo`

### 4.7 Gestión de IPs

GET /api/ips/bloqueadas?pagina=1&limite=20
Devuelve: id, ip_address, threat_score, reason, blocked_at, blocked_until, is_active

GET /api/ips/patrones?pagina=1&limite=20
Devuelve: id, pattern_type, source_ip, target_host, first_seen, last_seen, occurrence_count, recent_count, is_blocked

GET /api/ips/metricas?pagina=1&limite=20
Devuelve: id, timestamp, hostname, metric_name, metric_value, unit

POST /api/ips/{ip}/unban
Desbanea una IP ejecutando el comando de fail2ban. El resto del flujo (actualización de BD) lo maneja automáticamente fail2ban a través del webhook de desbaneo configurado en actionunban.
- Ejecuta: `docker exec fail2ban fail2ban-client set n8n-soar-jail unbanip {ip}`
- No modifica PostgreSQL directamente — eso lo hace el workflow "Anotar desbaneo en BD" (ID: BOKa87UsdZCW0BOC) que fail2ban dispara automáticamente
- Respuesta: { "mensaje": "IP {ip} desbaneada correctamente" }
- Error si la IP no está baneada: 404

### 4.8 Tickets

GET /api/tickets?pagina=1&limite=15
Devuelve: id, ticket_number, title, description, status, priority, category, source_ip, threat_score, assigned_to, created_at, updated_at, alert_reference

### 4.9 Fail2ban

GET /api/fail2ban/estado

Ejecuta `docker exec fail2ban fail2ban-client status n8n-soar-jail` y parsea el resultado.

### 4.10 Wazuh
```
GET /api/wazuh/alerts/count
Consulta la API de Wazuh para obtener el conteo de alertas nativas (FIM, integridad, etc.).
- Requiere credenciales de Wazuh definidas en variables de entorno: WAZUH_URL, WAZUH_USER, WAZUH_PASSWORD
- Endpoint Wazuh: GET https://WAZUH_URL:55000/alerts?limit=1 (para obtener el total)
```
---

## 5. Modelos de datos relevantes (PostgreSQL)

```sql
-- Alertas
alerts (id, timestamp, severity, category, source_host, source_ip, target_host, event_count, description, raw_log, status, assigned_to, notes, resolved_at, risk_score, risk_level, threat_reputation, threat_intel)

-- Patrones de ataque
attack_patterns (id, pattern_type, source_ip, target_host, first_seen, last_seen, occurrence_count, is_blocked, recent_count, window_start)

-- Métricas del sistema
system_metrics (id, timestamp, hostname, metric_name, metric_value, unit)

-- IPs bloqueadas
blocked_ips (id, ip_address, threat_score, reason, blocked_at, blocked_until, is_active)

-- Tickets
security_tickets (id, ticket_number, title, description, status, priority, category, source_ip, threat_score, assigned_to, created_at, updated_at, alert_reference → alerts.id)
```

---

## 6. Diseño visual

- **Paleta:** fondo oscuro (`#0f172a`), cards con `#1e293b`, acentos en azul (`#3b82f6`) y rojo (`#ef4444`)
- **Tipografía:** Inter para texto general, JetBrains Mono para logs y datos técnicos
- **Estilo general:** profesional, tipo SOC (Security Operations Center) — sin elementos decorativos innecesarios
- **Sidebar:** navegación lateral fija con íconos y labels para cada sección
- **Responsive:** mínimo funcional en 1280px de ancho

### Variables de entorno adicionales — Backend
```
DASHBOARD_USER=admin
DASHBOARD_PASSWORD=<completar>
JWT_SECRET=<completar>
FRONTEND_ORIGIN=http://localhost:5173
WAZUH_URL=https://192.168.100.160
WAZUH_USER=admin
WAZUH_PASSWORD=Admin1234!
```
---

## 7. Decisiones pendientes

- [ ] Confirmar si el frontend y backend van en el mismo repositorio o separados (pendiente reunión con el profesor)
- [ ] Confirmar schema exacto de la tabla `blocked_ips` y `security_tickets`
- [ ] Confirmar si se necesita autenticación en el panel
- [ ] Confirmar tiempo de expiración del JWT (sugerido: 8 horas)
- [ ] Confirmar si el endpoint de Wazuh es accesible desde el backend sin certificado válido (probable que requiera verify=False en httpx)

---

## 8. Lo que NO entra en el scope

- Autenticación de usuarios (no requerida por el proyecto)
- Edición de reglas de detección desde el panel
- Modificación de workflows de n8n desde el panel
- Historiales de más de 30 días