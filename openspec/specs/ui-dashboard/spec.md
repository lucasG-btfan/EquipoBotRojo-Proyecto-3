## ADDED Requirements

### Requirement: Dashboard principal con métricas en tiempo real
La página DashboardPage SHALL reemplazar el stub Placeholder con una vista completa que muestra métricas en tiempo real del sistema SIEM, organizada en 4 secciones: KPIs, contenedores, alertas y TPW.

#### Scenario: Carga inicial del dashboard
- **WHEN** el usuario autenticado navega a `/dashboard/panel`
- **THEN** se muestran 4 tarjetas KPI (contenedores activos, IPs baneadas, estado fail2ban, último TPW) y las secciones muestran spinner de carga

#### Scenario: Datos se renderizan después de carga
- **WHEN** los 4 polls retornan datos exitosamente
- **THEN** cada sección muestra los datos recibidos en sus componentes correspondientes

### Requirement: Tarjetas KPI resumen
La página SHALL mostrar 4 tarjetas de resumen en la fila superior: contenedores activos (N/M total), IPs baneadas, estado de fail2ban (activo/caído), y último tiempo de ejecución TPW.

#### Scenario: KPI de contenedores activos
- **WHEN** el poll de contenedores retorna datos
- **THEN** se muestra la cantidad de contenedores en estado "running" sobre el total

#### Scenario: KPI de IPs baneadas
- **WHEN** el poll de Prometheus retorna datos
- **THEN** se muestra el valor de `fail2ban.banned_ips`

#### Scenario: KPI de estado fail2ban
- **WHEN** el poll de Prometheus retorna datos
- **THEN** se muestra "Activo" si `fail2ban.up` es 1, o "Caído" si es 0

#### Scenario: KPI de último TPW
- **WHEN** el poll de TPW retorna datos
- **THEN** se muestra el valor de `ultima_ejecucion_segundos`

### Requirement: Grid de estado de contenedores
La página SHALL mostrar un grid de cards, una por cada contenedor del stack, con nombre y badge de estado.

#### Scenario: Cards de contenedores
- **WHEN** el poll de contenedores (`GET /api/status/containers`) retorna la lista
- **THEN** se renderiza una card por cada contenedor mostrando su nombre

#### Scenario: Badge de estado activo
- **WHEN** un contenedor tiene `estado` igual a "running"
- **THEN** su card muestra un badge "Activo" con variante `exito`

#### Scenario: Badge de estado detenido
- **WHEN** un contenedor tiene `estado` distinto de "running"
- **THEN** su card muestra un badge "Detenido" con variante `peligro`

### Requirement: Tabla de últimas alertas
La página SHALL mostrar una tabla con las últimas 5 alertas de PostgreSQL con timestamp, severidad, categoría, IP origen y risk level.

#### Scenario: Alertas recientes se muestran
- **WHEN** el poll de alertas (`GET /api/alerts/recent?limit=5`) retorna datos
- **THEN** se renderiza una tabla con hasta 5 filas

#### Scenario: Columnas de la tabla de alertas
- **WHEN** se renderiza una fila de alerta
- **THEN** muestra: timestamp formateado, severidad (badge con color), categoría, source_ip, risk_level

#### Scenario: Sin alertas
- **WHEN** el endpoint retorna 0 alertas
- **THEN** se muestra "Sin datos para mostrar"

### Requirement: Métricas de desempeño TPW
La página SHALL mostrar las métricas de TPW: último tiempo, promedio y lista de últimas ejecuciones con duración y estado.

#### Scenario: TPW se muestra correctamente
- **WHEN** el poll de TPW (`GET /api/metrics/tpw`) retorna datos
- **THEN** se muestra el último tiempo (`ultima_ejecucion_segundos`), el promedio (`promedio_segundos`) y la lista de ejecuciones

#### Scenario: Badge de estado en ejecuciones
- **WHEN** se renderiza una ejecución en el historial de TPW
- **THEN** la ejecución muestra su duración en segundos y un badge de estado (éxito/error)

### Requirement: Polling con intervalos configurables
La página SHALL usar 4 polls independientes con intervalos definidos en `INTERVALOS_POLLING`: contenedores cada 10s (`METRICAS_SISTEMA`), Prometheus cada 30s (`PROMETHEUS`), alertas cada 30s (`DASHBOARD`), TPW cada 30s (`DASHBOARD`).

#### Scenario: Contenedores se actualizan cada 10 segundos
- **WHEN** la página está abierta
- **THEN** el poll de contenedores se ejecuta cada 10 segundos

#### Scenario: El resto se actualiza cada 30 segundos
- **WHEN** la página está abierta
- **THEN** los polls de Prometheus, alertas y TPW se ejecutan cada 30 segundos

### Requirement: Manejo de errores en español
La página SHALL mostrar mensajes de error en español cuando un endpoint falle, y el polling debe continuar intentando.

#### Scenario: Error en una sección
- **WHEN** un endpoint retorna error
- **THEN** la sección correspondiente muestra un mensaje de error en español
- **Y** el polling continúa en el siguiente intervalo

#### Scenario: Datos vacíos
- **WHEN** un endpoint retorna array vacío o null
- **THEN** la sección muestra "Sin datos para mostrar"
