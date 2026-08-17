# Design: cimiento-frontend

## Context

Ver `proposal.md` — Why para la motivación. Lo relevante para el diseño es el estado actual:

- `frontend/` existe pero está **vacío**. Todo se crea desde cero.
- `backend/` ya está implementado (CH00, archivado): `main.py` con CORS sobre `FRONTEND_ORIGIN`, `POST /api/auth/login` funcional que devuelve `{ access_token, token_type }`, y 10 routers más registrados como stubs que hoy responden 200 con `{"mensaje": "Endpoint no implementado"}`.
- Los prefijos reales de los routers ya están fijados: `/api/auth`, `/api/status`, `/api/alerts`, `/api/logs`, `/api/workflows`, `/api/metrics`, `/api/fail2ban`, `/api/wazuh`, y `/api` para `ips` y `prometheus` (`/api/ips/...`, `/api/metrics/tpw`, `/api/prometheus/alerts`).
- Los schemas Pydantic de `backend/schemas/` son la fuente de verdad de los tipos que el frontend va a recibir. Mezclan idiomas: las entidades que vienen de PostgreSQL conservan nombres de columna en inglés (`source_ip`, `is_active`, `ticket_number`), mientras que las que arma el backend a mano están en español (`nombre`, `estado`, `cpu_porcentaje`).
- Reglas duras que condicionan el diseño: nada de `any`, nada de WebSockets/SSE, nada fuera de `frontend/`, sin dependencias no aprobadas, puerto 5173, todo el código y los mensajes en español, componentes en `PascalCase` / hooks y servicios en `camelCase` / carpetas en `kebab-case`.

## Goals / Non-Goals

**Goals:**

- Que `npm run dev` levante en el puerto 5173 una app que navega entre las 8 secciones con el layout y el tema oscuro definitivos.
- Que exista un único punto de entrada HTTP (`apiClient`) por el que pasen todas las llamadas futuras, con JWT y manejo de 401 ya resueltos, para que ningún change posterior tenga que repetir esa plomería.
- Que el polling sea un hook reutilizable configurado por constantes, de modo que CH13–CH20 no vuelvan a escribir `setInterval`.
- Que los tipos del dominio estén escritos una sola vez y coincidan exactamente con lo que devuelve el backend real.
- Que `tsc --noEmit` y `npm run build` pasen limpios con `strict: true`.

**Non-Goals:**

- Diseñar la UI final de cada página (cada change trae su propia pantalla).
- Definir servicios por dominio ni hooks de datos concretos.
- Gestión de estado global más allá de `AuthContext` (no se introduce Redux/Zustand/React Query; se evaluará si algún change posterior lo justifica).
- Optimización de bundle, code splitting o SSR.

## Decisions

### D1. Estructura de carpetas por tipo, no por feature

```
frontend/
├── .nvmrc                       ← 20
├── .env.example                 ← VITE_API_URL=http://localhost:8000
├── index.html
├── package.json
├── tsconfig.json / tsconfig.node.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
└── src/
    ├── main.tsx                 ← monta React + BrowserRouter + AuthProvider
    ├── App.tsx                  ← definición de rutas
    ├── index.css                ← directivas Tailwind + fuentes
    ├── constants/polling.ts
    ├── contexts/AuthContext.tsx
    ├── hooks/usePolling.ts
    ├── services/apiClient.ts
    ├── types/{alertas,contenedores,tickets,metrics,comun}.ts
    ├── components/
    │   ├── layout/{Layout,Sidebar,ProtectedRoute}.tsx
    │   └── common/{Badge,Card,Tabla,Spinner}.tsx
    └── pages/{LoginPage,DashboardPage}.tsx
```

**Por qué:** es la estructura que fija el roadmap CH01 y la que ya declara AGENTS.md (`components/`, `pages/`, `services/`, `types/`, `hooks/`). Una organización por feature se justificaría con equipos paralelos por dominio; acá hay 8 páginas que comparten el mismo layout y los mismos componentes comunes, y el roadmap las implementa secuencialmente.

**Alternativa descartada:** feature-folders (`src/features/tickets/...`). Añade profundidad sin beneficio en este tamaño y contradice la estructura esperada en AGENTS.md.

**Nota de convención:** `ProtectedRoute.tsx` es un componente, por eso va en `PascalCase` y vive en `components/layout/`, no en `hooks/`. Las carpetas quedan todas en minúscula de una sola palabra, compatibles con la regla `kebab-case`.

### D2. `apiClient` como instancia de axios con interceptores, y el token en `localStorage`

```ts
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
})
```

- **Request interceptor**: lee el token de `localStorage` (clave `siem_token`) y, si existe, setea `Authorization: Bearer <token>`.
- **Response interceptor**: en `401` borra `siem_token` y hace `window.location.assign("/login")`; en el resto de los errores devuelve un `Error` con mensaje en español derivado de `error.response?.data?.detail`, con fallback `"Error de conexión con el servidor"` cuando no hay respuesta.

**Por qué `localStorage` y no memoria o cookie httpOnly:** el backend ya emite el JWT en el body de `/api/auth/login` (`TokenResponse`), no como cookie, así que la cookie httpOnly requeriría cambiar el backend — prohibido en este change. Guardarlo solo en memoria obligaría a re-login en cada refresh, inaceptable para un panel de monitoreo que se deja abierto. `localStorage` es el trade-off aceptado (ver Riesgos).

**Por qué el interceptor lee `localStorage` directo y no el `AuthContext`:** el interceptor es código plano fuera del árbol de React y no puede usar hooks. Para no duplicar la clave, se exporta `CLAVE_TOKEN` desde `apiClient.ts` y el `AuthContext` la importa — una sola definición del nombre de la clave.

**Por qué `window.location.assign` y no `navigate()`:** misma razón (fuera del árbol de React). El costo es una recarga completa, aceptable en el caso de sesión expirada porque además limpia todo el estado en memoria.

### D3. `usePolling` genérico, con `useRef` para la función y limpieza en el `useEffect`

Firma:

```ts
function usePolling<T>(
  peticion: () => Promise<T>,
  intervaloMs: number,
  opciones?: { habilitado?: boolean }
): { datos: T | null; cargando: boolean; error: string | null; refrescar: () => Promise<void> }
```

Comportamiento: ejecuta una vez al montar, después cada `intervaloMs`; guarda `peticion` en un `useRef` actualizado en cada render para que una función inline no reinicie el intervalo en cada ciclo; usa un flag `montado` para no setear estado tras el desmontaje; limpia con `clearInterval` en el cleanup; si `habilitado === false` no arranca; `cargando` solo es `true` en la primera carga, para que los refrescos no hagan parpadear las tablas.

**Por qué genérico y no un hook por endpoint:** los 8 dominios necesitan lo mismo con distinto intervalo; un hook por dominio multiplicaría por 8 la misma lógica de intervalos y cleanup.

**Alternativa descartada:** TanStack Query, que resolvería polling, caché y reintentos de fábrica. Es una dependencia no aprobada por el roadmap ni por AGENTS.md, y la regla dura obliga a consultar antes de instalar. Se deja anotado como posible mejora futura si aparecen necesidades de caché compartida.

### D4. `AuthContext` como stub con la forma final ya definida

El contexto expone `{ token, estaAutenticado, iniciarSesion, cerrarSesion }`. En este change:

- `iniciarSesion(token: string)` guarda el token en `localStorage` y en el estado. **No** llama a la API.
- `cerrarSesion()` limpia ambos.
- El estado inicial se hidrata leyendo `localStorage` en el `useState` inicializador (evita el parpadeo de "no autenticado" en el primer render, que haría que `ProtectedRoute` redirija a `/login` a un usuario con sesión válida).

CH03 agregará la llamada real a `POST /api/auth/login` sin cambiar la firma que consumen `ProtectedRoute` ni el `Sidebar`.

**Por qué fijar la forma ahora en vez de dejar el archivo vacío:** `ProtectedRoute` y el botón de cerrar sesión del sidebar se construyen en este change y necesitan una API estable contra la cual compilar. Un stub con la firma definitiva hace que CH03 sea un cambio aditivo dentro de un solo archivo.

### D5. Tipos derivados de `backend/schemas/`, respetando los nombres de campo reales

Los tipos **no** se traducen al español: se copian tal cual los devuelve el backend, porque renombrar exigiría una capa de mapeo en cada servicio y es una fuente permanente de bugs silenciosos. La regla de "todo en español" aplica a nombres que el equipo elige (variables, funciones, componentes, mensajes), no a los campos del contrato HTTP ya emitido por el backend.

Reparto por archivo:

| Archivo | Tipos | Origen |
|---|---|---|
| `types/alertas.ts` | `Alerta`, `PatronAtaque`, `AlertaPrometheus`, `ConteoAlertasWazuh` | `schemas/alerta.py`, `patron_ataque.py`, `prometheus.py`, `wazuh.py` |
| `types/contenedores.ts` | `Contenedor`, `RecursoContenedor`, `EstadoJail`, `IPBaneada`, `EjecucionWorkflow` | `schemas/contenedor.py`, `fail2ban.py`, `workflows.py` |
| `types/tickets.ts` | `Ticket`, `EstadoTicket` | `schemas/ticket.py` |
| `types/metrics.ts` | `MetricaSistema`, `MetricaTPW`, `IPBloqueada` | `schemas/metrica_sistema.py`, `prometheus.py`, `ip_bloqueada.py` |
| `types/comun.ts` | `RespuestaPaginada<T>`, `ParametrosPaginacion` | contrato de paginación de AGENTS.md |

Los `datetime` de Pydantic se serializan a ISO 8601, así que en TypeScript se tipan como `string`, no como `Date`. Los campos con `| None` en Pydantic se tipan `| null` (no `?`), porque el backend los envía presentes con valor `null`. `threat_intel: Any | None` se tipa `unknown | null` — **nunca `any`**, para no violar la regla dura; el change que lo consuma hará el narrowing.

`RespuestaPaginada<T>` se define como `{ items: T[]; total: number; limit: number; offset: number }`, según AGENTS.md.

### D6. Tema oscuro vía tokens en `tailwind.config.js`, no clases arbitrarias

Se extiende la paleta con nombres semánticos en español (`fondo`, `superficie`, `borde`, `primario`, `peligro`, `advertencia`, `exito`) para que ningún componente escriba `bg-[#0f172a]` a mano y un cambio de tema sea un solo archivo. Las fuentes se declaran como `font-sans` (Inter) y `font-mono` (JetBrains Mono).

**Fuentes sin CDN:** Inter y JetBrains Mono se declaran en `font-family` con fallbacks al sistema (`ui-sans-serif`, `ui-monospace`). No se agrega `@import` a Google Fonts ni un paquete npm de fuentes: sería una dependencia externa no aprobada y el panel puede correr en una red sin salida a internet. Si el equipo quiere las fuentes reales, se agregan como archivos locales en un change posterior; los fallbacks del sistema hacen que la UI se vea correcta igual.

### D7. Rutas anidadas bajo un `Layout` con `<Outlet />`

```
/                      → <Navigate to="/dashboard/inicio" replace />
/login                 → <LoginPage />
/dashboard             → <ProtectedRoute><Layout /></ProtectedRoute>
    /dashboard/inicio      → <DashboardPage />   (placeholder, CH13 lo reemplaza)
    /dashboard/panel       → <DashboardPage />   (placeholder, CH14)
    /dashboard/logs        → placeholder          (CH15)
    /dashboard/ips         → placeholder          (CH16)
    /dashboard/tickets     → placeholder          (CH17)
    /dashboard/fail2ban    → placeholder          (CH18)
    /dashboard/prometheus  → placeholder          (CH19)
    /dashboard/wazuh       → placeholder          (CH20)
*                      → <Navigate to="/dashboard/inicio" replace />
```

**Por qué anidadas con `<Outlet />` y no un `<Layout>` envolviendo cada elemento:** el sidebar no se desmonta al navegar, no parpadea, y agregar una página en un change posterior es una línea de `<Route>`. Es además el patrón idiomático de react-router-dom v6.

**Por qué las 8 rutas existen ya con placeholders:** el sidebar tiene 8 enlaces; si las rutas no existieran, 6 de ellos llevarían al catch-all y el layout no sería verificable. Los placeholders son un componente mínimo con el título de la sección y un aviso de "En construcción", que cada change reemplaza sin tocar el router más que en el `import`.

**Nota de nomenclatura:** la sección 2 de AGENTS.md se llama "Dashboard" y toda el área protegida también, lo que haría `/dashboard/dashboard`. Se resuelve nombrando esa ruta `/dashboard/panel`. Es la única desviación de nombre respecto de AGENTS.md y no afecta ningún contrato con el backend.

### D8. Verificación manual, sin tests automatizados

AGENTS.md prohíbe crear tests salvo pedido explícito, y el roadmap CH01 no los pide. La verificación de este change es: `npm run build` y `npx tsc --noEmit` sin errores, `npm run dev` levantando en 5173, navegación por las 8 secciones, y una llamada real de `apiClient` contra `GET /api/health` del backend corriendo, para confirmar CORS y `baseURL`. Si el equipo quiere TDD en el frontend, hay que decidirlo explícitamente y añadir Vitest como dependencia aprobada (ver Open Questions).

## Risks / Trade-offs

- **JWT en `localStorage` es vulnerable a XSS** → Mitigación: React escapa por defecto, se prohíbe `dangerouslySetInnerHTML` en todo el proyecto (el visor de `alerts.log` de CH15 debe renderizar texto plano, nunca HTML), y el token es de sesión corta emitido por el backend. La alternativa real (cookie httpOnly) exige cambiar el backend y queda para un change de endurecimiento si el panel se expone fuera de la red interna.
- **Los endpoints del backend son stubs hoy** → Mitigación: este change no consume ninguno salvo `/api/health` en la verificación; los tipos se derivan de los schemas Pydantic, que ya están escritos y son estables aunque la implementación falte. Riesgo residual: si un change de backend cambia un schema, el tipo del front queda desactualizado sin que nada lo detecte en tiempo de compilación. Se acepta y se mitiga revisando `backend/schemas/` al implementar cada página.
- **Vite puede arrancar en un puerto distinto a 5173 si está ocupado**, y el CORS del backend solo permite `FRONTEND_ORIGIN` → Mitigación: fijar `server.port = 5173` y `server.strictPort = true` en `vite.config.ts`, para que falle ruidosamente en vez de arrancar en 5174 y romper CORS con un error confuso.
- **`window.location.assign` en el interceptor 401 recarga la app entera** → Mitigación: aceptado; solo ocurre con sesión expirada y garantiza que no quede estado obsoleto en memoria.
- **Sin caché compartida entre componentes**, dos componentes que consulten el mismo endpoint con `usePolling` harán dos requests → Mitigación: aceptado a esta escala; si aparece un problema real de carga, se reevalúa TanStack Query como dependencia nueva (con consulta previa, según la regla dura).
- **Deriva entre la paleta de Tailwind y el SDD** si alguien escribe colores literales → Mitigación: D6 define tokens semánticos y las revisiones deben rechazar clases de color arbitrarias.

## Migration Plan

No aplica migración: es un proyecto nuevo en una carpeta vacía. El rollback es borrar `frontend/`; nada fuera de esa carpeta se modifica, y el backend sigue funcionando exactamente igual con o sin este change.

## Open Questions

- **¿El equipo quiere Vitest + Testing Library para el frontend?** AGENTS.md dice que no se creen tests salvo pedido explícito, así que este change no los incluye. Puede resolverse en cualquier momento posterior: añadir Vitest es aditivo y no cambia ninguna de las decisiones ni el desglose de tareas de aquí.
- **¿Se empaquetan Inter y JetBrains Mono como archivos locales?** Hoy se usan fallbacks del sistema (D6). Agregar los archivos de fuente después es un cambio contenido en `index.css` y `public/`.
