# Design: api-ips (CH09)

## Arquitectura

Los endpoints se implementan en `backend/routers/ips.py` siguiendo el patrón establecido en `alertas.py`:

- **Router**: FastAPI APIRouter con prefix `/api`
- **Queries**: SQLAlchemy async con `async_session_factory`
- **Paginación**: Offset/limit con conteo total
- **Auth**: Dependency `usuario_actual` en cada endpoint
- **Errores**: HTTPException con mensajes en español

## Decisiones de diseño

### 1. Paginación consistente

Todos los endpoints usan el mismo patrón de respuesta:
```json
{ "items": [...], "total": N, "limit": 20, "offset": 0 }
```

### 2. Desbloqueo de IP

El endpoint `/api/ips/{ip}/unblock` ejecuta `docker exec fail2ban fail2ban-client set n8n-soar-jail unbanip {ip}`. **NO** modifica PostgreSQL directamente — fail2ban dispara el workflow de n8n para registrar el desbaneo.

Se usa `asyncio.to_thread` para ejecutar el comando Docker de forma no bloqueante.

### 3. Filtros opcionales

- `blocked`: filtro `activo=true/false` (parámetro query `activo`)
- `attack-patterns`: filtro por `ip` y `categoria` (parámetros query)

### 4. Orden de resultados

- `attack-patterns`: `last_seen DESC`
- `system_metrics`: `timestamp DESC`
- `blocked_ips`: sin orden explícito (default DB)

## Archivos afectados

- `backend/routers/ips.py` — implementación completa de los 4 endpoints
