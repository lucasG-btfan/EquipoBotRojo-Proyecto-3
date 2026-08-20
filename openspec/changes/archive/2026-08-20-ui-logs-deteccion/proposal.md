## Why

La sección "Logs y detección" del dashboard SIEM actualmente muestra un placeholder genérico. Los endpoints del backend para visor de logs, inyección de logs de prueba, ejecución de workflows de n8n e historial de ejecuciones ya existen y funcionan, pero no tienen interfaz. El operador necesita una única pantalla para monitorear el `alerts.log` en tiempo real, disparar workflows, inyectar logs de prueba y revisar el historial de ejecuciones de n8n.

## What Changes

- Se reemplaza el `<Placeholder>` de la ruta `/dashboard/logs` por una página funcional con 4 secciones: visor de logs, botones de workflow, inyector de logs e historial de workflows.
- Se agregan tipos TypeScript para workflows de n8n (ejecución, historial) y categorías de inyección de logs.
- Se crea el componente `LogsDeteccionPage` y sus sub-componentes: `LogViewer`, `BotonesWorkflow`, `InyectorLogs`, `HistorialWorkflows`.
- Se agrega constante de polling `HISTORIAL_WORKFLOWS` para el historial de ejecuciones.
- Se actualiza el routing en `App.tsx` para renderizar la página real.

## Capabilities

### New Capabilities

- `ui-logs-deteccion`: Comportamiento de la sección "Logs y detección" del dashboard — visor de alerts.log con polling, botones de ejecución de workflows con feedback, inyector de logs de prueba con selector de categorías, e historial de ejecuciones de n8n paginado.

### Modified Capabilities

_(ninguna — los endpoints ya existen y no cambian)_

## Impact

- **Frontend:** Se crean ~5 archivos nuevos en `pages/`, `components/` y `types/`. Se modifica `App.tsx` (1 import + 1 línea de ruta). Se agrega 1 constante en `constants/polling.ts`.
- **Backend:** Sin cambios — se consumen endpoints ya existentes.
- **Dependencias:** Sin nuevas — se usa `lucide-react` (ya instalado) para iconos.
