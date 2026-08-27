## Why

La sección "Inicio" del SIEM Dashboard es actualmente un `Placeholder` sin contenido real. Esta es la primera página que ve el usuario después del login y debe presentar el sistema de forma profesional: nombre, tecnologías integradas, estado general de salud y acceso rápido al dashboard. Una página de inicio sólida genera confianza y Orienta al operador sobre el estado del sistema de un vistazo.

## What Changes

- **Nuevo componente `InicioPage.tsx`** en `frontend/src/pages/` — reemplaza el `Placeholder` actual en la ruta `/dashboard/inicio`.
- **Indicador de estado general del sistema** — poll a `GET /api/status/containers` cada 30 s; muestra semáforo verde/rojo según si los servicios principales responden.
- **Listado de tecnologías del stack** — cards con íconos de lucide-react: Wazuh, n8n, Elasticsearch, Fail2ban, Prometheus, PostgreSQL, Syslog-ng.
- **Botón "Ir al Dashboard"` — enlace directo a la sección Dashboard (`/dashboard/dashboard`).
- **Estilo SIEM dark** — fondo `#0f172a`, cards `#1e293b`, tipografía Inter, tokens de color existentes.

## Capabilities

### New Capabilities

- `inicio-page`: Página de bienvenida/presentación del SIEM Dashboard con indicador de salud del sistema, listado de tecnologías y acceso rápido al dashboard.

### Modified Capabilities

- (ninguna — esta es una página nueva que no modifica requisitos de specs existentes)

## Impact

- **Frontend exclusivo** — no hay cambios en backend, base de datos ni configuración Docker.
- **Archivos afectados**:
  - `frontend/src/pages/InicioPage.tsx` (nuevo)
  - `frontend/src/App.tsx` (cambio de import: Placeholder → InicioPage)
- **Dependencias existentes usadas** (sin instalar nada nuevo):
  - `lucide-react` (íconos)
  - `Card`, `Badge` de `components/common/`
  - `usePolling` de `hooks/`
  - `apiClient` de `services/`
  - `INTERVALOS_POLLING` de constantes
- **Sin breaking changes** — la ruta `/dashboard/inicio` mantiene la misma URL, solo cambia el componente renderizado.

## No-alcance

- No se implementan endpoints nuevos en el backend.
- No se modifica el layout del sidebar ni la navegación.
- No se agregan animaciones complejas ni partículas decorativas.
- No se implementa la funcionalidad de las otras secciones del dashboard (ya cubiertas por otros changes).
