# Proposal: ui-fail2ban (CH18)

## What

Implementar la página "Fail2ban" del dashboard SIEM que muestra el estado actual de la jail de Fail2ban: nombre de la jail, cantidad de IPs baneadas, lista de IPs baneadas con badge rojo, botón de refresh manual y timestamp de última actualización. Polling cada 10 segundos.

## Why

El operador necesita ver en tiempo real qué IPs están baneadas por Fail2ban para monitorear la protección del sistema. La API backend ya existe (CH11) y expone `GET /api/fail2ban/jail` con la respuesta `{ jail, baneadas, ips }`.

## Scope

- **Incluye:** Page Fail2banPage, componente EstadoJail, servicio fail2banService, tipo TypeScript, integración en App.tsx y Sidebar
- **No incluye:** Modificaciones al backend, desbloqueo de IPs (eso ya está en gestión-ips), métricas Prometheus de fail2ban (CH19)
