## Arquitectura

El cambio implementa un servicio de integración con n8n (`n8n_service.py`) consumido por los routers `workflows.py` y `metrics.py`. No se modifican capacidades existentes, solo se implementan los stubs.

```
┌─────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Frontend   │────▶│  workflows.py    │────▶│  n8n_service.py  │
│  (React)    │     │  (router)        │     │                  │
└─────────────┘     └──────────────────┘     └────────┬─────────┘
                                                       │ httpx
                                                       ▼
                                                ┌─────────────┐
                                                │  n8n API    │
                                                │  (REST)     │
                                                └─────────────┘
```

## Decisiones de diseño

### 1. Servicio separado del router

`n8n_service.py` encapsula toda la lógica de comunicación con n8n. Los routers solo orquestan: llaman al servicio, manejan excepciones, y retornan la respuesta HTTP.

### 2. Cliente httpx con timeout configurable

Se usa `httpx.AsyncClient` con timeout de 10 segundos (n8n puede tardar más que Prometheus al ejecutar workflows).

### 3. IDs de workflows como constantes

Los IDs de los workflows se definen como constantes en el servicio:

```python
WORKFLOW_PRINCIPAL_ID = "IlZkF2tpQcwn5ibI"
WORKFLOW_METRICAS_ID = "S8KYnwHGovQ9pc7G"
```

### 4. Endpoints de n8n

| Operación | Método n8n | URL |
|-----------|-----------|-----|
| Ejecutar workflow | POST | `{N8N_URL}/api/v1/workflows/{id}/run` |
| Historial de ejecuciones | GET | `{N8N_URL}/api/v1/executions?workflowId={id}&limit={limit}` |

Header en ambas: `X-N8N-API-KEY: {N8N_API_KEY}`.

### 5. Métricas TPW

El endpoint `GET /api/metrics/tpw` reutiliza la función `obtener_historial_ejecuciones()` del servicio n8n para calcular:
- `promedio_segundos`: promedio de duración de las ejecuciones
- `ultima_ejecucion_segundos`: duración de la ejecución más reciente
- `ejecuciones`: lista completa de ejecuciones

### 6. Estrategia de errores

| Excepción del servicio | Código HTTP | Mensaje |
|------------------------|-------------|---------|
| `N8nConnectionError` | 503 | No se pudo conectar con n8n |
| `N8nTimeoutError` | 504 | Timeout al consultar n8n |
| `N8nResponseError` | 502 | Respuesta inesperada de n8n |

### 7. Autenticación

Todos los endpoints usan `Depends(usuario_actual)` (patrón existente).

## Archivos a modificar

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `backend/services/n8n_service.py` | Modificar | Implementar funciones de ejecución y consulta de workflows |
| `backend/routers/workflows.py` | Modificar | Implementar endpoints main/run, metrics/run, runs |
| `backend/routers/metrics.py` | Modificar | Implementar endpoint /api/metrics/tpw |
| `backend/schemas/workflows.py` | Modificar | Actualizar schema de ejecución para coincidir con API n8n |

## Dependencias

- `httpx` — ya en `requirements.txt`
- No se agregan dependencias nuevas.

## Variables de entorno

- `N8N_URL` — ya existe en `config.py`
- `N8N_API_KEY` — ya existe en `config.py`
