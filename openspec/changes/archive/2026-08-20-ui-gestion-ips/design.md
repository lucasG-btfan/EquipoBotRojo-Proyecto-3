## Context

Ver `proposal.md` — Why. Lo relevante para el diseño es el estado actual del frontend y el contrato exacto que ya emite el backend.

**Lo que ya existe y este change reutiliza:**

- `hooks/usePolling.ts`: polling genérico con `habilitado`, `refrescar()` manual, y supresión del spinner en refrescos posteriores al primero. Guarda la petición en un `ref`, así que una función inline recreada en cada render no reinicia el intervalo — pero **las dependencias del efecto son solo `habilitado` e `intervaloMs`**: un cambio de filtro o de offset NO dispara por sí solo una nueva consulta. Es la restricción central de este diseño (ver D3).
- `components/common/Tabla.tsx`: tabla genérica que ya implementa la paginación offset/limit sobre `RespuestaPaginada<T>`, con botones Anterior/Siguiente y el indicador "Mostrando X–Y de N".
- `components/common/Card.tsx`, `Badge.tsx` (variantes semánticas), `Spinner.tsx`.
- `services/apiClient.ts`: axios con JWT inyectado, manejo de 401 y normalización del mensaje de error a español (`new Error(detail)`).
- `constants/polling.ts`: `INTERVALOS_POLLING.METRICAS_SISTEMA = 10000` ya declarada y sin consumidor.
- `types/metrics.ts`: `IPBloqueada` y `MetricaSistema`; `types/alertas.ts`: `PatronAtaque`.

**Contrato real del backend (`backend/routers/ips.py`), verificado leyendo el router:**

| Endpoint | Query params | Respuesta |
|---|---|---|
| `GET /api/ips/blocked` | `limit` (1–100, def. 20), `offset` (≥0), `activo` (bool, opcional) | `{items, total, limit, offset}` |
| `POST /api/ips/{ip}/unblock` | — | `{mensaje}`; errores 400/404/500/504 con `detail` en español |
| `GET /api/ips/attack-patterns` | `limit`, `offset`, `ip` (match exacto sobre `source_ip`), `categoria` (match exacto sobre `pattern_type`) | `{items, total, limit, offset}` |
| `GET /api/metrics/system` | `limit`, `offset` | `{items, total, limit, offset}` |

Los routers construyen los `items` como diccionarios a mano, **no** serializando los schemas Pydantic. Eso importa: `attack-patterns` emite 8 campos y omite `recent_count` y `window_start`, que sí están en `PatronAtaqueSchema` y en el tipo TS actual (ver D2).

## Goals / Non-Goals

**Goals (de diseño):**

- Que los tres bloques compartan un único patrón de "tabla paginada con filtros" en vez de tres implementaciones distintas.
- Que los filtros y la paginación disparen consultas de forma correcta pese a la limitación de dependencias de `usePolling`.
- Que la única acción destructiva de la página (desbloqueo) sea imposible de disparar por un click accidental.

**Non-Goals (de diseño):**

- No se generaliza el patrón de filtros a un hook reutilizable de toda la app: se resuelve dentro de esta sección; si CH17 (Tickets) necesita lo mismo, ahí se evalúa extraerlo.
- No se toca `usePolling` ni `Tabla` para adaptarlos: se usan como están (ver D3 y D5).
- No se introduce librería de estado remoto (react-query o similar) — sería una dependencia nueva y está prohibido instalar sin consultar.

## Decisions

### D1: Estructura de archivos

```
pages/
  GestionIpsPage.tsx                ← orquestador de los 3 bloques
components/gestion-ips/
  TablaIpsBloqueadas.tsx            ← listado + filtro de estado + desbloqueo
  TablaPatronesAtaque.tsx           ← listado + filtros IP/categoría
  TablaMetricasSistema.tsx          ← listado + polling 10 s
services/
  ipsService.ts                     ← las 4 llamadas HTTP, tipadas
types/
  ips.ts                            ← tipos propios de la sección
```

Mismo patrón que `ui-logs-deteccion` (carpeta kebab-case por sección, un sub-componente por bloque, página orquestadora que solo compone). Cada sub-componente maneja su propio estado de carga/error, de modo que un bloque caído no tumba la página (requisito "Aislamiento de errores").

**Alternativa descartada:** un único componente con los tres fetch y un estado compartido — acopla los errores de los tres bloques y hace que un fallo de `system_metrics` oculte las IPs bloqueadas.

### D2: Capa de servicio y tipos

A diferencia de `ui-logs-deteccion`, que llama a `apiClient` directamente desde cada componente, acá se introduce `services/ipsService.ts`. Motivo: los cuatro endpoints tienen parámetros de consulta condicionales (`activo` solo si no es "todas", `ip`/`categoria` solo si no están vacíos) y esa lógica de armado no debe repetirse ni filtrarse a la capa de vista. El servicio expone:

```typescript
obtenerIpsBloqueadas(params: { limit: number; offset: number; activo?: boolean }): Promise<RespuestaPaginada<IPBloqueada>>
desbloquearIp(ip: string): Promise<RespuestaDesbloqueo>
obtenerPatronesAtaque(params: { limit: number; offset: number; ip?: string; categoria?: string }): Promise<RespuestaPaginada<PatronAtaque>>
obtenerMetricasSistema(params: { limit: number; offset: number }): Promise<RespuestaPaginada<MetricaSistema>>
```

Un parámetro `undefined` no se envía (axios omite las claves `undefined` en `params`), que es exactamente la semántica de "sin filtro" del backend.

`types/ips.ts` no duplica tipos: re-exporta `IPBloqueada` y `MetricaSistema` desde `types/metrics.ts` y `PatronAtaque` desde `types/alertas.ts`, y agrega solo lo nuevo (`RespuestaDesbloqueo { mensaje: string }` y el union `FiltroEstadoIp = 'activas' | 'inactivas' | 'todas'`). Así la sección tiene un único punto de import sin fragmentar la fuente de verdad de los tipos.

**Corrección obligatoria en `types/alertas.ts`:** `PatronAtaque` declara `recent_count: number` y `window_start: string | null` como requeridos, pero `GET /api/ips/attack-patterns` no los emite. Se los pasa a opcionales (`recent_count?`, `window_start?`) con un comentario que explica la discrepancia entre el schema Pydantic y lo que el router realmente serializa. Es la opción menos invasiva: hoy nadie consume ese tipo (verificado por grep), y mentirle al compilador sobre campos ausentes es peor que declararlos opcionales.

**Alternativa descartada:** modificar el backend para que emita los dos campos faltantes. Este change es solo frontend y esos campos no se muestran en la tabla; ampliar el payload sin consumidor no aporta.

### D3: Cómo se disparan las consultas con filtros y paginación

`usePolling` re-ejecuta el efecto solo ante cambios de `habilitado` o `intervaloMs`; un cambio de `offset` o de filtro no lo despierta. Se resuelve con la estrategia ya usada en el proyecto sin tocar el hook: **cada bloque mantiene su propio estado (`offset`, filtros) y un `useEffect` que dispara la consulta cuando ese estado cambia**, y solo la tabla de métricas suma polling encima.

Concretamente:

- **`TablaIpsBloqueadas` y `TablaPatronesAtaque`**: `useState` para `respuesta`, `cargando`, `error`, `offset` y filtros; un `useEffect` con esas dependencias que llama al servicio. Nada de `usePolling` — son tablas que el operador lee, no un flujo en vivo, y refrescarlas por debajo mientras lee o confirma un desbloqueo es peor UX que un refresco explícito.
- **`TablaMetricasSistema`**: `usePolling(peticion, INTERVALOS_POLLING.METRICAS_SISTEMA)` para el refresco cada 10 s, **más** un `useEffect` sobre `offset` que llama a `refrescar()` cuando el operador cambia de página. `usePolling` guarda la petición en un ref actualizado en cada render, así que el `refrescar()` disparado tras un cambio de `offset` ya usa el offset nuevo, y el intervalo siguiente también: la posición de paginación se conserva entre refrescos (requisito explícito del spec).

**Alternativa descartada:** agregar un array de dependencias a `usePolling`. Cambiaría la firma de un hook que ya consumen `LogViewer`, `HistorialWorkflows` y `DashboardPage`; el costo de regresión no se justifica para tres tablas.

### D4: Por qué solo `system_metrics` tiene polling

`AGENTS.md` fija polling para el visor de `alerts.log` (3 s), métricas/contenedores (10 s) y Fail2ban (10 s). `blocked_ips` y `attack_patterns` no están en esa lista, y `INTERVALOS_POLLING.METRICAS_SISTEMA` existe justamente para la tabla de métricas de sistema. Además, refrescar automáticamente una tabla con filtros y confirmación de desbloqueo abierta genera saltos visuales sobre la fila que el operador está por accionar.

Para esas dos tablas se ofrece en cambio un botón "Actualizar" explícito, y el listado de IPs bloqueadas se refresca solo además tras un desbloqueo exitoso (ver D6).

### D5: Reutilización de `components/common/Tabla`

Los tres bloques usan `Tabla<T>` tal cual está: ya consume `RespuestaPaginada<T>`, ya calcula rango y habilitación de los botones, y ya renderiza los estados de carga y vacío. Cada bloque aporta solo su array de `ColumnaTabla<T>`, su `claveFila` (siempre `fila.id`) y su handler `onCambiarOffset`.

Dos consecuencias a respetar en la implementación:

- El texto de la tabla vacía que provee `Tabla` es genérico ("Sin datos para mostrar"); los mensajes específicos exigidos por el spec ("no hay patrones para el filtro aplicado") se muestran **fuera** de la tabla, en la barra de filtros del bloque, cuando `total === 0` y hay un filtro activo.
- El error se renderiza sobre la tabla, en el mismo estilo que `HistorialWorkflows` (`border-peligro/30 bg-peligro/10`), no dentro de `Tabla`.

`FILAS_POR_PAGINA = 20` se define como constante del módulo de la sección (no se hardcodea en cada llamada), dentro del rango 20–50 que fija `AGENTS.md`.

### D6: Desbloqueo con confirmación en dos pasos

La acción llama a `fail2ban-client unbanip` sobre el stack real: es destructiva e irreversible desde la UI. Se implementa como confirmación en línea dentro de la propia fila (estado `ipEnConfirmacion: string | null`): el botón "Desbloquear" se sustituye por "¿Confirmar?" + "Cancelar" en esa fila. Solo puede haber una fila en confirmación a la vez.

Al confirmar: `desbloquearIp(ip)` → spinner en la fila (`ipEnProceso`) → en éxito, mensaje verde efímero (3 s, mismo patrón que `BotonesWorkflow`) y **recarga del listado** con el `offset` y el filtro actuales; en error, el mensaje del backend (ya traducido por el interceptor de `apiClient`) persiste hasta la siguiente acción y el listado no se toca.

Las filas con `is_active: false` no renderizan la acción: el backend responde 404 sobre ellas, así que ofrecerla sería ofrecer un error garantizado.

**Alternativas descartadas:** `window.confirm()` — rompe el estilo del panel y no es tipable ni estilable; un componente `Modal` nuevo — es infraestructura que ninguna otra sección pidió todavía.

### D7: Filtros de patrones de ataque — texto libre con debounce

El backend filtra por igualdad exacta sobre `source_ip` y `pattern_type`, y **no expone un catálogo de categorías**. Por eso ambos filtros son `<input type="text">`, no `<select>`: un desplegable exigiría un endpoint de categorías distintas que no existe.

Se aplica un debounce de 400 ms (implementado con `setTimeout` + limpieza en el `useEffect`, sin librería) para no disparar una consulta por pulsación. Cualquier cambio de filtro resetea `offset` a 0 en el mismo `setState`, evitando el estado inconsistente de "página 3 de un resultado de 2 filas".

Como el match es exacto, un filtro parcial (`192.168`) no devuelve nada. Se mitiga con un `placeholder` que muestra el formato esperado (`192.168.100.50`) y con el mensaje explícito de "sin resultados para el filtro aplicado" en vez del vacío genérico.

### D8: Formato de valores

Se reusan las convenciones ya establecidas en `HistorialWorkflows` y `DashboardPage`:

- Timestamps: `toLocaleString('es-AR')` con día/mes/año y hora:minuto:segundo; `null` → `—`.
- Cualquier campo nulo (`threat_score`, `reason`, `blocked_until`, `unit`, `metric_value`) → `—`.
- Booleanos de estado con `Badge`: `is_active` → "Activa" (`exito`) / "Inactiva" (`neutro`); `is_blocked` → "Bloqueada" (`peligro`) / "No bloqueada" (`neutro`).
- `threat_score` se muestra como número crudo; no se define umbral de color porque el proyecto no fija ninguno.

Los helpers de formato viven en el archivo de su bloque; si un tercer bloque necesitara el mismo `formatearFecha`, ahí se evalúa moverlo a `utils/`.

### D9: Integración en `App.tsx`

Un `import { GestionIpsPage } from './pages/GestionIpsPage'` y el reemplazo de `<Placeholder titulo="Gestión de IPs" />` por `<GestionIpsPage />` en la ruta `path="ips"`. No se toca el árbol de rutas, el sidebar (ya apunta a `/dashboard/ips`) ni `ProtectedRoute` — la protección de sesión ya la da el layout padre.

## Risks / Trade-offs

- **[Riesgo] El desbloqueo no actualiza PostgreSQL de inmediato** → El backend documenta explícitamente que no toca la base: `fail2ban` dispara el workflow de n8n que la actualiza. La recarga inmediata del listado puede seguir mostrando la IP como activa unos segundos. Mitigación: el mensaje de éxito dice que el desbloqueo fue enviado y que el estado se refleja al procesarse; el operador tiene el botón "Actualizar". No se agrega reintento automático porque adivinar la latencia del workflow sería frágil.
- **[Riesgo] Filtro por IP con match exacto genera falsos "sin resultados"** → Mitigado con placeholder de formato y mensaje explícito (D7). Ampliar el backend a match parcial (`LIKE`) queda fuera de alcance de este change.
- **[Trade-off] Sin polling en dos de las tres tablas** → Los datos de IPs bloqueadas pueden quedar desactualizados si el operador deja la pestaña abierta. Se acepta a cambio de una UI estable durante el filtrado y la confirmación de desbloqueo; el botón "Actualizar" cubre el caso.
- **[Trade-off] Tres implementaciones parecidas de "estado de tabla + filtros"** → Hay duplicación deliberada entre los tres sub-componentes en vez de un hook `useTablaPaginada` prematuro. Con solo dos consumidores reales de filtros, extraer la abstracción ahora fijaría una forma antes de conocer el caso de Tickets (CH17).
- **[Riesgo] `PatronAtaque` pasa a tener campos opcionales** → Si en el futuro alguien consume `recent_count` asumiéndolo presente, TypeScript lo obliga a hacer narrowing. Es el comportamiento deseado, no una regresión.
