# Tasks: api-tickets (CH10)

## Implementación

- [x] 1. Reemplazar el stub de `GET /api/tickets` en `backend/routers/tickets.py` con la implementación completa
  - Query params: `limit` (default 15), `offset` (default 0), `estado` (opcional)
  - Consulta paginada a tabla `security_tickets` via modelo `Ticket`
  - Filtro opcional por `status` cuando se pasa `estado`
  - Orden: `created_at` DESC
  - Respuesta: `{ "items": [...], "total": N, "limit": limit, "offset": offset }`
  - Serialización manual de cada item a diccionario
  - Error handling con `HTTPException` y mensajes en español

## Verificación

- [x] 2. Verificar que el servidor arranca sin errores (import correcto, router registrado)
- [x] 3. Verificar que el endpoint aparece en `/docs` con los parámetros correctos
