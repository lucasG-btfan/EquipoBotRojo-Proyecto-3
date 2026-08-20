## 1. Tipos TypeScript

- [x] 1.1 Crear `frontend/src/types/workflows.ts` con las interfaces `EjecucionWorkflow`, `HistorialWorkflow`, `CategoriaInyeccion` y `RespuestaRunWorkflow`, usando los nombres de campo exactos del backend (`startedAt`, `stoppedAt`, `status`, `duracion_segundos`). Incluir comentario JSDoc que referencie `backend/schemas/workflows.py` y `backend/schemas/logs.py`.

## 2. Constantes de polling

- [x] 2.1 Agregar `HISTORIAL_WORKFLOWS: 3000` a `INTERVALOS_POLLING` en `frontend/src/constants/polling.ts`, con comentario JSDoc que indique "Historial de ejecuciones de workflows (sección Logs y detección)".

## 3. Sub-componente LogViewer

- [x] 3.1 Crear `frontend/src/components/logs-deteccion/LogViewer.tsx`: componente que usa `usePolling` con `INTERVALOS_POLLING.ALERTAS_LOG` para consultar `GET /api/alerts/log`. Renderiza las líneas en un `div` con `overflow-y-auto`, `max-h-96` y fuente `font-mono`. Incluye auto-scroll al fondo con tolerancia de 50px (verificar `scrollTop + clientHeight >= scrollHeight - 50` antes de scrollear). Muestra `Spinner` en carga inicial, mensaje de error en español, y "No hay líneas de log disponibles." cuando el array está vacío.

## 4. Sub-componente BotonesWorkflow

- [x] 4.1 Crear `frontend/src/components/logs-deteccion/BotonesWorkflow.tsx`: componente con dos botones "Ejecutar workflow principal" y "Ejecutar métricas Prometheus". Cada uno con estado de carga independiente (`useState<boolean>`). Al hacer click: deshabilita ambos botones, muestra `Spinner` en el activo, llama al endpoint correspondiente. En éxito: muestra mensaje con `execution_id` que se oculta a los 3 segundos con `setTimeout`. En error: muestra mensaje en español que persiste hasta la próxima ejecución. Usar `apiClient` para las peticiones POST.

## 5. Sub-componente InyectorLogs

- [x] 5.1 Crear `frontend/src/components/logs-deteccion/InyectorLogs.tsx`: componente que al montar carga `GET /api/logs/inject/categorias` una vez con `useEffect` + `useState`. Renderiza un `<select>` con las categorías mostrando `etiqueta` y `cantidad_logs`. Las categorías con `emisor_disponible: false` se muestran deshabilitadas. Botón "Inyectar" que envía `POST /api/logs/inject` con `{ "categoria": "<clave>" }`. Spinner en botón durante carga, mensaje de éxito/error, botón deshabilitado si emisor no disponible.

## 6. Sub-componente HistorialWorkflows

- [x] 6.1 Crear `frontend/src/components/logs-deteccion/HistorialWorkflows.tsx`: componente que usa `usePolling` con `INTERVALOS_POLLING.HISTORIAL_WORKFLOWS` para consultar `GET /api/workflows/runs?limit=10`. Renderiza una tabla con columnas: ID (truncado a 8 chars), Inicio, Fin, Estado (con `Badge` coloreado según status: verde para éxito/success, rojo para error/failed, neutro para otro), Duración (formateada con helper `formatearTiempo`). Timestamps con `toLocaleString('es-AR')`. Mensaje "No hay ejecuciones registradas." cuando vacío.

## 7. Página orquestadora

- [x] 7.1 Crear `frontend/src/pages/LogsDeteccionPage.tsx`: página que importa y renderiza los 4 sub-componentes. Layout: título h1 "Logs y detección", `LogViewer` en la parte superior (ancho completo), fila de 2 columnas con `BotonesWorkflow` e `InyectorLogs` (grid responsive), `HistorialWorkflows` en la parte inferior. Seguir la estructura visual de `DashboardPage` (clases `flex flex-col gap-6 p-6 lg:p-8`). Incluir helper `formatearTiempo` (reutilizado de `DashboardPage` o definido localmente).

## 8. Routing

- [x] 8.1 En `frontend/src/App.tsx`: agregar `import { LogsDeteccionPage } from './pages/LogsDeteccionPage'` y reemplazar `<Placeholder titulo="Logs y detección" />` por `<LogsDeteccionPage />` en la ruta `path="logs"`.
