# Tasks: api-alertas (CH06)

## Dependencias previas

- CH01 (base-backend) completado — FastAPI, config, auth funcionando.
- CH03 (autenticacion-frontend) completado — JWT middleware y `usuario_actual` funcionando.
- Modelo ORM `Alerta` existente en `backend/models/alerta.py`.
- Tabla `alerts` existente en PostgreSQL.

---

## Tareas

### T1: Agregar `ALERTS_LOG_PATH` a Settings

- **Archivo:** `backend/config.py`
- **Acción:** Agregar `ALERTS_LOG_PATH: str = "logs/alerts.log"` al modelo `Settings`.
- **Verificación:** El settings carga el valor desde `.env` o usa el default.
- [x] Completada

### T2: Implementar endpoint `GET /api/alerts/recent`

- **Archivo:** `backend/routers/alertas.py`
- **Acción:**
  - Importar `select`, `func` de sqlalchemy, `AsyncSession` de sqlalchemy.ext.asyncio.
  - Importar `Alerta` de `backend.models.alerta`.
  - Importar `async_session_factory` de `backend.database`.
  - Reemplazar el stub de `obtener_alertas_recientes` con la implementación real.
  - Aceptar query params `limit` (default 5) y `offset` (default 0).
  - Validar y acotar `limit` al rango [1, 50].
  - Ejecutar query de conteo total + query paginada con `ORDER BY timestamp DESC`.
  - Mapear cada `Alerta` a dict con los 11 campos especificados.
  - Retornar `{ "items": [...], "total": N, "limit": L, "offset": O }`.
- **Verificar:** El stub original retorna 200 con "Endpoint no implementado" — la implementación real debe mantener el patrón de error handling con try/except.
- [x] Completada

### T3: Implementar endpoint `GET /api/alerts/log`

- **Archivo:** `backend/routers/alertas.py`
- **Acción:**
  - Importar `asyncio` y `collections.deque`.
  - Importar `settings` de `backend.config`.
  - Importar `logging` para el warning de permisos.
  - Reemplazar el stub de `obtener_log_alertas` con la implementación real.
  - Definir función interna síncrona que lee el archivo con `deque(file, 50)` para obtener las últimas 50 líneas.
  - Ejecutar con `asyncio.to_thread`.
  - Capturar `FileNotFoundError` → retornar `{"lineas": []}` (HTTP 200).
  - Capturar `PermissionError` → retornar `{"lineas": []}` (HTTP 200) + warning en log.
  - Retornar `{ "lineas": [...] }`.
- **Verificar:** Si el archivo no existe, NO debe retornar 500.
- [x] Completada

### T4: Validación manual de endpoints

- **Acción:**
  - Levantar el backend.
  - Probar `GET /api/alerts/recent` con token JWT válido.
  - Probar `GET /api/alerts/log` con token JWT válido.
  - Probar ambos endpoints sin token → esperar 401.
  - Probar `/api/alerts/log` sin archivo de log → esperar `{"lineas": []}`.
- **Herramienta:** curl o cualquier cliente HTTP.
- [x] Completada (verificación de código, no arranque de servidor)

---

## Resumen

| Tarea | Archivo(s) | Dependencias |
|-------|-----------|--------------|
| T1 | `backend/config.py` | Ninguna |
| T2 | `backend/routers/alertas.py` | T1 |
| T3 | `backend/routers/alertas.py` | T1 |
| T4 | — | T2, T3 |

T1 es prerequisito de T2 y T3. T2 y T3 pueden desarrollarse en paralelo. T4 valida todo al final.
