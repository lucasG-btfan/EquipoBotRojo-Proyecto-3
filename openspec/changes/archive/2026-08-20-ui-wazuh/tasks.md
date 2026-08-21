# Tasks: ui-wazuh (CH20)

Dependencias: requiere CH01 (cimiento-frontend) y CH12 (api-wazuh) — ambos archivados e implementados. No depende de ningún otro change en curso.

## 1. Contrato de datos

- [x] 1.1 Crear `frontend/src/types/wazuh.ts` con la interfaz `ConteoAlertasWazuh` (`total: number`, `mensaje: string`) según design.md D2 — espejo de `ConteoAlertasWazuhSchema`, sin `any`.
- [x] 1.2 Crear `frontend/src/services/wazuhService.ts` con `obtenerConteoAlertasWazuh(): Promise<ConteoAlertasWazuh>` sobre `apiClient.get('/api/wazuh/alerts/count')`, siguiendo el patrón de `prometheusService.ts` (D5).

## 2. Constante de polling

- [x] 2.1 Agregar a `frontend/src/constants/polling.ts` la entrada `WAZUH: 10000` con su comentario de propósito (D3). No reutilizar `METRICAS_SISTEMA`: una constante por sección, como el resto del archivo.

## 3. Componente presentacional

- [x] 3.1 Crear `frontend/src/components/wazuh/ContadorAlertasWazuh.tsx` como componente presentacional puro (props: `total`, `mensaje`, `cargando`, `error`, `onRefrescar`) — sin HTTP ni polling (D1).
- [x] 3.2 Renderizar la card principal: número en `text-5xl font-bold` formateado con `toLocaleString('es-AR')` y el `mensaje` del backend como subtítulo; nunca mostrar `null`/`undefined`/vacío (spec: Contador como card principal).
- [x] 3.3 Renderizar `0` como valor válido sin tratamiento de error (spec: Cero alertas nativas).
- [x] 3.4 Incluir la nota fija sobre alertas de n8n ("se visualizan en las secciones Dashboard y Tickets"), visible tanto con datos como ante error (spec: Diferenciación frente a las alertas de n8n).
- [x] 3.5 Mostrar `Spinner` en lugar del número durante la carga inicial; ante error sin dato previo, mensaje en español + botón "Reintentar"; ante error con dato previo, mantener el último total con aviso en `text-advertencia` (spec: Estados de carga y error, patrón de `PanelAlertas`).
- [x] 3.6 Usar solo tokens semánticos de Tailwind (`borde`, `superficie`, `advertencia`, `peligro`) — ningún color literal.

## 4. Página contenedora e integración

- [x] 4.1 Crear `frontend/src/pages/WazuhPage.tsx` como componente contenedor: `usePolling(obtenerConteoAlertasWazuh, INTERVALOS_POLLING.WAZUH)` — usar la constante nueva, no hardcodear 10000 (D1, D3).
- [x] 4.2 Conectar el botón de refresco manual al `refrescar` del hook y renderizar `ContadorAlertasWazuh` con las props resueltas.
- [x] 4.3 Actualizar `frontend/src/App.tsx`: importar `WazuhPage`, reemplazar `<Placeholder titulo="Wazuh" />` en la ruta `wazuh` y **eliminar el import de `Placeholder`** que queda huérfano al ser la última ruta que lo usaba (D6).
- [x] 4.4 Verificar que `Sidebar.tsx` no requiere cambios (la entrada "Wazuh" ya apunta a `/dashboard/wazuh`).

## 5. Verificación

- [x] 5.1 Verificar tipado TypeScript sin `any` y sin errores de compilación (`npx tsc --noEmit` desde `frontend/` sin salida; sin ocurrencias de `any` en los archivos nuevos).
- [x] 5.2 Verificación manual contra la spec con backend corriendo y sesión iniciada: contador visible con formato local, `0` válido, nota de n8n siempre presente, polling de 10s sin parpadeo, refresco manual inmediato, carga/error/reintento en español, dato previo marcado como desactualizado si la consulta falla, redirección a login con sesión expirada y ausencia total de acciones de escritura.
- [x] 5.3 Confirmar que no se modificó nada fuera de `frontend/` y que no se agregaron dependencias nuevas (`git status --porcelain`: solo archivos nuevos/modificados dentro de `frontend/`; `package.json` sin cambios).

### Notas para la verificación manual (5.2)

Con el backend corriendo (`python -m backend.run`) y sesión iniciada, navegar a `/dashboard/wazuh`:
1. La card muestra el total en grande con separador de miles y el mensaje del backend debajo.
2. Si Wazuh está caído (o se detiene su contenedor), aparece el `detail` en español del 503 + "Reintentar"; al recuperarse Wazuh, el reintento restaura el número sin recargar.
3. El número se refresca solo cada 10s (verificable cambiando el conteo en Wazuh o mirando la pestaña Network); sin parpadeo del spinner en refrescos periódicos.
4. Al navegar a otra sección, las consultas a `/api/wazuh/alerts/count` se detienen.
