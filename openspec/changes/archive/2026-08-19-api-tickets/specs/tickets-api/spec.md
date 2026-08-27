# Spec: API Tickets

> Delta spec — CHANGE: ADDED

## GET /api/tickets

Consulta paginada de tickets de seguridad con filtro opcional por estado.

### Autenticación

Todas las requests requieren header `Authorization: Bearer {token}`.

### Query Parameters

| Param | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| limit | int | 15 | Cantidad máxima de items (1-100) |
| offset | int | 0 | Offset para paginación |
| estado | string | null | Filtro por status del ticket |

### Respuesta

```json
{
  "items": [
    {
      "id": 1,
      "ticket_number": "TICKET-LOG-XXXXX",
      "title": "string",
      "description": "string",
      "status": "open",
      "priority": "high",
      "category": "string",
      "source_ip": "1.2.3.4",
      "threat_score": 70,
      "assigned_to": "string",
      "created_at": "2026-07-06 15:38:40",
      "updated_at": "2026-07-06 15:38:40",
      "alert_reference": null
    }
  ],
  "total": 251,
  "limit": 15,
  "offset": 0
}
```

### Escenarios

**ESC-1: Consulta básica sin filtros**
- Request: `GET /api/tickets?limit=15&offset=0`
- Response: 200 con items, total, limit, offset
- Orden: created_at DESC

**ESC-2: Filtro por estado**
- Request: `GET /api/tickets?estado=open`
- Response: Solo tickets con status = 'open'

**ESC-3: Paginación**
- Request: `GET /api/tickets?limit=5&offset=10`
- Response: Items 11-15, total = cantidad total

**ESC-4: Sin resultados**
- Request: `GET /api/tickets?estado=nonexistent`
- Response: `{ "items": [], "total": 0, "limit": 15, "offset": 0 }`

**ESC-5: Sin autenticación**
- Request: `GET /api/tickets` (sin header)
- Response: 401
