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
- **Tarjetas de estado de contenedores:** un card por cada contenedor relevante mostrando nombre y estado (running/stopped). Contenedores: `n8n`, `fail2ban`, `prometheus`, `alertmanager`, `syslog-ng`, `wazuh-manager`, `elasticsearch`, `logstash`, `kibana`, `security-postgres`, `fail2ban-exporter`
- **Métricas de Prometheus:** IPs baneadas actualmente (`fail2ban_banned_ips`) y estado de fail2ban (`fail2ban_up`)
- **Últimas 5 alertas de PostgreSQL** (tabla `alerts`): timestamp, severidad, categoría, IP origen, risk level

### 3.3 Logs y detección
Herramientas operativas del sistema.

Contenido:
- **Visor de alerts.log:** muestra las últimas 50 líneas del archivo `/home/node/logs/security/alerts` en tiempo real (polling cada 10 segundos). Fondo oscuro, fuente monoespaciada, scroll automático al final
- **Ejecutar workflows:** dos botones separados:
  - "Ejecutar análisis de logs" — dispara el workflow principal de n8n
  - "Ejecutar métricas Prometheus" — dispara el workflow de métricas
  - Cada botón muestra un spinner mientras espera respuesta y un mensaje de éxito/error
- **Inyector de logs de prueba:** selector desplegable con categorías predefinidas y botón "Inyectar". Categorías disponibles:
  - Root Login Attempt (185.220.101.9)
  - SSH Failed Password x12 (45.33.32.156)
  - Access Denied x7 (54.210.15.20)
  - Port Scan (194.165.16.99)
  - Iptables DROP x6 (45.142.212.100)
  - Sudo Usage (db_admin)
  - Kernel Oops
  - Service Restart
  - Paquete completo (todos los anteriores)
  - Log legítimo (sin amenaza)

### 3.4 Gestión de IPs
Tablas de datos con paginación y lazy loading.

Contenido:
- **Tabla blocked_ips:** columnas: IP, fecha de bloqueo, fecha estimada de desbloqueo, estado (activo/inactivo con badge de color). Paginación de 20 registros por página
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

---

## 4. Backend — Endpoints

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

Ejecuta el workflow principal de n8n via API REST.

POST /api/workflows/metricas

Ejecuta el workflow de métricas de Prometheus via API REST.

### 4.6 Inyector de logs

POST /api/logs/inyectar
Body: { "categoria": "root_login" }
Ejecuta los comandos `logger` correspondientes a la categoría seleccionada usando el contenedor `web-server`, `db-server` o `firewall` según corresponda.

Categorías válidas: `root_login`, `ssh_failed`, `access_denied`, `port_scan`, `iptables_drop`, `sudo_usage`, `kernel_oops`, `service_restart`, `paquete_completo`, `log_legitimo`

### 4.7 Gestión de IPs

GET /api/ips/bloqueadas?pagina=1&limite=20
GET /api/ips/patrones?pagina=1&limite=20
GET /api/ips/metricas?pagina=1&limite=20


### 4.8 Tickets

GET /api/tickets?pagina=1&limite=15

Devuelve tickets de la tabla `security_tickets` ordenados por `created_at` descendente.

### 4.9 Fail2ban

GET /api/fail2ban/estado

Ejecuta `docker exec fail2ban fail2ban-client status n8n-soar-jail` y parsea el resultado.

---

## 5. Modelos de datos relevantes (PostgreSQL)

```sql
-- Tabla principal de alertas
alerts (id, timestamp, severity, category, source_ip, risk_score, risk_level, threat_reputation, description, raw_log, status)

-- Patrones de ataque acumulados
attack_patterns (id, pattern_type, source_ip, first_seen, last_seen, occurrence_count, recent_count, is_blocked)

-- Métricas del sistema
system_metrics (id, timestamp, hostname, metric_name, metric_value, unit)

-- Tickets generados
security_tickets (id, ticket_number, title, category, priority, status, source_ip, threat_score, assigned_to, created_at)

-- IPs bloqueadas
blocked_ips (id, ip_address, blocked_at, blocked_until, is_active, jail_type)
```

---

## 6. Diseño visual

- **Paleta:** fondo oscuro (`#0f172a`), cards con `#1e293b`, acentos en azul (`#3b82f6`) y rojo (`#ef4444`)
- **Tipografía:** Inter para texto general, JetBrains Mono para logs y datos técnicos
- **Estilo general:** profesional, tipo SOC (Security Operations Center) — sin elementos decorativos innecesarios
- **Sidebar:** navegación lateral fija con íconos y labels para cada sección
- **Responsive:** mínimo funcional en 1280px de ancho

---

## 7. Decisiones pendientes

- [ ] Confirmar si el frontend y backend van en el mismo repositorio o separados (pendiente reunión con el profesor)
- [ ] Confirmar IDs exactos de los workflows de n8n para los endpoints de ejecución
- [ ] Confirmar schema exacto de la tabla `blocked_ips` y `security_tickets`
- [ ] Confirmar si se necesita autenticación en el panel

---

## 8. Lo que NO entra en el scope

- Autenticación de usuarios (no requerida por el proyecto)
- Edición de reglas de detección desde el panel
- Modificación de workflows de n8n desde el panel
- Historiales de más de 30 días