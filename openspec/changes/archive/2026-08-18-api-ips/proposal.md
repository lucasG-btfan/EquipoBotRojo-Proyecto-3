# Proposal: api-ips (CH09)

## Resumen

Implementar los endpoints de gestión de IPs del SIEM Dashboard: consulta de IPs bloqueadas, desbloqueo vía fail2ban, patrones de ataque y métricas del sistema.

## Problema

El dashboard necesita exponer datos de las tablas `blocked_ips`, `attack_patterns` y `system_metrics` para que el frontend pueda mostrar la gestión de IPs y métricas del sistema.

## Endpoints a implementar

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/ips/blocked` | IPs bloqueadas con paginación y filtro por estado |
| POST | `/api/ips/{ip}/unblock` | Desbloqueo de IP vía fail2ban |
| GET | `/api/ips/attack-patterns` | Patrones de ataque con paginación y filtros |
| GET | `/api/metrics/system` | Métricas del sistema con paginación |

## Gobernanza

**HIGH** — El endpoint de desbloqueo afecta directamente la postura de seguridad del sistema.

## Dependencias

- CH00 (cimiento-backend) — completado
- Modelos ORM ya existen
- Schemas Pydantic ya existen

## Criterios de éxito

1. Todos los endpoints responden con el formato paginado `{ items, total, limit, offset }`
2. El desbloqueo ejecuta el comando fail2ban correcto
3. Autenticación requerida en todos los endpoints
4. Manejo de errores con mensajes en español
