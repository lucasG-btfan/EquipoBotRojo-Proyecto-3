# Design: api-tickets (CH10)

## Decisiones de diseño

### 1. Patrón de paginación

Usar el mismo patrón offset/limit que `ips.py`:
- Query params: `limit` (default 15), `offset` (default 0)
- Respuesta: `{ "items": [...], "total": N, "limit": 15, "offset": 0 }`

### 2. Filtro por estado

- Query param `estado` (opcional, string)
- Filtra por `security_tickets.status`
- Valores válidos según BD: `open`, `in_progress`, `resolved`, `closed`

### 3. Ordenamiento

- Siempre por `created_at DESC` (más recientes primero)
- No configurable por el usuario (consistencia con otros endpoints)

### 4. Modelo existente

- `backend/models/ticket.py` — modelo ORM `Ticket` mapeado a `security_tickets`
- `backend/schemas/ticket.py` — schema Pydantic `TicketSchema`
- Ambos ya existen y están correctos

### 5. Patrón a seguir

Copiar la estructura de `backend/routers/ips.py` → endpoint `obtener_ips_bloqueadas`:
- `select(Ticket)` + `func.count(Ticket.id)`
- Filtro condicional con `.where()`
- `.order_by(Ticket.created_at.desc()).limit(limit).offset(offset)`
- Serialización manual a diccionario
- Return `{ "items": [...], "total": N, "limit": limit, "offset": offset }`

### 6. Error handling

- `HTTPException` para errores inesperados
- Mensajes de error en español
