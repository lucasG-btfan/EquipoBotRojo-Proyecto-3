# Tasks: ui-prometheus (CH19)

## 1. Contrato de datos

- [x] 1.1 Crear `frontend/src/types/prometheus.ts` con `EstadoAlerta`, `AlertaPrometheus`, `MetricasFail2banPrometheus` y `RespuestaAlertasPrometheus` según design.md D2 — sin `any`, `fail2ban.up` tipado `number | null`, `estado` como unión abierta.
- [x] 1.2 Crear `frontend/src/services/prometheusService.ts` con `obtenerAlertasPrometheus(): Promise<RespuestaAlertasPrometheus>` sobre `apiClient.get('/api/prometheus/alerts')`, siguiendo el patrón de `fail2banService.ts`.

## 2. Componente de tarjeta

- [x] 2.1 Crear `frontend/src/components/prometheus/TarjetaAlerta.tsx` como componente presentacional puro (props: nombre, descripción, estado, valor actual, tiempo activo).
- [x] 2.2 Implementar el mapeo estado → variante de `Badge` y etiqueta en español (D5): `firing`→peligro/"Disparada", `pending`→advertencia/"Pendiente", `inactive`→exito/"Inactiva", `no_configurada`→neutro/"No configurada", cualquier otro→neutro con el valor crudo.
- [x] 2.3 Renderizar el valor actual; mostrar guion o texto en español cuando sea nulo o no aplique (nunca `null`/`undefined`/vacío).
- [x] 2.4 Renderizar el tiempo activo solo cuando el estado es `firing`, con la aclaración de que es tiempo observado.
- [x] 2.5 Usar solo tokens semánticos de Tailwind (`peligro`, `advertencia`, `exito`, `borde`, `superficie`) — ningún color literal.

## 3. Panel contenedor

- [x] 3.1 Crear `frontend/src/components/prometheus/PanelAlertas.tsx` con `usePolling(obtenerAlertasPrometheus, INTERVALOS_POLLING.PROMETHEUS)` — usar la constante existente, no hardcodear 30000.
- [x] 3.2 Definir la constante local con el orden fijo `IpBaneadaDetectada`, `Fail2banCaido`, `AtaqueMasivo` y renderizar en ese orden; alertas recibidas fuera de la lista se renderizan al final (D6).
- [x] 3.3 Implementar el mapeo alerta → métrica de D3 (`banned_ips` para IP baneada, `up` traducido a "Fail2ban activo/caído" para Fail2ban caído, "Sin métrica asociada" para ataque masivo).
- [x] 3.4 Implementar la medición de tiempo en FIRING con `useRef<Record<string, number>>`: registrar en la primera lectura `firing`, borrar la entrada cuando el estado deja de ser `firing` (reinicio en re-disparo, D4).
- [x] 3.5 Implementar estado de carga inicial con `Spinner`, mensaje de error en español dentro de la sección, y desaparición del error cuando una lectura posterior tiene éxito.
- [x] 3.6 Agregar botón de refresco manual conectado a `refrescar` del hook y mostrar `ultima_actualizacion` formateada en local `es-AR` (nunca ISO crudo).

## 4. Página e integración

- [x] 4.1 Crear `frontend/src/pages/PrometheusPage.tsx` — page fina con título "Prometheus" que solo renderiza `PanelAlertas` (patrón de `Fail2banPage.tsx`).
- [x] 4.2 Actualizar `frontend/src/App.tsx`: importar `PrometheusPage` y reemplazar `<Placeholder titulo="Prometheus" />` en la ruta `prometheus`.
- [x] 4.3 Verificar que `Sidebar.tsx` no requiere cambios (la entrada "Prometheus" ya apunta a `/dashboard/prometheus`).

## 5. Verificación

- [x] 5.1 Verificar tipado TypeScript sin `any` y sin errores de compilación en los archivos nuevos y modificados. (`npx tsc --noEmit` sin salida; sin ocurrencias de `any` en los archivos nuevos)
- [x] 5.2 Verificar contra la spec: las 3 tarjetas siempre presentes, colores por estado, valor actual sin `null` visible, tiempo activo solo en `firing`, polling de 30s desde constante, refresco manual, carga y error en español, sección de solo lectura. Confirmado por el usuario en navegador con el backend corriendo (ver notas de verificación abajo).
- [x] 5.3 Confirmar que no se modificó nada fuera de `frontend/` y que no se agregaron dependencias nuevas. (`git status --porcelain`: solo `frontend/App.tsx` modificado + archivos nuevos en `frontend/`; `package.json` sin cambios)

### Notas de verificación manual (5.2)

Con el backend corriendo y sesión iniciada, navegar a `/dashboard/prometheus` y confirmar:
1. Siempre aparecen 3 tarjetas (`IpBaneadaDetectada`, `Fail2banCaido`, `AtaqueMasivo`) en ese orden, aunque alguna no esté configurada en Prometheus.
2. Colores: `firing` → rojo (peligro), `pending` → amarillo (advertencia), `inactive` → verde (éxito), `no_configurada`/otro → neutro.
3. "Valor actual": IP baneada muestra `N IPs baneadas` o `—`; Fail2ban caído muestra "Fail2ban activo"/"Fail2ban caído" (nunca `1`/`0` crudo) o `—`; Ataque masivo muestra "Ataque masivo en curso (10 o más IPs baneadas)" si `firing`, o "Sin ataque masivo detectado" en cualquier otro estado. Nunca aparece `null`/`undefined`/vacío.
4. "Tiempo disparada" solo aparece si el estado es `firing`, arranca en 0 al detectarlo, crece de forma monótona en refrescos sucesivos, desaparece si pasa a `inactive`/`pending`, se reinicia a 0 si se vuelve a disparar tras haberse apagado, y **sobrevive a un refresh de la pestaña** (persistido en `sessionStorage`).
5. El polling ocurre cada 30s sin parpadeo de la carga inicial; el botón "Actualizar" refresca de inmediato.
6. "Última actualización" se muestra en formato local `es-AR`, nunca como ISO crudo.
7. Ante error de conexión/timeout se muestra el mensaje en español y se puede reintentar; al recuperarse, el mensaje desaparece.
8. No hay ningún control que escriba o modifique el estado de Prometheus/Fail2ban — solo lectura y refresco.
