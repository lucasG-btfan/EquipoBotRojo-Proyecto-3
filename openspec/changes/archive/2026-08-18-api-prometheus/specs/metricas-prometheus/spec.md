## ADDED Requirements

### Requirement: Endpoint de alertas y métricas Prometheus

El endpoint `GET /api/prometheus/alerts` SHALL retornar el estado de las 3 alertas de Prometheus y las métricas de Fail2ban.

#### Scenario: Consulta exitosa

- **Given** que el usuario está autenticado con un token JWT válido
- **When** realiza `GET /api/prometheus/alerts`
- **Then** el backend SHALL consultar la API de Prometheus para obtener el estado de las 3 alertas y métricas de Fail2ban
- **And** retorna HTTP 200 con la estructura: `alertas` (array de 3 objetos), `fail2ban` (objeto con `banned_ips` y `up`), `ultima_actualizacion` (timestamp ISO 8601)

### Requirement: Las 3 alertas siempre presentes

El sistema SHALL incluir siempre en la respuesta las 3 alertas definidas, sin importar si existen o no en Prometheus.

#### Scenario: Alerta existente en Prometheus

- **Given** que la alerta `IpBaneadaDetectada` existe en Prometheus con estado `firing`
- **When** se procesa la respuesta de `/api/v1/rules`
- **Then** la alerta se retorna con `estado: "firing"`

#### Scenario: Alerta no encontrada en Prometheus

- **Given** que la alerta `AtaqueMasivo` no existe en la configuración de Prometheus
- **When** se procesa la respuesta de `/api/v1/rules`
- **Then** la alerta se retorna con `estado: "no_configurada"`

### Requirement: Métricas de Fail2ban vía Prometheus

Las métricas de Fail2ban SHALL obtenerse consultando la API de Prometheus, nunca directamente del exporter.

#### Scenario: Consulta de métricas

- **Given** que se ejecuta el endpoint
- **When** se consultan las métricas de Fail2ban
- **Then** se SHALL realizar queries instantáneas a `PROMETHEUS_URL/api/v1/query` para `fail2ban_banned_ips` y `fail2ban_up`
- **And** los valores se incluyen en `fail2ban.banned_ips` y `fail2ban.up` de la respuesta

### Requirement: Manejo de errores de conexión

El endpoint SHALL manejar errores de conexión con Prometheus de forma explícita con códigos HTTP apropiados.

#### Scenario: Prometheus no accesible

- **Given** que Prometheus no está accesible
- **When** se intenta consultar la API de Prometheus
- **Then** el endpoint SHALL retornar HTTP 503 con mensaje de error en español

#### Scenario: Timeout de conexión

- **Given** que Prometheus tarda más de 5 segundos en responder
- **When** se agota el timeout de httpx
- **Then** el endpoint SHALL retornar HTTP 504 con mensaje de timeout en español

#### Scenario: Respuesta inesperada

- **Given** que Prometheus retorna un JSON con formato inesperado
- **When** se procesa la respuesta
- **Then** el endpoint SHALL retornar HTTP 502 con mensaje de error en español

### Requirement: Autenticación JWT requerida

El endpoint SHALL requerir autenticación JWT válida para acceder.

#### Scenario: Sin token de autenticación

- **Given** que el request no incluye header `Authorization`
- **When** se consulta `GET /api/prometheus/alerts`
- **Then** el middleware SHALL retornar HTTP 401
