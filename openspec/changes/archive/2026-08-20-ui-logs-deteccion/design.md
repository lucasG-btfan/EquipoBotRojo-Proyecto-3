## Context

La sección "Logs y detección" es una de las 8 secciones del dashboard SIEM. Actualmente renderiza un `<Placeholder>` desde el change base (CH02). Los 6 endpoints del backend que alimentan esta sección ya están implementados y documentados en los specs `consultas-alertas` e `inyeccion-logs`. Este change construye la interfaz completa que los consume.

El frontend ya dispone de patrones reutilizables: `usePolling` para polling configurable, `apiClient` con interceptor JWT, componentes `Card`/`Badge`/`Spinner`, y tipos comunes como `RespuestaPaginada<T>`. La página debe integrarse sin romper la estructura existente.

## Goals / Non-Goals

**Goals:**

- Proveer al operador una pantalla única para monitorear logs, disparar workflows, inyectarlogs de prueba y revisar historial.
- Consumir exclusivamente los endpoints del backend, sin acceder a APIs externas (n8n, Prometheus) desde el frontend.
- Seguir los patrones de polling, naming y estructura ya establecidos en el proyecto.

**Non-Goals:**

- Modificar endpoints del backend o agregar nuevos.
- Implementar WebSocket, Server-Sent Events o cualquier mecanismo de tiempo real que no sea polling.
- Agregar filtros avanzados de búsqueda en el visor de logs (las últimas 50 líneas son suficientes para esta primera versión).
- Implementar paginación en el visor de logs (el endpoint ya retorna las últimas 50 líneas fijas).

## Decisions

### D1: Estructura de componentes

Se crea la carpeta `components/logs-deteccion/` con 4 sub-componentes, más la página en `pages/LogsDeteccionPage.tsx`:

```
pages/
  LogsDeteccionPage.tsx          ← orquestador, usa los 4 sub-componentes
components/
  logs-deteccion/
    LogViewer.tsx                ← visor scrollable de alerts.log
    BotonesWorkflow.tsx          ← botones para disparar workflows
    InyectorLogs.tsx             ← selector de categoría + botón inyectar
    HistorialWorkflows.tsx       ← tabla de historial de ejecuciones
```

**Razón:** Separar en sub-componentes permite que cada uno maneje su propio estado de polling/loading/error sin inflar el contexto de la página. La carpeta `logs-deteccion/` sigue la convención `kebab-case` de AGENTS.md.

**Alternativa descartada:** Un solo componente monolítico con toda la lógica — violaría el patrón establecido por `DashboardPage` que delega visualmente por secciones.

### D2: Tipos TypeScript

Se crea `types/workflows.ts` con los tipos que coinciden exactamente con los schemas del backend:

```typescript
// Backend: EjecucionWorkflowSchema
export interface EjecucionWorkflow {
  id: string
  startedAt: string | null
  stoppedAt: string | null
  status: string
  duracion_segundos: number | null
}

// Backend: HistorialWorkflowSchema
export interface HistorialWorkflow {
  ejecuciones: EjecucionWorkflow[]
  total: number
}

// Categoría del catálogo de inyección
export interface CategoriaInyeccion {
  categoria: string
  etiqueta: string
  host_origen: string
  cantidad_logs: number
  emisor_disponible: boolean
}

// Respuesta de ejecución de workflow
export interface RespuestaRunWorkflow {
  mensaje: string
  execution_id: string
}
```

**Razón:** El tipo `EjecucionWorkflow` existente en `types/contenedores.ts` está desactualizado (usa `nombre`, `estado`, `ejecutado_en` que no coinciden con el schema del backend que usa `startedAt`, `stoppedAt`, `status`). Se crea un archivo separado en vez de corregir `contenedores.ts` para no romper otros changes que puedan depender de ese tipo. El tipo en `contenedores.ts` queda obsoleto y se eliminará en un change de limpieza posterior.

### D3: Estrategia de polling

| Sección | Endpoint | Intervalo | Constante |
|---------|----------|-----------|-----------|
| LogViewer | `GET /api/alerts/log` | 3s | `INTERVALOS_POLLING.ALERTAS_LOG` (ya existe) |
| HistorialWorkflows | `GET /api/workflows/runs` | 3s | `INTERVALOS_POLLING.HISTORIAL_WORKFLOWS` (nueva) |
| InyectorLogs (catálogo) | `GET /api/logs/inject/categorias` | Carga única (no polling) | — |
| BotonesWorkflow | `POST /api/workflows/main/run` | On-demand (no polling) | — |
| InyectorLogs (inyección) | `POST /api/logs/inject` | On-demand (no polling) | — |

**Razón:** El log viewer y el historial necesitan actualización frecuente (3s) para que el operador vea los logs y ejecuciones recientes. El catálogo de categorías no cambia durante la sesión — se carga una vez al montar. Los botones de ejecución son on-demand, no periódicos.

### D4: Visor de logs (`LogViewer`)

- Renderiza las líneas en un `div` con `overflow-y-auto` y altura fija (`max-h-96`).
- Cada línea se muestra en un `pre` con `font-mono` para alinear el texto de log.
- **Auto-scroll:** al recibir nuevos datos, si el usuario estaba al fondo del scroll (tolerancia de 50px), se hace scroll automático al final. Si el usuario scrolleó hacia arriba, se preserva su posición.
- Se implementa con un `useRef` al contenedor y un `useEffect` que compara `scrollTop + clientHeight` contra `scrollHeight`.
- Muestra estado de carga con `Spinner` y error con mensaje en rojo, siguiendo el patrón de `DashboardPage`.

### D5: Botones de workflow (`BotonesWorkflow`)

- Dos botones: "Ejecutar workflow principal" y "Ejecutar métricas Prometheus".
- Cada botón tiene su propio estado de carga independiente (`useState<boolean>`).
- Al hacer click: llama al endpoint correspondiente, muestra `Spinner` en el botón, deshabilita ambos botones mientras dure la petición.
- En éxito: muestra un toast breve con el `execution_id` recibido (se auto-oculta después de 3 segundos).
- En error: muestra un mensaje de error debajo del botón (se mantiene visible hasta la próxima ejecución).
- No se usa polling — la ejecución es un fire-and-forget que el operador dispara manualmente.

### D6: Inyector de logs (`InyectorLogs`)

- Al montar, carga el catálogo de categorías desde `GET /api/logs/inject/categorias` una sola vez (usando `useEffect` + `useState`, NO `usePolling`).
- Renderiza un `<select>` con las categorías disponibles, mostrando la `etiqueta` legible.
- Si una categoría tiene `emisor_disponible: false`, se muestra deshabilitada con un indicador visual (texto "emisor no disponible").
- Botón "Inyectar" que llama a `POST /api/logs/inject` con la categoría seleccionada.
- Feedback: Spinner en el botón durante la petición, mensaje de éxito/error debajo.
- El botón se deshabilita si la categoría seleccionada tiene `emisor_disponible: false`.

### D7: Historial de workflows (`HistorialWorkflows`)

- Usa `usePolling` con `INTERVALOS_POLLING.HISTORIAL_WORKFLOWS` (3s).
- Tabla con columnas: ID (truncado), Inicio, Fin, Estado, Duración.
- El campo `status` se muestra con `Badge`: "Éxito" en verde, "Error" en rojo, otro estado en neutro.
- Timestamps formateados con `toLocaleString('es-AR')`, siguiendo el patrón de `DashboardPage`.
- Duración formateada con la función `formatearTiempo` (segundos → "Xs", minutos → "Xm Ys").
- Muestra las últimas 10 ejecuciones (el parámetro `limit=10` al endpoint).

### D8: Integración en App.tsx

Solo se modifica `App.tsx` para:
1. Agregar `import { LogsDeteccionPage } from './pages/LogsDeteccionPage'`
2. Reemplazar `<Placeholder titulo="Logs y detección" />` por `<LogsDeteccionPage />`

No se toca el router, ni las rutas, ni ningún otro componente existente.

### D9: Feedback visual — toast simple

Para los mensajes de éxito temporales (inyección, ejecución de workflow), se implementa un componente `MensajeExito` inline en `LogsDeteccionPage`: un `div` con estilo verde que se muestra condicionalmente y se oculta después de 3 segundos con `setTimeout`. No se instala librería de toasts externa — es un componente de ~15 líneas.

## Risks / Trade-offs

- **[Riesgo] Tipo `EjecucionWorkflow` en `contenedores.ts` obsoleto** → Se crea el tipo correcto en `types/workflows.ts`. El tipo viejo queda en `contenedores.ts` sin romper nada. Un change de limpieza posterior puede eliminarlo.
- **[Riesgo] Auto-scroll del log viewer puede fallar con contenido muy dinámico** → Se mitigа con la verificación de posición antes de scrollear (tolerancia de 50px). Si el usuario está al fondo, scroll; si no, se preserva.
- **[Trade-off] polling a 3s para logs e historial** → Puede generar carga innecesaria si el operador no está mirando la sección. Mitigación: el hook `usePolling` ya soporta `habilitado: false` para desactivar el polling cuando la sección no está visible (posible mejora futura).
- **[Trade-off] No se instala librería de toasts** → El componente inline es más simple pero menos reutilizable. Aceptable para una única página que necesita feedback temporal.
