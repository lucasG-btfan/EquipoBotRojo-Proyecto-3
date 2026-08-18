## Tareas

### Tarea 1: Implementar servicio de Prometheus (`prometheus_service.py`) ✅

**Descripción**: Reemplazar los stubs de `backend/services/prometheus_service.py` con la implementación real de consultas a la API de Prometheus usando httpx.

**Subtareas**:
1.1 Definir excepciones personalizadas: `PrometheusConnectionError`, `PrometheusTimeoutError`, `PrometheusResponseError`.
1.2 Implementar función `_consultar_prometheus(endpoint, params)` como wrapper de httpx con timeout de 5s y manejo de errores.
1.3 Implementar `obtener_estado_alertas()` que consulta `/api/v1/rules` y mapea las 3 alertas (`IpBaneadaDetectada`, `Fail2banCaido`, `AtaqueMasivo`).
1.4 Implementar `obtener_metricas_fail2ban()` que consulta `/api/v1/query` para `fail2ban_banned_ips` y `fail2ban_up`.
1.5 Implementar `obtener_alertas_completas()` que orquesta ambas llamadas y retorna el dict con `alertas`, `fail2ban` y `ultima_actualizacion`.

**Criterios de aceptación**:
- Cada función tiene manejo de errores con las excepciones personalizadas.
- Timeout de 5 segundos configurado en httpx.
- Las 3 alertas siempre aparecen en la respuesta (con `"no_configurada"` si no existen).
- Las métricas de Fail2ban se obtienen vía Prometheus, no directamente del exporter.
- Todos los mensajes de error en español.

**Archivos**: `backend/services/prometheus_service.py`

**Tiempo estimado**: 1.5 horas

---

### Tarea 2: Implementar endpoint `/api/prometheus/alerts` (`prometheus.py`) ✅

**Descripción**: Reemplazar el stub del endpoint `GET /api/prometheus/alerts` en `backend/routers/prometheus.py` para que llame al servicio implementado y retorne la respuesta formateada.

**Subtareas**:
2.1 Importar `obtener_alertas_completas` desde `prometheus_service`.
2.2 Implementar el endpoint `GET /api/prometheus/alerts` con `Depends(usuario_actual)`.
2.3 Capturar excepciones del servicio y retornar códigos HTTP correspondientes (503, 504, 502).
2.4 Asegurar que el stub de `/api/metrics/tpw` NO se modifique (pertenece a otro cambio).

**Criterios de aceptación**:
- Endpoint retorna HTTP 200 con formato `{"alertas": [...], "fail2ban": {...}, "ultima_actualizacion": "..."}`.
- Requiere JWT válido (Depends(usuario_actual)).
- Errores de conexión → 503, timeout → 504, respuesta inesperada → 502.
- No se modifica el stub de `/api/metrics/tpw`.

**Archivos**: `backend/routers/prometheus.py`

**Tiempo estimado**: 0.5 horas

---

### Tarea 3: Verificación de integración ✅

**Descripción**: Verificar que el endpoint funciona correctamente con el backend levantado y que no se rompieron endpoints existentes.

**Subtareas**:
3.1 Verificar que el servidor FastAPI arranca sin errores de importación.
3.2 Probar `GET /api/prometheus/alerts` con token JWT válido contra Prometheus mockado o real.
3.3 Probar comportamiento cuando Prometheus no está accesible (verificar código 503).
3.4 Verificar que el stub de `/api/metrics/tpw` sigue funcionando igual.

**Criterios de aceptación**:
- El servidor arranca sin errores.
- El endpoint retorna la estructura correcta.
- El manejo de errores funciona según lo especificado.
- No se rompieron endpoints existentes.

**Tiempo estimado**: 0.5 horas

---

## Orden de ejecución

```
Tarea 1 (servicio) → Tarea 2 (router) → Tarea 3 (verificación)
```

Las tareas son secuenciales porque cada una depende de la anterior.

## Dependencias

| Tarea | Depende de |
|-------|-----------|
| Tarea 1 | Ninguna |
| Tarea 2 | Tarea 1 |
| Tarea 3 | Tarea 2 |

## Notas

- La Tarea 3 puede ejecutarse manualmente con `curl` o `httpie` contra el backend levantado.
- No se crean tests automatizados (regla del proyecto: solo si se piden explícitamente).
- El timeout de 5 segundos para Prometheus es una decisión de diseño que puede ajustarse si se necesita más tiempo en entornos de red lenta.
