## Context

Ver `proposal.md` — Why. Lo relevante para el diseño es el estado actual del frontend y el contrato exacto que ya emite el backend.

**Lo que ya existe y este change reutiliza:**

- `components/common/Tabla.tsx`: tabla genérica con paginación offset/limit sobre `RespuestaPaginada<T>`, botones Anterior/Siguiente, indicador "Mostrando X–Y de N", fila de carga con `Spinner` y fila de vacío ("Sin datos para mostrar").
- `components/common/Badge.tsx`: etiqueta con variantes semánticas `exito | advertencia | peligro | info | neutro`, mapeadas a los tokens de `tailwind.config.js`. **Su prop `children` está tipada como `string`**, no `ReactNode` — restricción a respetar (D5).
- `components/common/Card.tsx`, `Spinner.tsx`.
- `services/apiClient.ts`: axios con `baseURL` desde `VITE_API_URL`, JWT inyectado por interceptor, manejo de 401 (limpia token + redirige a `/login`) y normalización del error a `new Error(detail)` en español.
- `types/comun.ts`: `RespuestaPaginada<T>`.
- `types/tickets.ts`: `Ticket` y `EstadoTicket` (creado en `api-tickets`, todavía sin consumidores).
- `components/layout/Sidebar.tsx`: ya tiene el ítem "Tickets" apuntando a `/dashboard/tickets`. No se toca.
- `components/layout/ProtectedRoute.tsx` + `Layout.tsx`: ya protegen todo el área `/dashboard`. La sección no necesita lógica de sesión propia.

**Contrato real del backend (`backend/routers/tickets.py`), verificado leyendo el router:**

| Endpoint | Query params | Respuesta |
|---|---|---|
| `GET /api/tickets` | `limit` (1–100, **default 15**), `offset` (≥0), `estado` (string, opcional, match exacto sobre `status`) | `{items, total, limit, offset}` |

Detalles verificados que condicionan el diseño:

- El router **ya ordena** por `Ticket.created_at.desc()`. El frontend no debe reordenar nada.
- El router construye los `items` como diccionarios a mano (no serializa `TicketSchema`), emitiendo los 13 campos y convirtiendo las fechas con `str(t.created_at)` — es decir, `"2026-08-19 14:32:11.123456"`, **no un ISO 8601 con `T`**. Ver D7.
- El filtro se llama `estado` (español) pero compara contra la columna `status` (inglés). El valor enviado debe ser el valor crudo de la base, no una etiqueta traducida.
- No existe ningún endpoint que devuelva el catálogo de estados o prioridades distintas.

**Descubrimiento clave — los valores reales de `status` y `priority`:**

`bd/schema-extended.sql` define ambas columnas como `VARCHAR` libre (`status VARCHAR(50) DEFAULT 'open'`, `priority VARCHAR(50)`), sin enum ni check constraint. `types/tickets.ts` declara hoy `EstadoTicket = 'open' | 'in_progress' | 'resolved' | 'closed'`, y su propio JSDoc admite que ese union fue **inferido**, no verificado.

Al inspeccionar los workflows que escriben la tabla (`data/n8n/Sistema de Tickets Automático.json` y `data/n8n/Anotar desbaneo en BD.json`) aparecen los valores realmente producidos:

- `status`: `'open'`, `'urgent'` (`priority === 'critical' ? 'urgent' : 'open'`) y `'resolved'` (lo escribe el workflow de desbaneo). **`in_progress` y `closed` no existen; `urgent` sí y falta en el union.**
- `priority`: `'low'`, `'medium'`, `'critical'`.

El tipo actual es incorrecto en ambas direcciones. Ver D2.

## Goals / Non-Goals

**Goals (de diseño):**

- Que la sección siga el mismo patrón de "tabla paginada con filtro" que `ui-gestion-ips`, sin inventar una tercera forma de hacer lo mismo.
- Que el tipado de `status`/`priority` refleje el contrato real (texto libre) sin renunciar a etiquetas de color legibles ni caer en `any`.
- Que un valor de estado o prioridad inesperado degrade con elegancia en vez de romper la fila.

**Non-Goals (de diseño):**

- No se extrae todavía un hook `useTablaPaginada` compartido. `ui-gestion-ips` dejó explícito que la decisión de extraerlo se evaluaría "si CH17 necesita lo mismo": la evaluación se hace en D8 y el resultado es **no extraerlo ahora**.
- No se toca `Tabla`, `Badge` ni `usePolling`.
- No se introduce librería de estado remoto (react-query o similar) — dependencia nueva, prohibida sin consultar.

## Decisions

### D1: Estructura de archivos

```
pages/
  TicketsPage.tsx                 ← orquestador de la sección
components/tickets/
  TablaTickets.tsx                ← listado + filtro de estado + paginación
  DetalleTicket.tsx               ← panel de detalle de una fila expandida
services/
  ticketsService.ts               ← la llamada HTTP, tipada
types/
  tickets.ts                      ← YA EXISTE: se corrige, no se recrea
```

Mismo patrón que `ui-gestion-ips` y `ui-logs-deteccion`: carpeta kebab-case por sección, sub-componentes con estado propio, página orquestadora que solo compone y no hace llamadas HTTP.

A diferencia de `ui-gestion-ips`, la sección tiene **un solo bloque de datos**, así que la página es delgada por naturaleza. Igual se mantiene la separación página/componente para que el día que se agregue un segundo bloque (p. ej. un resumen de tickets por estado) no haya que refactorizar.

**Alternativa descartada:** poner todo en `TicketsPage.tsx`. Rompe el patrón establecido por las tres secciones ya implementadas y convierte la página en un archivo de ~250 líneas con estado, columnas y detalle mezclados.

### D2: Corrección del tipado de `status` y `priority`

`types/tickets.ts` se modifica así:

```typescript
/** Valores de `security_tickets.status` observados en los workflows de n8n. */
export const ESTADOS_TICKET_CONOCIDOS = ['open', 'urgent', 'resolved'] as const
export type EstadoTicketConocido = (typeof ESTADOS_TICKET_CONOCIDOS)[number]

/** Valores de `security_tickets.priority` observados en los workflows de n8n. */
export const PRIORIDADES_TICKET_CONOCIDAS = ['low', 'medium', 'critical'] as const
export type PrioridadTicketConocida = (typeof PRIORIDADES_TICKET_CONOCIDAS)[number]
```

y en la interfaz `Ticket`, `status: string` y `priority: string | null`.

El union cerrado `EstadoTicket` se **elimina** (nadie lo consume: verificado por grep sobre `frontend/src`).

Razonamiento: la columna es `VARCHAR` libre y el router la devuelve tal cual. Declararla como union cerrado es una mentira al compilador: TypeScript daría por imposible un `default` en el `switch` de color, y un ticket con `status: 'urgent'` —que el workflow **sí** produce— pasaría por un tipo que dice que no puede existir. `string` + una lista de valores conocidos es el modelado honesto: el tipo describe el contrato, la constante describe lo que se sabe hoy.

Las constantes se declaran `as const` y los tipos derivan de ellas, así la lista del filtro y el mapa de colores no pueden divergir entre sí. Sobre esa base se define el union del filtro de la UI, que sí es cerrado porque describe las opciones que ofrece la sección, no lo que puede llegar del backend:

```typescript
export type FiltroEstadoTicket = EstadoTicketConocido | 'todos'
```

**Alternativas descartadas:**

- `EstadoTicket = 'open' | 'urgent' | 'resolved'` (union cerrado corregido) — sigue siendo frágil: cualquier ajuste en un workflow de n8n, que este change tiene prohibido tocar y ni siquiera controla, rompería el tipado en runtime sin que el compilador se entere.
- `status: EstadoTicketConocido | (string & {})` — el truco para conservar autocompletado. Es críptico, no está usado en ninguna parte del proyecto, y el beneficio (autocompletar tres literales) no paga la confusión.

### D3: Capa de servicio

Se crea `services/ticketsService.ts` con una sola función:

```typescript
obtenerTickets(params: { limit: number; offset: number; estado?: string }): Promise<RespuestaPaginada<Ticket>>
```

Mismo criterio que `ipsService`: el armado del query param condicional (`estado` presente solo si el filtro no es "todos") vive en el servicio, no en la vista. Un `undefined` en `params` lo omite axios, que es exactamente la semántica de "sin filtro" del backend.

Sin `try/catch` propio: el interceptor de `apiClient` ya normaliza cualquier error a un `Error` con `detail` en español.

Se exporta también `FILAS_POR_PAGINA = 20` desde el mismo módulo (mismo patrón que `ipsService`). **No se usa el default 15 del backend**: se envía `limit` explícito para que el tamaño de página sea una decisión del frontend, visible en un solo lugar, y dentro del rango 20–50 que fija `AGENTS.md`.

### D4: Estado y disparo de consultas — sin polling

`TablaTickets` mantiene su propio estado (`respuesta`, `cargando`, `error`, `offset`, `filtroEstado`) y un `useEffect` con dependencias `[offset, filtroEstado]` que llama al servicio. Igual que `TablaIpsBloqueadas`.

**No se usa `usePolling`.** `AGENTS.md` fija polling para `alerts.log` (3 s), métricas/contenedores (10 s) y Fail2ban (10 s); tickets no está en esa lista y no existe una constante en `constants/polling.ts` para esta sección. Tampoco se agrega una: refrescar por debajo un listado mientras el operador tiene un detalle abierto y está leyendo una descripción larga es peor UX que un refresco explícito. Se ofrece un botón "Actualizar" en la barra del bloque, igual que en `TablaIpsBloqueadas`.

Cambiar el filtro resetea `offset` a 0 **y** cierra el detalle abierto (D5): la fila expandida podría no estar en el nuevo resultado.

### D5: Detalle expandible por fila

El requisito "Detalle de un ticket" se resuelve con un panel debajo de la fila, controlado por un estado `ticketExpandido: number | null` en `TablaTickets` (el `id` del ticket abierto, o `null`). Solo un detalle abierto a la vez.

**Restricción de `Tabla`:** el componente genérico renderiza exactamente una `<tr>` por item y no admite una fila extra. Cambiar su firma afectaría a los tres bloques que ya lo consumen, y `ui-gestion-ips` ya estableció que no se toca. Por eso el detalle **no** se renderiza como fila de la tabla, sino en un `<div>` inmediatamente debajo del componente `<Tabla>`, mostrando el ticket seleccionado. La columna "Detalle" de cada fila lleva un botón que alterna `ticketExpandido`.

Es un compromiso consciente: visualmente el panel queda al pie del listado, no pegado a su fila. A cambio, no se toca infraestructura compartida y el panel tiene ancho completo, que es justo lo que una `description` larga necesita. Se mitiga marcando la fila abierta (el botón cambia a estado activo) y titulando el panel con el `ticket_number`, para que quede claro a qué ticket corresponde.

**Restricción de `Badge`:** su prop `children` es `string`. Todo lo que se le pase debe ser una cadena ya formateada — nada de fragmentos ni de `{valor ?? '—'}` inline que pueda evaluar a `null`. El guion de los campos nulos se resuelve antes de construir la etiqueta, o directamente no se renderiza el `Badge` y se muestra `—` como texto.

**Alternativa descartada:** una ruta `/dashboard/tickets/:id` con página de detalle. Agrega una ruta y una consulta por ticket a un endpoint que no existe (`GET /api/tickets/{id}` no está implementado); toda la información del detalle **ya viene** en el item del listado.

### D6: Mapeo de estado y prioridad a variantes de `Badge`

Dos `Record<string, VarianteBadge>` con acceso indexado y valor de reserva:

| `status` | Etiqueta | Variante |
|---|---|---|
| `open` | Abierto | `info` |
| `urgent` | Urgente | `peligro` |
| `resolved` | Resuelto | `exito` |
| _(otro)_ | valor crudo | `neutro` |

| `priority` | Etiqueta | Variante |
|---|---|---|
| `critical` | Crítica | `peligro` |
| `medium` | Media | `advertencia` |
| `low` | Baja | `info` |
| _(otro)_ | valor crudo | `neutro` |
| `null` | `—` (texto, sin `Badge`) | — |

Los mapas se tipan como `Record<string, X>` (no `Record<EstadoTicketConocido, X>`) precisamente para que el acceso con una clave desconocida sea legal y caiga en el `??` de reserva. Esto implementa el escenario "Estado desconocido" del spec sin `any` y sin `switch` exhaustivo.

Los mapas viven en `TablaTickets.tsx`, junto a su único consumidor. Si `DetalleTicket` necesitara el mismo badge, se exportan desde ahí; no se crea un `utils/` para dos objetos.

### D7: Formato de fechas — el backend NO emite ISO 8601

`str(datetime)` en Python produce `"2026-08-19 14:32:11.123456"` (separador espacio), no `"2026-08-19T14:32:11"`. `new Date("2026-08-19 14:32:11.123456")` funciona en V8 y en los navegadores modernos, pero **no está garantizado por la especificación de ECMAScript** — es un parseo dependiente de la implementación.

Se implementa `formatearFecha(valor: string | null): string` que:

1. devuelve `'—'` si es `null` o cadena vacía;
2. normaliza el separador (`valor.replace(' ', 'T')`) antes de `new Date(...)`, para caer en el camino ISO especificado;
3. si el resultado es `Invalid Date` (`Number.isNaN(fecha.getTime())`), devuelve el valor crudo en vez de la cadena `"Invalid Date"`;
4. si es válido, devuelve `fecha.toLocaleString('es-AR')`.

El helper vive en `TablaTickets.tsx` y se exporta para que `DetalleTicket` lo reuse (`updated_at`). Es la tercera sección que necesita un `formatearFecha`; las anteriores lo duplicaron localmente. Este change **no** consolida los tres en `utils/`: sería tocar archivos de dos changes ya archivados por una razón que no es la de este change. Se deja anotado como deuda técnica para un change de limpieza.

### D8: Por qué no se extrae `useTablaPaginada`

`ui-gestion-ips` dejó pendiente evaluar la extracción cuando llegara CH17. Evaluación: los tres bloques de aquel change y este suman cuatro tablas paginadas con el mismo esqueleto de estado, pero difieren en el eje que importa — filtro `select` con mapeo a booleano, dos filtros de texto con debounce, sin filtros más polling, y ahora un filtro `select` de string más un estado de expansión que debe resetearse junto con el filtro.

Un hook que cubra los cuatro casos terminaría con un objeto de opciones más grande que el código que ahorra. La duplicación es de ~25 líneas de `useState`/`useEffect` por componente y no ha causado ningún bug en las tres secciones existentes. Se mantiene la duplicación deliberada. **Criterio de revisión:** si aparece un quinto consumidor con la misma forma exacta de otro existente, ahí sí se extrae.

### D9: Integración en `App.tsx`

Un `import { TicketsPage } from './pages/TicketsPage'` y el reemplazo de `<Placeholder titulo="Tickets" />` por `<TicketsPage />` en la ruta `path="tickets"`. No se toca el árbol de rutas, el sidebar (ya apunta a `/dashboard/tickets`) ni `ProtectedRoute` — la protección de sesión ya la da el layout padre, y el manejo del 401 ya lo da el interceptor de `apiClient`. Los dos escenarios del requisito "Acceso protegido" quedan cubiertos por infraestructura existente, sin código nuevo.

### D10: Filtro por prioridad (ajuste post-implementación)

Tras la verificación manual (tarea 7.2) se agregó un segundo filtro, por `priority`, con el mismo diseño que el de `status` (D2–D4, D6): mismo criterio backend (query param opcional en español, `prioridad`, comparado contra la columna en inglés `priority`, match exacto), mismo criterio de "omitir si es la opción neutra" en el servicio, mismo reset de `offset` y de `ticketExpandido` al cambiar, y las mismas opciones/etiquetas ya definidas por `PRIORIDADES_TICKET_CONOCIDAS` y el mapa de D6. No se introduce ningún patrón nuevo: es una segunda instancia del mismo mecanismo, ya con su propio tipo `FiltroPrioridadTicket` (análogo a `FiltroEstadoTicket`).

Se aprovechó el mismo ajuste para agregar una etiqueta (`<label>`) visible arriba de cada `<select>` ("Estado" / "Prioridad"), que antes no la tenían — el título de la sección y la posición de los controles alcanzaban para inferirlo, pero no era explícito.

**Alternativa descartada:** un solo estado combinado `{ estado, prioridad }`. Duplicar el estado y el handler es más código, pero cada filtro es independiente y no gana nada por compartir un objeto; mantiene la simetría con el patrón ya establecido para `filtroEstado`.

## Risks / Trade-offs

- **[Riesgo] Los estados conocidos salen de leer los workflows de n8n, no de un contrato formal** → Si alguien edita un workflow, el filtro puede quedar ofreciendo un estado que ya no se produce, o faltarle uno nuevo. Mitigación: el mapeo tiene reserva `neutro` con el valor crudo, así que un estado nuevo se ve igual (sin color asignado) y nunca rompe la fila. El costo de estar desactualizado es cosmético, no funcional.
- **[Riesgo] El filtro es un `<select>` de valores fijos, no un catálogo del backend** → Si un estado nuevo aparece en la base, no será filtrable desde la UI hasta que se agregue a `ESTADOS_TICKET_CONOCIDOS`. Se acepta: el backend no expone un endpoint de estados distintos y agregarlo está fuera de alcance. Igual se pueden ver esos tickets con el filtro en "Todos".
- **[Riesgo] Parseo de la fecha no-ISO que emite el backend** → Mitigado en D7 con normalización del separador y camino de reserva ante `Invalid Date`. La alternativa correcta de fondo —que el backend emita `isoformat()`— es un cambio de contrato del endpoint y de la spec `consulta-tickets`, fuera del alcance de un change de frontend.
- **[Trade-off] El detalle aparece al pie del listado, no debajo de su fila** → Consecuencia directa de no tocar `components/common/Tabla`, que ya tiene tres consumidores (D5). Se mitiga titulando el panel con el `ticket_number` y marcando el botón de la fila abierta.
- **[Trade-off] Sin polling en una sección de un SIEM** → Un ticket nuevo generado por n8n no aparece solo. Se acepta a cambio de una lectura estable del detalle; el botón "Actualizar" cubre el caso, y es coherente con lo que `AGENTS.md` define como "tiempo real" (una lista cerrada de tres cosas, sin tickets).
- **[Trade-off] Cuarta copia del par `formatearFecha` + esqueleto de tabla paginada** → Deuda técnica asumida y documentada (D7, D8), con criterio explícito de cuándo pagarla, en vez de una abstracción prematura fijada sobre cuatro casos que difieren justo en lo que importa.
