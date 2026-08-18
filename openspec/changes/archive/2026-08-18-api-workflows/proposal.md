## Por qué

El dashboard SIEM necesita poder ejecutar y monitorear los workflows de n8n (análisis de logs y métricas de Prometheus) y visualizar las métricas de desempeño TPW (Time Per Workflow). Actualmente los endpoints en `backend/routers/workflows.py` son stubs que retornan "no implementado", y el servicio `n8n_service.py` retorna datos vacíos.

## Qué cambia

- Implementar `POST /api/workflows/main/run` que ejecuta el workflow principal de n8n (`IlZkF2tpQcwn5ibI`).
- Implementar `POST /api/workflows/metrics/run` que ejecuta el workflow de métricas de Prometheus (`S8KYnwHGovQ9pc7G`).
- Implementar `GET /api/workflows/runs` que consulta el historial de últimas ejecuciones del workflow principal.
- Implementar `GET /api/metrics/tpw` que calcula métricas de desempeño (promedio, última ejecución) a partir del historial.
- Crear servicio `n8n_service.py` con httpx para comunicarse con la API de n8n.
- Manejo de errores explícito en español para fallos de conexión con n8n.

## Capacidades

### Nuevas
- `api-workflows`: Endpoints de ejecución y monitoreo de workflows n8n + métricas TPW.

### Modificadas
- Ninguna capacidad existente es modificada.

## Alcance

### Incluido
- Implementación del servicio `n8n_service.py` con httpx.AsyncClient.
- Endpoints `POST /api/workflows/main/run`, `POST /api/workflows/metrics/run`, `GET /api/workflows/runs` con autenticación JWT.
- Endpoint `GET /api/metrics/tpw` con autenticación JWT.
- Consultas a la API de n8n con header `X-N8N-API-KEY`.
- Cálculo de métricas TPW (promedio, última ejecución).
- Manejo de errores (timeout, conexión fallida, respuesta inesperada).

### No-alcance
- No se modifica la configuración de n8n ni los workflows existentes.
- No se implementa frontend para estos endpoints (pertenece a CH14/CH15).
- No se agregan dependencias nuevas (httpx ya está en requirements.txt).

## Impacto

- **Archivos modificados**: `backend/services/n8n_service.py`, `backend/routers/workflows.py`, `backend/routers/metrics.py`, `backend/schemas/workflows.py`.
- **Dependencias**: `httpx` (ya en requirements.txt), no se agregan dependencias nuevas.
- **Variables de entorno**: `N8N_URL`, `N8N_API_KEY` (ya existentes en `config.py`).
- **API expuesta**: `POST /api/workflows/main/run`, `POST /api/workflows/metrics/run`, `GET /api/workflows/runs`, `GET /api/metrics/tpw` (requieren JWT).
- **Riesgo**: Bajo — son endpoints de lectura/escritura contra API externa, no modifican datos locales.
