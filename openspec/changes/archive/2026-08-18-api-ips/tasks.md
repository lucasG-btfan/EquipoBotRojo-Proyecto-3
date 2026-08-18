# Tasks: api-ips (CH09)

## Implementación de endpoints de gestión de IPs

- [x] 1. Implementar GET `/api/ips/blocked` con paginación offset/limit y filtro opcional por estado activo/inactivo
- [x] 2. Implementar POST `/api/ips/{ip}/unblock` ejecutando comando fail2ban vía Docker
- [x] 3. Implementar GET `/api/ips/attack-patterns` con paginación y filtros opcionales por IP y categoría
- [x] 4. Implementar GET `/api/metrics/system` con paginación offset/limit
- [x] 5. Verificar que todos los endpoints requieren autenticación JWT
