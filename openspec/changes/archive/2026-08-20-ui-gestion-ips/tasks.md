## 1. Tipos TypeScript

- [x] 1.1 En `frontend/src/types/alertas.ts`: pasar `recent_count` y `window_start` de `PatronAtaque` a opcionales (`recent_count?: number`, `window_start?: string | null`) y agregar un comentario que explique que `GET /api/ips/attack-patterns` serializa a mano solo 8 campos y no emite esos dos, aunque `PatronAtaqueSchema` los declare (ver design.md D2).
- [x] 1.2 Crear `frontend/src/types/ips.ts`: re-exportar `IPBloqueada` y `MetricaSistema` desde `types/metrics.ts` y `PatronAtaque` desde `types/alertas.ts` (con `export type`), y definir lo nuevo: `RespuestaDesbloqueo { mensaje: string }` (respuesta de `POST /api/ips/{ip}/unblock`) y el union `FiltroEstadoIp = 'activas' | 'inactivas' | 'todas'`. JSDoc de encabezado referenciando `backend/routers/ips.py`. Prohibido `any`.

## 2. Servicio de acceso a la API

- [x] 2.1 Crear `frontend/src/services/ipsService.ts` usando `apiClient`, con las cuatro funciones tipadas de design.md D2: `obtenerIpsBloqueadas({ limit, offset, activo? })` → `GET /api/ips/blocked`; `desbloquearIp(ip)` → `POST /api/ips/{ip}/unblock`; `obtenerPatronesAtaque({ limit, offset, ip?, categoria? })` → `GET /api/ips/attack-patterns`; `obtenerMetricasSistema({ limit, offset })` → `GET /api/metrics/system`. Los parámetros opcionales `undefined` no deben enviarse (pasarlos dentro de `params` y dejar que axios los omita). Retornos tipados como `RespuestaPaginada<T>` / `RespuestaDesbloqueo`. Sin `try/catch` propio: el interceptor de `apiClient` ya normaliza el error a `Error` con mensaje en español.
- [x] 2.2 Exportar en el mismo `ipsService.ts` la constante `FILAS_POR_PAGINA = 20`, usada por los tres bloques como `limit` (design.md D5). No hardcodear el número en los componentes.

## 3. Sub-componente TablaIpsBloqueadas

- [x] 3.1 Crear `frontend/src/components/gestion-ips/TablaIpsBloqueadas.tsx` con el estado base: `respuesta: RespuestaPaginada<IPBloqueada> | null`, `cargando`, `error`, `offset`, `filtroEstado: FiltroEstadoIp` (inicial `'activas'`). Un `useEffect` con dependencias `[offset, filtroEstado]` llama a `obtenerIpsBloqueadas` mapeando el filtro a `activo` (`activas` → `true`, `inactivas` → `false`, `todas` → `undefined`). Sin `usePolling` (design.md D3/D4).
- [x] 3.2 Renderizar la barra superior del bloque: título "IPs bloqueadas", `<select>` de filtro con las tres opciones ("Activas", "Inactivas", "Todas") y botón "Actualizar" que re-dispara la consulta con el estado actual. Cambiar el filtro debe setear `offset` a 0 en la misma actualización de estado.
- [x] 3.3 Renderizar la tabla con `components/common/Tabla`, columnas: IP (`ip_address`, `font-mono`), Puntaje (`threat_score`, `—` si es null), Motivo (`reason`, `—` si es null), Bloqueada el (`blocked_at` con `toLocaleString('es-AR')`), Expira (`blocked_until`, `—` si es null), Estado (`Badge` `exito` "Activa" / `neutro` "Inactiva") y Acción. `claveFila` = `fila.id`. `onCambiarOffset` actualiza el estado `offset`.
- [x] 3.4 Implementar la columna Acción con confirmación en dos pasos (design.md D6): estado `ipEnConfirmacion: string | null` e `ipEnProceso: string | null`. Las filas con `is_active: false` no renderizan ningún botón. La fila activa muestra "Desbloquear"; al accionarlo se reemplaza en esa fila por "¿Confirmar?" y "Cancelar", y solo puede haber una fila en confirmación a la vez.
- [x] 3.5 Implementar la confirmación: llama a `desbloquearIp(ip)`, muestra `Spinner` en la fila y deshabilita su acción mientras dura. En éxito, muestra mensaje verde que se oculta a los 3 segundos con `setTimeout` (aclarando que el desbloqueo fue enviado y que el estado en la base se actualiza al procesar el workflow) y recarga el listado con el `offset` y el filtro actuales. En error, muestra el mensaje del backend en rojo, persistente hasta la siguiente acción, sin alterar el listado.
- [x] 3.6 Renderizar el estado de error de carga del bloque sobre la tabla con el estilo `rounded-lg border border-peligro/30 bg-peligro/10 p-4 text-sm text-peligro` (mismo patrón que `HistorialWorkflows`), y el mensaje de listado vacío que provee `Tabla`.

## 4. Sub-componente TablaPatronesAtaque

- [x] 4.1 Crear `frontend/src/components/gestion-ips/TablaPatronesAtaque.tsx` con estado `respuesta`, `cargando`, `error`, `offset`, `filtroIp`, `filtroCategoria`. Un `useEffect` con dependencias `[offset, filtroIp, filtroCategoria]` aplica un debounce de 400 ms con `setTimeout` + `clearTimeout` en la limpieza (design.md D7) y luego llama a `obtenerPatronesAtaque`, enviando `undefined` para los filtros vacíos (usar `.trim()` antes de decidir).
- [x] 4.2 Renderizar la barra de filtros: título "Patrones de ataque", `<input type="text">` de IP de origen con `placeholder="192.168.100.50"`, `<input type="text">` de categoría con `placeholder` de ejemplo, y botón "Limpiar filtros" que vacía ambos y resetea `offset`. Cualquier cambio de filtro debe resetear `offset` a 0 en la misma actualización de estado.
- [x] 4.3 Renderizar la tabla con `components/common/Tabla`, columnas: Categoría (`pattern_type`), IP de origen (`source_ip`, `font-mono`), Host objetivo (`target_host`, `—` si es null), Primera vez (`first_seen` formateado), Última vez (`last_seen` formateado), Ocurrencias (`occurrence_count`), Bloqueada (`Badge` `peligro` "Bloqueada" / `neutro` "No bloqueada" según `is_blocked`). `claveFila` = `fila.id`.
- [x] 4.4 Mostrar, fuera de la tabla y en la barra de filtros, el mensaje "No hay patrones para el filtro aplicado." cuando `total === 0` y al menos un filtro está activo (design.md D5). Renderizar también el bloque de error con el mismo estilo del punto 3.6.

## 5. Sub-componente TablaMetricasSistema

- [x] 5.1 Crear `frontend/src/components/gestion-ips/TablaMetricasSistema.tsx` con estado `offset` y `usePolling<RespuestaPaginada<MetricaSistema>>(() => obtenerMetricasSistema({ limit: FILAS_POR_PAGINA, offset }), INTERVALOS_POLLING.METRICAS_SISTEMA)`. No agregar constantes nuevas de polling: `METRICAS_SISTEMA` ya existe en `constants/polling.ts`.
- [x] 5.2 Agregar un `useEffect` con dependencia `[offset]` que llame a `refrescar()` del hook, para que un cambio de página consulte de inmediato sin esperar al próximo tick; verificar que el intervalo posterior siga usando el `offset` nuevo (design.md D3).
- [x] 5.3 Renderizar la tabla con `components/common/Tabla`, título "Métricas del sistema", columnas: Fecha (`timestamp` formateado, `—` si es null), Host (`hostname`), Métrica (`metric_name`), Valor (`metric_value`, `—` si es null), Unidad (`unit`, `—` si es null). `claveFila` = `fila.id`. `onCambiarOffset` actualiza `offset`. Error del hook renderizado con el mismo estilo del punto 3.6; sin spinner en los refrescos periódicos (ya lo garantiza `usePolling`).

## 6. Página orquestadora

- [x] 6.1 Crear `frontend/src/pages/GestionIpsPage.tsx`: título `h1` "Gestión de IPs" y los tres bloques apilados a ancho completo en el orden IPs bloqueadas → Patrones de ataque → Métricas del sistema, con la estructura visual de `LogsDeteccionPage` (`flex flex-col gap-6 p-6 lg:p-8`, cada bloque en su `<section>`). La página solo compone: nada de estado ni de llamadas HTTP en este archivo.

## 7. Routing

- [x] 7.1 En `frontend/src/App.tsx`: agregar `import { GestionIpsPage } from './pages/GestionIpsPage'` y reemplazar `<Placeholder titulo="Gestión de IPs" />` por `<GestionIpsPage />` en la ruta `path="ips"`. No tocar el resto del árbol de rutas ni el sidebar.

## 8. Verificación

- [x] 8.1 Correr `npm run build` en `frontend/` (`tsc -b && vite build`) y confirmar que compila sin errores de tipos; correr `npm run lint` y dejarlo limpio. Verificar que no quedó ningún `any` ni ninguna URL/IP hardcodeada en los archivos creados.
- [x] 8.2 Verificación manual con el stack levantado: navegar a `/dashboard/ips`, comprobar los tres bloques cargando, la paginación en cada tabla, el filtro de estado de IPs, los filtros de patrones con debounce, la actualización cada 10 s de métricas conservando la página, y el flujo completo de desbloqueo (confirmar, cancelar y caso de error).
