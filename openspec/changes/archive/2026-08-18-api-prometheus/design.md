## Arquitectura

El cambio implementa un servicio de consultas a Prometheus (`prometheus_service.py`) consumido por el router existente (`prometheus.py`). No se modifican capacidades existentes, solo se implementan los stubs.

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│  Frontend   │────▶│  prometheus.py   │────▶│  prometheus  │
│  (React)    │     │  (router)        │     │  _service.py │
└─────────────┘     └──────────────────┘     └──────┬──────┘
                                                     │ httpx
                                                     ▼
                                              ┌─────────────┐
                                              │  Prometheus  │
                                              │  API         │
                                              └─────────────┘
```

## Decisiones de diseño

### 1. Servicio separado del router

`prometheus_service.py` encapsula toda la lógica de comunicación con Prometheus. El router solo orquesta: llama al servicio, maneja excepciones del servicio, y retorna la respuesta HTTP. Esto mantiene la separación de responsabilidades y facilita testing futuro.

### 2. Cliente httpx con timeout configurable

Se usa `httpx.AsyncClient` (o `httpx.Client` según el patrón del proyecto) con timeout de 5 segundos. Si el proyecto usa FastAPI async, se prefiere `httpx.AsyncClient` para no bloquear el event loop.

**Decisión pendiente**: Verificar si el proyecto usa `async` en los routers existentes. Si sí, usar `httpx.AsyncClient`. Si no, usar `httpx.Client` síncrono con dependencias FastAPI.

### 3. Mapeo de alertas

Las 3 alertas se definen como constante en el servicio:

```python
ALERTAS_ESPERADAS = {
    "IpBaneadaDetectada": "IP baneada detectada por Fail2ban",
    "Fail2banCaido": "Fail2ban no está activo",
    "AtaqueMasivo": "Ataque masivo detectado",
}
```

Se busca cada alerta en la respuesta de `/api/v1/rules`. Si no existe en la respuesta, se retorna con `estado: "no_configurada"`.

### 4. Consulta de métricas Fail2ban

Se realizan 2 queries instantáneas (`/api/v1/query`) en paralelo o secuencial:
- `fail2ban_banned_ips` → cantidad de IPs baneadas
- `fail2ban_up` → estado de Fail2ban (1/0)

Se usa `PROMETHEUS_URL/api/v1/query?query=<metrica>`.

### 5. Estrategia de errores

Cada función del servicio lanza excepciones específicas que el router captura y traduce a códigos HTTP:

| Excepción del servicio | Código HTTP | Mensaje |
|------------------------|-------------|---------|
| `PrometheusConnectionError` | 503 | No se pudo conectar con Prometheus |
| `PrometheusTimeoutError` | 504 | Timeout al consultar Prometheus |
| `PrometheusResponseError` | 502 | Respuesta inesperada de Prometheus |

### 6. Autenticación

El endpoint usa `Depends(usuario_actual)` (patrón existente en otros routers) para requerir JWT válido.

## Archivos a modificar

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `backend/services/prometheus_service.py` | Modificar | Implementar funciones de consulta a Prometheus |
| `backend/routers/prometheus.py` | Modificar | Implementar endpoint `/api/prometheus/alerts` |

## Dependencias

- `httpx` — ya en `requirements.txt`
- `fastapi` — ya en `requirements.txt`
- No se agregan dependencias nuevas.

## Variables de entorno

- `PROMETHEUS_URL` — ya existe en `config.py`, se usa tal cual.

## Patrones existentes a seguir

- Manejo de errores con `try/except` y `HTTPException` en el router.
- Servicios en archivos separados bajo `backend/services/`.
- Constantes de configuración en `backend/config.py`.
- Todos los mensajes de error en español.
