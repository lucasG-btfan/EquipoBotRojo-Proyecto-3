# Proposal: ui-prometheus (CH19)

## Why

El backend ya expone `GET /api/prometheus/alerts` (CH05), pero la sección "Prometheus" del panel sigue siendo un `Placeholder`. El operador no tiene forma de ver, en una vista dedicada, si las 3 alertas del sistema (`IpBaneadaDetectada`, `Fail2banCaido`, `AtaqueMasivo`) están disparadas, pendientes o inactivas. Es la única señal que indica si las reglas de detección de Prometheus están funcionando y si hay un incidente en curso.

## What Changes

- Nueva página `PrometheusPage` montada en la ruta ya existente `/dashboard/prometheus`, reemplazando el `Placeholder` en `App.tsx`.
- Tres cards, una por alerta esperada, siempre visibles (aunque la alerta no exista en Prometheus): nombre, descripción, estado con color semántico (FIRING rojo, PENDING amarillo, INACTIVE verde, no configurada neutro), valor actual de la métrica asociada cuando el backend lo provee, y tiempo transcurrido desde que la alerta fue observada por primera vez en estado FIRING.
- Nuevo tipo compartido `types/prometheus.ts` que refleja la respuesta real del backend, y nuevo servicio `services/prometheusService.ts`.
- Polling cada 30 segundos usando la constante ya definida `INTERVALOS_POLLING.PROMETHEUS`, más botón de refresco manual y marca de última actualización.
- Estados explícitos de carga, error y "alerta no configurada".

No hay cambios de contrato de API ni breaking changes.

## Capabilities

### New Capabilities

- `ui-prometheus`: Comportamiento observable de la sección "Prometheus" del panel — presentación del estado de las 3 alertas, semántica de colores, valor de métrica asociada, tiempo en FIRING, refresco periódico y manual, y estados de carga/error/no configurada.

### Modified Capabilities

Ninguna. `metricas-prometheus` (el endpoint del backend) no cambia: esta sección solo lo consume.

## Impact

- **Frontend (nuevo):** `frontend/src/pages/PrometheusPage.tsx`, `frontend/src/components/prometheus/TarjetaAlerta.tsx`, `frontend/src/components/prometheus/PanelAlertas.tsx`, `frontend/src/services/prometheusService.ts`, `frontend/src/types/prometheus.ts`.
- **Frontend (modificado):** `frontend/src/App.tsx` (import de la página en lugar del `Placeholder`).
- **Backend:** sin cambios.
- **Sidebar:** sin cambios — la entrada "Prometheus" y la ruta ya existen desde CH13.
- **Dependencias:** ninguna nueva. Se reutilizan `axios` (vía `apiClient`), `usePolling`, `Card`, `Badge`, `Spinner` y `lucide-react`.

## No-alcance

- Modificaciones al backend o al endpoint `GET /api/prometheus/alerts`.
- Estado de la jail y detalle de IPs baneadas por Fail2ban (CH18, ya entregado).
- Contador de alertas nativas de Wazuh (CH20).
- Gráficas históricas o series temporales de Prometheus: la vista es de estado instantáneo.
- Silenciar, reconocer o modificar alertas desde el panel: la sección es de solo lectura.
