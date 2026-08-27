## Por qué

El dashboard SIEM necesita mostrar el estado de las alertas de Prometheus y las métricas de Fail2ban para que el operador tenga visibilidad en tiempo real del estado de seguridad del stack. Actualmente los endpoints existentes en `backend/routers/prometheus.py` y `backend/services/prometheus_service.py` son stubs que retornan "no implementado".

## Qué cambia

- Implementar `GET /api/prometheus/alerts` que consulta la API de Prometheus (`/api/v1/rules`) y retorna el estado de 3 alertas: `IpBaneadaDetectada`, `Fail2banCaido`, `AtaqueMasivo`.
- Implementar lógica en `prometheus_service.py` para consultar métricas instantáneas de Fail2ban (`fail2ban_banned_ips`, `fail2ban_up`) vía `/api/v1/query` de Prometheus.
- Integrar las métricas de Fail2ban en el endpoint `/api/prometheus/alerts` o endpoint(s) complementario(s) según diseño.
- Manejo de errores explícito en español para fallos de conexión con Prometheus, respuestas inválidas, etc.

## Capacidades

### Nuevas
- `metricas-prometheus`: Endpoint `GET /api/prometheus/alerts` + servicio `prometheus_service.py` para consultar la API de Prometheus.

### Modificadas
- Ninguna capacidad existente es modificada.

## Alcance

### Incluido
- Implementación del servicio de Prometheus con httpx.
- Endpoint `GET /api/prometheus/alerts` con autenticación JWT.
- Mapeo de las 3 alertas a formato de respuesta del dashboard.
- Consulta de métricas de Fail2ban (`fail2ban_banned_ips`, `fail2ban_up`) vía Prometheus.
- Manejo de errores (timeout, conexión fallida, respuesta inesperada).

### No-alcance
- No se implementa el endpoint `GET /api/metrics/tpw` (pertenece a otro cambio).
- No se modifica la configuración de Prometheus ni de los exporters.
- No se consumen métricas de `fail2ban-exporter` directamente (siempre se pasa por Prometheus).
- No se crean dashboards de Grafana ni se modifica stack existente.
- No se agregan métricas adicionales a las 3 alertas definidas.

## Impacto

- **Archivos modificados**: `backend/routers/prometheus.py`, `backend/services/prometheus_service.py`.
- **Dependencias**: `httpx` (ya en requirements.txt), no se agregan dependencias nuevas.
- **Variables de entorno**: `PROMETHEUS_URL` (ya existente en `config.py`).
- **API expuesta**: `GET /api/prometheus/alerts` (requiere JWT).
- **Riesgo**: Bajo — es un endpoint de lectura contra API externa, no modifica datos.
