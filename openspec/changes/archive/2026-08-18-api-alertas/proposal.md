# Proposal: api-alertas (CH06)

## Propósito

Implementar los endpoints de alertas en el backend del SIEM Dashboard: la consulta paginada de alertas almacenadas en PostgreSQL (`/api/alerts/recent`) y la lectura de las últimas líneas del archivo de log `alerts.log` (`/api/alerts/log`). Estos endpoints alimentan las secciones "Dashboard" y "Logs y detección" del frontend, y reemplazan los stubs actuales que retornan "Endpoint no implementado".

## Alcance

### Backend (FastAPI)

1. **`GET /api/alerts/recent`**
   - Consulta la tabla `alerts` ordenada por `timestamp` DESC.
   - Query params: `?limit=5` (default), `?offset=0`.
   - Respuesta: `{ "items": [...], "total": N, "limit": 5, "offset": 0 }`.
   - Campos retornados: `id`, `timestamp`, `severity`, `category`, `source_host`, `source_ip`, `target_host`, `event_count`, `description`, `risk_score`, `risk_level`.
   - Requiere autenticación JWT.

2. **`GET /api/alerts/log`**
   - Lee las últimas 50 líneas del archivo de log cuya ruta se define en la variable de entorno `ALERTS_LOG_PATH`.
   - Respuesta: `{ "lineas": ["..."] }`.
   - Si el archivo no existe → retorna `{ "lineas": [] }` (sin error 500).
   - Requiere autenticación JWT.

3. **Configuración**
   - Agregar `ALERTS_LOG_PATH` al modelo `Settings` en `backend/config.py`, con valor por defecto que apunte a una ruta razonable.

4. **Modelo ORM**
   - Verificar que el modelo `Alerta` en `backend/models/alerta.py` cubra todos los campos solicitados por el frontend. El modelo actual ya tiene los campos necesarios.

### No-alcance

- **No se implementa** el frontend de las secciones de alertas o logs. Este change es exclusivamente backend.
- **No se modifica** la tabla `alerts` ni su schema existente.
- **No se agregan** filtros por `severity`, `category` u otros campos en `/api/alerts/recent` — solo `limit` y `offset` por ahora.
- **No se implementa** streaming ni WebSockets para el log — el frontend consumirá vía polling.
- **No se toca** `docker-compose.yml`, workflows de n8n, ni ningún archivo del stack existente.

## Dependencias

- **CH01 (base-backend)**: La infraestructura base del backend (FastAPI, config, CORS, auth) ya existe.
- **CH03 (autenticacion-frontend)**: El middleware de JWT y la dependencia `usuario_actual` ya están implementados.
- El modelo ORM `Alerta` ya existe en `backend/models/alerta.py` y coincide con el schema SQL.
- La tabla `alerts` ya está definida en `BD/schema.sql` y debe existir en PostgreSQL.

## Gobernanza

**MEDIUM** — Lógica de negocio estándar (consulta de DB, lectura de archivo). No toca auth, billing, seguridad per se. Implementación con checkpoints, decisiones superficiales al usuario.
