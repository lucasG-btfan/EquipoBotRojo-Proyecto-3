# Design: ui-wazuh (CH20)

## Context

Ver `proposal.md` — Why. Restricciones que condicionan el enfoque:

**Forma real de la respuesta de `GET /api/wazuh/alerts/count`.** Verificada leyendo `backend/routers/wazuh.py` y `backend/schemas/wazuh.py`:

```json
{ "total": 42, "mensaje": "Cantidad de alertas nativas de Wazuh (FIM, integridad, rootcheck)" }
```

Puntos verificados que hay que respetar:
- El contrato es mínimo y estable: `total: int` + `mensaje: str` (`ConteoAlertasWazuhSchema`). No hay lista de alertas, ni timestamps, ni paginación — la vista es un contador, nada más.
- El endpoint requiere JWT (`Depends(usuario_actual)`); el `apiClient` ya inyecta el Bearer y normaliza el `detail` de errores a un `Error` con mensaje en español.
- Ante Wazuh inalcanzable / credenciales rechazadas / timeout, el backend responde `503` con `detail` en español (spec `conteo-alertas-wazuh` de CH12). El frontend no necesita distinguir causas: el mensaje ya llega listo para mostrar.

**Infraestructura ya disponible:** `usePolling` (hook genérico que no parpadea en refrescos periódicos), `Card` / `Badge` / `Spinner` en `components/common/`, `apiClient` con interceptor de sesión, ruta `/dashboard/wazuh` + entrada de Sidebar existentes desde CH01 (hoy renderizan `Placeholder`). En `constants/polling.ts` **no existe aún** una constante para esta sección.

**Gobernanza:** LOW — sección de solo lectura, sin efectos sobre el stack ni sobre Wazuh.

## Goals / Non-Goals

**Goals:**
- Reemplazar el último `Placeholder` del panel por la vista real, siguiendo los patrones ya establecidos (container-presentational, servicio, tipos propios).
- Mostrar el total como número grande en una card, con la nota que diferencia estas alertas nativas de las que llegan por n8n.
- Cubrir carga, error, refresco manual y polling automático con la misma calidad que el resto de las secciones.

**Non-Goals:**
- Mostrar el detalle o contenido de alertas individuales de Wazuh (sería otra capability y otro change).
- Modificar el backend: el contrato existente alcanza con holgura.
- Unificar el intervalo de Prometheus (30s desde CH19) con los 10s de AGENTS.md: deuda preexistente, fuera de alcance.

## Decisions

### D1 — Composición: página contenedora + contador presentacional

- `WazuhPage.tsx` — **componente contenedor**: hace el polling con `usePolling`, maneja carga/error/refresco manual y resuelve qué renderizar según el estado.
- `components/wazuh/ContadorAlertasWazuh.tsx` — **presentacional puro**: recibe props ya resueltas (`total`, `mensaje`, `cargando`, `error`, `onRefrescar`) y no sabe nada de HTTP ni de polling.

*Alternativa descartada:* replicar exactamente el esquema de tres capas de CH19 (page fina + panel contenedor + tarjeta). Para una vista de una sola card, la capa intermedia es ceremonia sin beneficio: no hay lista que mapear ni lógica de presentación repetida. Se mantiene el principio container-presentational, dimensionado a la vista.

### D2 — Tipos (`types/wazuh.ts`)

```typescript
export interface ConteoAlertasWazuh {
  total: number
  mensaje: string
}
```

Espejo directo de `ConteoAlertasWazuhSchema`. Sin `any` (regla dura). Si el backend agregara campos a futuro, TypeScript los ignora sin romper — el tipo declara solo lo que la vista consume.

### D3 — Polling: nueva constante `INTERVALOS_POLLING.WAZUH = 10000`

AGENTS.md fija 10 segundos para lecturas de métricas (contenedores, jail, métricas Prometheus). Este contador es una lectura de esa misma naturaleza y de costo ínfimo (CH12 obliga al backend a obtener el total sin transferir el detalle), así que 10s es la cadencia correcta. La constante se agrega a `constants/polling.ts` con su comentario de propósito; ningún componente hardcodea el intervalo (regla dura).

*Alternativa descartada:* reutilizar `METRICAS_SISTEMA` (también 10000). Compartir constante entre secciones distintas acopla sus intervalos: si mañana la jail necesita 15s, cambiaría también Wazuh sin motivo. Una constante por sección es el patrón que ya usa el archivo.

### D4 — Presentación del contador

- Card (`Card` de `components/common/`) ocupando el ancho disponible, contenido centrado: **número en `text-5xl font-bold`**, mensaje del backend como subtítulo en `text-sm`.
- El número se formatea con `toLocaleString('es-AR')` para separador de miles: `1234` se lee peor que `1.234` cuando el stack acumula volumen.
- **Nota fija** bajo el contador, siempre visible (con datos y ante error): las alertas procesadas por n8n se ven en Dashboard y Tickets. Sin ella, un `0` en pantalla podría leerse como "no hay alertas en el sistema", que es falso — solo significa que no hay alertas *nativas*.
- Carga inicial: `Spinner` en lugar del número. Los refrescos periódicos no parpadean (lo garantiza `usePolling`).
- Error sin dato previo: mensaje en español (el `detail` del 503 ya llega traducido) + botón "Reintentar", mismo patrón visual que `PanelAlertas`.
- Error con dato previo: el último total conocido permanece visible y un aviso en `text-advertencia` indica que la última consulta falló — nunca se muestra un dato viejo como si fuera actual.

### D5 — Servicio (`services/wazuhService.ts`)

Una única función `obtenerConteoAlertasWazuh(): Promise<ConteoAlertasWazuh>` sobre `apiClient.get('/api/wazuh/alerts/count')`, calcada del patrón de `prometheusService.ts`. Nombre de archivo camelCase, componentes PascalCase, carpeta `components/wazuh/` kebab-case.

### D6 — Integración y limpieza del router

`App.tsx`: importar `WazuhPage` y reemplazar `<Placeholder titulo="Wazuh" />` en la ruta `wazuh`. Como es la **última** ruta que consumía `Placeholder`, su import queda huérfano y debe eliminarse en el mismo cambio (con `noUnusedLocals` activo, dejarlo rompe la compilación). `Sidebar.tsx` no requiere cambios: la entrada "Wazuh" ya apunta a `/dashboard/wazuh`.

## Risks / Trade-offs

- **[El conteo depende de la disponibilidad de Wazuh]** → El 503 del backend llega con `detail` en español vía el interceptor de `apiClient`; la UI muestra el mensaje + reintento. Nunca se muestra `0` ni un número inventado como fallback: sin dato real no hay número.
- **[Polling de 10s contra Wazuh]** → Aceptado: la consulta es de solo lectura y de costo constante por diseño (spec CH12: sin transferencia de detalle). Es la cadencia que AGENTS.md prescribe para métricas.
- **[Vista "pobre": un solo número]** → Es exactamente el alcance definido para CH20 en el roadmap (card con número grande + nota). Ampliar a detalle de alertas sería un change nuevo sobre capabilities nuevas, no este.
- **[Inconsistencia de cadencias: PROMETHEUS=30s vs WAZUH=10s]** → Preexistente y deliberada (decisión de CH19 para Prometheus). Esta sección sigue AGENTS.md. Unificar es deuda documentada, fuera de alcance.

## Migration Plan

Cambio exclusivamente de frontend, sin migraciones ni configuración nueva. Despliegue = deploy normal del build de Vite. Rollback = revert del commit: la ruta vuelve a quedar sin página propia, pero ningún dato ni contrato cambia.
