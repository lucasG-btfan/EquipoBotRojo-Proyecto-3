## Why

La sección "Gestión de IPs" del dashboard SIEM todavía renderiza un `<Placeholder>` genérico en la ruta `/dashboard/ips`. Los tres endpoints que la alimentan (`GET /api/ips/blocked`, `POST /api/ips/{ip}/unblock`, `GET /api/ips/attack-patterns`, `GET /api/metrics/system`) ya están implementados y funcionando desde el change `api-ips`, pero no tienen interfaz: hoy el operador no puede ver qué IPs están baneadas, desbanear una manualmente, ni revisar los patrones de ataque acumulados sin entrar a la base de datos a mano.

## What Changes

- Se reemplaza el `<Placeholder>` de la ruta `/dashboard/ips` por la página real `GestionIpsPage`, con tres bloques: IPs bloqueadas, patrones de ataque y métricas del sistema.
- Se crea el sub-componente `TablaIpsBloqueadas`: tabla paginada de `blocked_ips` con filtro por estado (activas / inactivas / todas), badge de estado y botón de desbloqueo manual por fila con confirmación en dos pasos.
- Se crea el sub-componente `TablaPatronesAtaque`: tabla paginada de `attack_patterns` con filtros por IP de origen y por categoría (`pattern_type`), aplicados con *debounce*.
- Se crea el sub-componente `TablaMetricasSistema`: tabla paginada de `system_metrics` con polling cada 10 s usando la constante `INTERVALOS_POLLING.METRICAS_SISTEMA`, que ya existe y hasta ahora no tenía consumidor.
- Se crea `frontend/src/types/ips.ts` re-exportando y centralizando los tipos de la sección, y se corrige `PatronAtaque` en `types/alertas.ts`: los campos `recent_count` y `window_start` pasan a ser opcionales porque `GET /api/ips/attack-patterns` no los emite.
- Se agrega `frontend/src/services/ipsService.ts` con las cuatro funciones de acceso a los endpoints, tipadas y sin `any`.
- Se actualiza `App.tsx`: un `import` más y el reemplazo del placeholder de la ruta `ips`.

**No-alcance:**

- No se modifica ni se agrega ningún endpoint del backend. Los cuatro endpoints existen con la forma que esta página necesita.
- No se implementa bloqueo manual de IPs (solo desbloqueo) — no hay endpoint para ello y no está pedido.
- No se implementa exportación (CSV/JSON) de las tablas.
- No se implementan gráficos ni series temporales sobre `system_metrics`: es una tabla, no una visualización.
- No se agregan dependencias nuevas; se usa lo ya instalado (`axios`, `lucide-react`, `react-router-dom`).

## Capabilities

### New Capabilities

- `ui-gestion-ips`: comportamiento de la sección "Gestión de IPs" del dashboard — listado paginado y filtrable de IPs bloqueadas con desbloqueo manual, listado paginado y filtrable de patrones de ataque, y tabla de métricas del sistema con actualización periódica por polling.

### Modified Capabilities

_(ninguna — los endpoints del backend ya existen y su contrato no cambia)_

## Impact

- **Frontend:** ~6 archivos nuevos (`pages/GestionIpsPage.tsx`, `components/gestion-ips/` con 3 sub-componentes, `services/ipsService.ts`, `types/ips.ts`). Se modifican 2 archivos existentes: `App.tsx` (import + ruta) y `types/alertas.ts` (dos campos de `PatronAtaque` pasan a opcionales).
- **Backend:** sin cambios.
- **Constantes de polling:** sin cambios — se consume `INTERVALOS_POLLING.METRICAS_SISTEMA`, que ya está definida.
- **Dependencias:** ninguna nueva.
- **Riesgo operativo:** el botón de desbloqueo ejecuta `fail2ban-client unbanip` sobre el stack real; es la única acción destructiva de la página y por eso lleva confirmación explícita.
