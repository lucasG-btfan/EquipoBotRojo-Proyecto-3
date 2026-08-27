## Tareas

- [x] Tarea 1: Implementar servicio n8n (`n8n_service.py`)

**Descripción**: Reemplazar los stubs de `backend/services/n8n_service.py` con la implementación real de comunicación con la API de n8n usando httpx.

**Subtareas**:
1.1 Definir excepciones personalizadas: `N8nConnectionError`, `N8nTimeoutError`, `N8nResponseError`.
1.2 Definir constantes: `WORKFLOW_PRINCIPAL_ID`, `WORKFLOW_METRICAS_ID`, `TIMEOUT_N8N`.
1.3 Implementar función `_consultar_n8n(metodo, endpoint, datos)` como wrapper de httpx con timeout de 10s.
1.4 Implementar `ejecutar_workflow(workflow_id)` que hace POST a `/api/v1/workflows/{id}/run`.
1.5 Implementar `obtener_historial_ejecuciones(workflow_id, limite)` que hace GET a `/api/v1/executions`.
1.6 Implementar funciones de conveniencia: `ejecutar_workflow_principal()`, `ejecutar_workflow_metricas()`, `obtener_historial_principal()`.

**Criterios de aceptación**:
- Cada función tiene manejo de errores con las excepciones personalizadas.
- Timeout de 10 segundos configurado en httpx.
- Header `X-N8N-API-KEY` se envía en cada request.
- Todos los mensajes de error en español.

**Archivos**: `backend/services/n8n_service.py`

---

- [x] Tarea 2: Actualizar schemas de workflows

**Descripción**: Actualizar `backend/schemas/workflows.py` con los schemas correctos para las respuestas de ejecución e historial de n8n.

**Subtareas**:
2.1 Crear `EjecucionWorkflowSchema` con campos: `id`, `startedAt`, `stoppedAt`, `status`, `duracion_segundos`.
2.2 Crear `HistorialWorkflowSchema` con campos: `ejecuciones` (lista) y `total`.
2.3 Crear `MetricasTPWSchema` con campos: `promedio_segundos`, `ultima_ejecucion_segundos`, `ejecuciones`.

**Criterios de aceptación**:
- Los schemas coinciden con la estructura que retorna la API de n8n.
- Usar `datetime` para timestamps.
- Campo `duracion_segundos` calculado como diferencia entre `stoppedAt` y `startedAt`.

**Archivos**: `backend/schemas/workflows.py`

---

- [x] Tarea 3: Implementar endpoints del router `workflows.py`

**Descripción**: Reemplazar los stubs de `backend/routers/workflows.py` con la implementación real que llama al servicio n8n.

**Subtareas**:
3.1 Implementar `POST /api/workflows/main/run` que llama `ejecutar_workflow_principal()`.
3.2 Implementar `POST /api/workflows/metrics/run` que llama `ejecutar_workflow_metricas()`.
3.3 Implementar `GET /api/workflows/runs` con query param `?limit=10` que llama `obtener_historial_principal()`.
3.4 Capturar excepciones del servicio y retornar códigos HTTP correspondientes (503, 504, 502).

**Criterios de aceptación**:
- Cada endpoint retorna HTTP 200 con la estructura correcta.
- Requieren JWT válido (Depends(usuario_actual)).
- Errores de conexión → 503, timeout → 504, respuesta inesperada → 502.
- POST retorna `{"mensaje": "...", "execution_id": "..."}`.
- GET retorna lista de ejecuciones con duración calculada.

**Archivos**: `backend/routers/workflows.py`

---

- [x] Tarea 4: Implementar endpoint `/api/metrics/tpw`

**Descripción**: Reemplazar el stub de `GET /api/metrics/tpw` en `backend/routers/prometheus.py` para que calcule métricas TPW a partir del historial de n8n.

**Subtareas**:
4.1 Importar función de historial desde `n8n_service`.
4.2 Calcular `promedio_segundos` y `ultima_ejecucion_segundos` a partir de las ejecuciones.
4.3 Retornar dict con `promedio_segundos`, `ultima_ejecucion_segundos`, `ejecuciones`.
4.4 Capturar excepciones del servicio y retornar códigos HTTP correspondientes.

**Criterios de aceptación**:
- Endpoint retorna HTTP 200 con la estructura correcta.
- Promedio se calcula solo sobre ejecuciones con duración válida.
- Si no hay ejecuciones, retorna 0 para promedio y última ejecución.
- Requiere JWT válido.

**Archivos**: `backend/routers/prometheus.py`

---

- [x] Tarea 5: Verificación de integración

**Descripción**: Verificar que todos los endpoints funcionan correctamente y que no se rompieron endpoints existentes.

**Subtareas**:
5.1 Verificar que el servidor FastAPI arranca sin errores de importación.
5.2 Probar cada endpoint con token JWT válido.
5.3 Probar comportamiento cuando n8n no está accesible (verificar código 503).
5.4 Verificar que los endpoints existentes de prometheus siguen funcionando.

**Criterios de aceptación**:
- El servidor arranca sin errores.
- Los endpoints retornan las estructuras correctas.
- El manejo de errores funciona según lo especificado.
- No se rompieron endpoints existentes.

---

## Orden de ejecución

```
Tarea 1 (servicio) → Tarea 2 (schemas) → Tarea 3 (router workflows) → Tarea 4 (router metrics/tpw) → Tarea 5 (verificación)
```

## Dependencias

| Tarea | Depende de |
|-------|-----------|
| Tarea 1 | Ninguna |
| Tarea 2 | Ninguna |
| Tarea 3 | Tarea 1, Tarea 2 |
| Tarea 4 | Tarea 1 |
| Tarea 5 | Tarea 3, Tarea 4 |
