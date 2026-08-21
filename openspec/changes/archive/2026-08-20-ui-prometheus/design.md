# Design: ui-prometheus (CH19)

## Context

Ver `proposal.md` — Why. Restricciones que condicionan el enfoque:

**Forma real de la respuesta de `GET /api/prometheus/alerts`.** Verificada leyendo `backend/routers/prometheus.py` y `backend/services/prometheus_service.py` (`obtener_alertas_completas`). No es la que asumía `DashboardPage.tsx`:

```json
{
  "alertas": [
    { "nombre": "IpBaneadaDetectada", "descripcion": "IP baneada detectada por Fail2ban", "estado": "firing" },
    { "nombre": "Fail2banCaido",      "descripcion": "Fail2ban no está activo",            "estado": "inactive" },
    { "nombre": "AtaqueMasivo",       "descripcion": "Ataque masivo detectado",            "estado": "no_configurada" }
  ],
  "fail2ban": { "banned_ips": 3, "up": 1.0 },
  "ultima_actualizacion": "2026-08-20T12:00:00+00:00"
}
```

Puntos verificados que hay que respetar:
- Cada alerta trae **`descripcion`**, no `severidad`. `DashboardPage.tsx` declara hoy un tipo inline con `severidad: string | null`, campo que el backend nunca envía (llega siempre `undefined`). Es una discrepancia preexistente del CH14, no un cambio de esta entrega.
- `estado` toma los valores de Prometheus (`firing` | `pending` | `inactive`), y `"no_configurada"` cuando la regla no existe en `/api/v1/rules`. `_extraer_estado_alertas` puede además devolver `"desconocido"` si la regla existe pero no trae `state`.
- El orden de `alertas` es estable: viene de iterar el dict `ALERTAS_ESPERADAS` del backend, en el orden `IpBaneadaDetectada`, `Fail2banCaido`, `AtaqueMasivo`.
- `fail2ban.up` es **`float | None`** (`1.0` / `0.0`), no booleano — `DashboardPage.tsx` lo tipa hoy como `boolean | null`, lo cual es incorrecto.
- **No hay `value` ni `activeAt` por alerta.** El backend descarta las anotaciones y el `activeAt` que Prometheus expone en `/api/v1/rules`.

**Infraestructura ya disponible:** `usePolling` (hook genérico, no parpadea en refrescos periódicos), `INTERVALOS_POLLING.PROMETHEUS = 30000` ya definida en `constants/polling.ts`, `Card` / `Badge` / `Spinner` en `components/common/`, `apiClient` con interceptor de sesión, y la ruta `/dashboard/prometheus` + entrada de Sidebar ya existentes desde CH13 (hoy renderizan `Placeholder`).

**Gobernanza:** LOW — sección de solo lectura, sin efectos sobre el stack.

## Goals / Non-Goals

**Goals:**
- Tipar la respuesta real del backend en un módulo compartido y reutilizable, sin `any`.
- Cubrir los dos campos que el roadmap pide y el backend no entrega (`valor actual`, `tiempo activo`) sin tocar el backend y sin inventar datos.
- Seguir el patrón de composición ya establecido por CH18 (page fina + componente contenedor + servicio + tipos).

**Non-Goals:**
- Corregir la discrepancia de tipos inline de `DashboardPage.tsx` (`severidad`, `up: boolean`). Es refactor de otra sección; se documenta como deuda en Riesgos.
- Cambiar el backend para exponer `activeAt` o el valor de la expresión de cada alerta.
- Cualquier vista de serie temporal o gráfica.

## Decisions

### D1 — Composición: page fina + panel contenedor + tarjeta presentacional

- `PrometheusPage.tsx` — solo layout y título; sin estado ni HTTP (igual que `Fail2banPage`).
- `PanelAlertas.tsx` — componente contenedor: hace el polling, maneja carga/error/última actualización, calcula el tiempo en FIRING y mapea la métrica de cada alerta.
- `TarjetaAlerta.tsx` — componente **presentacional puro**: recibe props ya resueltas (nombre, descripción, estado, valor actual, tiempo activo) y no sabe nada de HTTP.

*Alternativa descartada:* un único componente monolítico como `EstadoJail` de CH18. Aquí hay 3 tarjetas con la misma estructura, así que separar la tarjeta evita repetir el mapeo de color tres veces y la deja testeable/reutilizable si el Dashboard quiere embeberla más adelante.

### D2 — Tipos (`types/prometheus.ts`)

```typescript
export type EstadoAlerta = 'firing' | 'pending' | 'inactive' | 'no_configurada' | 'desconocido'

export interface AlertaPrometheus {
  nombre: string
  descripcion: string
  // El backend puede devolver un estado fuera del conjunto conocido; se acepta
  // string para no romper el render, y el mapeo de color cae en "neutro".
  estado: EstadoAlerta | string
}

export interface MetricasFail2banPrometheus {
  banned_ips: number | null
  up: number | null
}

export interface RespuestaAlertasPrometheus {
  alertas: AlertaPrometheus[]
  fail2ban: MetricasFail2banPrometheus
  ultima_actualizacion: string | null
}
```

`estado` se tipa como unión abierta (`EstadoAlerta | string`) en lugar de unión cerrada: el backend documenta 4 valores pero `_extraer_estado_alertas` puede emitir `"desconocido"`, y un cambio de reglas en Prometheus no debe romper el render. No se usa `any` en ningún punto (regla dura).

### D3 — "Valor actual": mapeo explícito alerta → métrica

El backend no entrega un valor por alerta, pero sí el bloque `fail2ban`. Se define en el frontend una tabla de correspondencia:

| Alerta | Métrica | Presentación |
|---|---|---|
| `IpBaneadaDetectada` | `fail2ban.banned_ips` | `"3 IPs baneadas"` |
| `Fail2banCaido` | `fail2ban.up` | `1` → `"Fail2ban activo"`, `0` → `"Fail2ban caído"` |
| `AtaqueMasivo` | `alerta.estado` | `firing` → `"Ataque masivo en curso (10 o más IPs baneadas)"`, resto → `"Sin ataque masivo detectado"` |

`null` → guion. `up` se traduce a texto en lugar de mostrar `1.0` crudo, que no significa nada para el operador.

`AtaqueMasivo` no tiene una métrica propia expuesta por el backend, pero sí sabemos (regla real en `alert_rules.yml` del stack, confirmada por el equipo) que la condición es `fail2ban_banned_ips > 10`. En vez de mostrar un texto genérico, se traduce el `estado` ya recibido a un mensaje que menciona el umbral — sin inventar un número, sin consultar una métrica nueva y sin duplicar la lógica de la regla (el backend/Prometheus sigue siendo la única fuente de verdad sobre si está en `firing`).

*Alternativa descartada:* pedir al backend que agregue el `value` de cada alerta desde `/api/v1/rules`. Es la solución correcta a largo plazo, pero está fuera del alcance de CH19 (sin cambios al backend) y requeriría un change propio sobre `metricas-prometheus`.

### D4 — "Tiempo activo": medición observada del lado del cliente

El backend no expone `activeAt`, así que el tiempo real desde que la alerta se disparó es inaccesible. En vez de omitir el dato o inventarlo, `PanelAlertas` guarda en un `useRef<Record<string, number>>` el `Date.now()` de la **primera lectura** en que vio cada alerta en `firing`, y borra la entrada cuando la alerta deja de estarlo (lo que hace que un re-disparo cuente desde cero, según la spec).

La tarjeta muestra el tiempo con una etiqueta explícita del tipo *"activa desde hace 4m (observado)"*, para no mentirle al operador: si la alerta ya estaba disparada antes de abrir la sección, el contador arranca en 0.

*Alternativa descartada:* usar `ultima_actualizacion` como origen — daría siempre ~0 y sería directamente incorrecto.

Se usa `useRef` y no `useState` porque el valor no debe provocar re-render por sí mismo; el re-render lo dispara el ciclo de polling.

El registro se persiste además en `sessionStorage` (clave `prometheus_inicio_firing`) para que un refresh de la pestaña no reinicie el contador — se pierde igual al cerrar la pestaña, ya que sigue siendo una medición del cliente, no el timestamp real del backend. Lectura/escritura envueltas en try/catch por si `sessionStorage` no está disponible (ej. modo privado del navegador); en ese caso el timer sigue funcionando en memoria, solo no sobrevive a un refresh.

### D5 — Mapeo de estado a variante de `Badge`

```
firing         → 'peligro'      (rojo)
pending        → 'advertencia'  (amarillo)
inactive       → 'exito'        (verde)
no_configurada → 'neutro'
otro           → 'neutro'
```

Vía un `Record<string, VarianteBadge>` con acceso por defecto a `'neutro'`, para no escribir colores literales (regla D6 de CH13: solo tokens semánticos de `tailwind.config.js`). La etiqueta de texto se traduce al español (`Disparada` / `Pendiente` / `Inactiva` / `No configurada`); un estado no mapeado muestra su valor crudo.

### D6 — Polling y renderizado del orden

`usePolling(obtenerAlertasPrometheus, INTERVALOS_POLLING.PROMETHEUS)` — la constante de 30s ya existe, no se agrega ninguna. Botón de refresco manual conectado a `refrescar` del hook.

Para garantizar el orden fijo de la spec sin depender del backend, `PanelAlertas` renderiza sobre una constante local `ALERTAS_ESPERADAS = ['IpBaneadaDetectada', 'Fail2banCaido', 'AtaqueMasivo']` y busca cada una en la respuesta; cualquier alerta recibida fuera de esa lista se renderiza al final. Así la vista es estable aunque cambie el orden del dict del backend.

### D7 — Servicio

`services/prometheusService.ts` con una única función `obtenerAlertasPrometheus(): Promise<RespuestaAlertasPrometheus>` sobre `apiClient.get`, calcado del patrón de `fail2banService.ts`. Nombre de archivo en camelCase, componentes en PascalCase, carpeta `components/prometheus/` en kebab-case.

## Risks / Trade-offs

- **El "tiempo activo" no es el tiempo real de la alerta** → Se etiqueta explícitamente como *observado* en la UI y se documenta en la spec. Solución definitiva: exponer `activeAt` desde el backend en un change futuro.
- **`AtaqueMasivo` no tiene métrica propia** → Se deriva el mensaje del `estado` ya recibido, mencionando el umbral conocido de la regla (`> 10 IPs baneadas`) en vez de mostrar un número. Si el umbral de la regla cambia en el futuro, este texto queda desactualizado hasta que se actualice a mano — no hay forma de leerlo dinámicamente sin exponerlo desde el backend.
- **Deuda preexistente en `DashboardPage.tsx`** (tipo inline con `severidad` inexistente y `up: boolean` incorrecto) → Fuera de alcance de CH19; el nuevo `types/prometheus.ts` queda disponible para que un change de limpieza posterior lo reemplace. No se toca `DashboardPage.tsx` en esta entrega para no mezclar alcances.
- **Un cambio de nombres de reglas en Prometheus deja las 3 tarjetas en `no_configurada`** → Es el comportamiento deseado: la vista sirve justamente para detectar eso, y muestra el motivo en español en lugar de una pantalla vacía.
- **El contador de tiempo solo avanza al ritmo del polling (30s)** → Aceptado: la granularidad de 30s es suficiente para esta lectura, y evita un `setInterval` de 1s adicional por tarjeta.

**Nota fuera de alcance, incluida en esta rama por bloquear la verificación manual:** durante la prueba de CH19 se detectó que en Windows todos los endpoints que usan PostgreSQL fallaban con `psycopg.InterfaceError: ... ProactorEventLoop ...`, porque `psycopg` async no soporta el event loop por defecto de asyncio en Windows. No tiene relación con Prometheus ni con este change, pero impedía probar el resto del dashboard.

Un primer intento de arreglo (fijar la política en `backend/main.py`) no funcionó: `python -m uvicorn backend.main:app` crea su propio event loop (Proactor, default de Windows) *antes* de importar `backend.main` — el módulo recién se importa dentro del loop ya corriendo, así que fijar la política ahí llega tarde. La solución real es `backend/run.py`, un entry point que fija `WindowsSelectorEventLoopPolicy` antes de invocar a `uvicorn.run(...)`, de forma que el loop que uvicorn crea ya nace con la política correcta. A partir de ahora el backend se levanta con `python -m backend.run` en vez de `python -m uvicorn backend.main:app` (mismo host/puerto, 0.0.0.0:8000).
