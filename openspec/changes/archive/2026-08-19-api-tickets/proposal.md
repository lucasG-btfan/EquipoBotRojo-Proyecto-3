# Proposal: api-tickets (CH10)

## Resumen

Implementar el endpoint `GET /api/tickets` para consulta paginada de tickets de seguridad desde la tabla `security_tickets` de PostgreSQL.

## Problema

El frontend necesita consumir tickets de seguridad para la sección de Tickets (CH17). Actualmente el router `tickets.py` es un stub que no retorna datos reales.

## Solución

Implementar un endpoint paginado con filtro opcional por estado, siguiendo el patrón establecido en `ips.py` (CH09).

## Alcance

- **GET `/api/tickets`** — Query params: `limit`, `offset`, `estado` (filtro opcional)
- Orden: `created_at` DESC (más recientes primero)
- Respuesta: `{ "items": [...], "total": N, "limit": 15, "offset": 0 }`
- Autenticación JWT requerida

## Fuera de alcance

- Creación/edición/eliminación de tickets (solo lectura)
- Filtros avanzados (búsqueda por texto, fechas, etc.)

## Gobernanza

MEDIUM — solo lectura de datos, no modifica estado.
