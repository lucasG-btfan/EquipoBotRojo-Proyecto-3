## Why

La sección "Tickets" del dashboard SIEM todavía renderiza un `<Placeholder>` genérico en la ruta `/dashboard/tickets`. El endpoint `GET /api/tickets` ya está implementado y funcionando desde el change `api-tickets` (paginado, ordenado por `created_at` descendente, con filtro por estado), pero no tiene interfaz: hoy el operador no puede ver los tickets que genera automáticamente el workflow "Sistema de Tickets Automático" de n8n sin entrar a PostgreSQL a mano.

Además, al explorar el flujo real se detectó que `frontend/src/types/tickets.ts` declara un union de estados (`'open' | 'in_progress' | 'resolved' | 'closed'`) que fue **inferido**, no verificado: el workflow de n8n escribe en `security_tickets.status` los valores `open`, `urgent` y `resolved`. Ese tipo miente sobre el contrato real y debe corregirse antes de que un componente lo consuma.

## What Changes

- Se reemplaza el `<Placeholder>` de la ruta `/dashboard/tickets` por la página real `TicketsPage`, con un único bloque: listado paginado de tickets.
- Se crea el sub-componente `TablaTickets`: tabla paginada de `security_tickets` (más recientes primero, orden que ya garantiza el backend) con filtro por estado, badge de estado y badge de prioridad.
- Se crea el sub-componente `DetalleTicket`: panel expandible por fila que muestra los campos largos que no entran en la tabla (`description`, `assigned_to`, `alert_reference`, `updated_at`).
- Se corrige `frontend/src/types/tickets.ts`: `status` y `priority` pasan a `string` (el esquema SQL los define como `VARCHAR` libre, sin enum ni check constraint), y se agregan las listas de valores conocidos observados en los workflows de n8n para alimentar el filtro y el mapeo de colores, con comportamiento de reserva para cualquier valor no listado.
- Se agrega `frontend/src/services/ticketsService.ts` con la función de acceso al endpoint, tipada y sin `any`.
- Se actualiza `App.tsx`: un `import` más y el reemplazo del placeholder de la ruta `tickets`.

**No-alcance:**

- No se modifica ni se agrega ningún endpoint del backend. `GET /api/tickets` ya tiene la forma que esta página necesita.
- No se implementa edición de tickets (cambiar estado, asignar, cerrar): no existe endpoint `PATCH`/`PUT` de tickets y no está pedido en el alcance de CH17.
- No se implementa creación manual de tickets: los tickets los genera el workflow de n8n, no el operador.
- No se implementan filtros por prioridad, categoría o IP de origen: el backend solo acepta el query param `estado`; agregar más filtros exigiría tocar el backend, que está fuera de alcance.
- No se implementa polling. `AGENTS.md` fija polling solo para `alerts.log` (3 s), métricas/contenedores (10 s) y Fail2ban (10 s); tickets no está en esa lista. Se ofrece un botón "Actualizar" explícito.
- No se implementa exportación (CSV/JSON) ni navegación cruzada al detalle de la alerta referenciada por `alert_reference`.
- No se agregan dependencias nuevas; se usa lo ya instalado (`axios`, `lucide-react`, `react-router-dom`).

## Capabilities

### New Capabilities

- `ui-tickets`: comportamiento de la sección "Tickets" del dashboard — listado paginado de tickets de seguridad ordenado de más reciente a más antiguo, con filtro por estado, visualización de estado y prioridad, detalle expandible por ticket y manejo explícito de los estados de carga, vacío y error.

### Modified Capabilities

_(ninguna — `consulta-tickets` describe el endpoint del backend y su contrato no cambia)_

## Impact

- **Frontend:** 4 archivos nuevos (`pages/TicketsPage.tsx`, `components/tickets/TablaTickets.tsx`, `components/tickets/DetalleTicket.tsx`, `services/ticketsService.ts`). Se modifican 2 archivos existentes: `App.tsx` (import + ruta) y `types/tickets.ts` (corrección del tipado de `status`/`priority` + constantes de valores conocidos).
- **Backend:** sin cambios.
- **Constantes de polling:** sin cambios — esta sección no hace polling.
- **Dependencias:** ninguna nueva.
- **Riesgo operativo:** nulo. La página es de solo lectura: no dispara ninguna acción sobre el stack.
- **Corrección de tipos:** `EstadoTicket` deja de ser un union cerrado inventado. Ningún componente lo consume todavía (verificado por grep), así que el cambio no rompe nada existente.
