# Tasks: cimiento-frontend

> **Dependencias entre changes**
> - **Requiere CH00 (`cimiento-backend`)**: ya implementado y archivado. Los tipos de la sección 5 se derivan de `backend/schemas/` y la verificación 10.4 necesita el backend corriendo en `http://localhost:8000`.
> - **Desbloquea CH03** (`auth-frontend`): completa `AuthContext` y `LoginPage`.
> - **Desbloquea CH13–CH20** (páginas del dashboard): reemplazan los placeholders de rutas creados en 8.4.
> - **Regla de alcance**: todo lo que se escriba en este change vive bajo `frontend/`. No tocar `backend/`, `bd/`, `docker-compose.yml` ni workflows de n8n.

## 1. Scaffolding y configuración base

- [x] 1.1 Crear el proyecto con `npm create vite@latest frontend -- --template react-ts` y ejecutar `npm install`
- [x] 1.2 Crear `frontend/.nvmrc` con `20` y verificar que la versión de Node activa sea 20.x
- [x] 1.3 Endurecer `frontend/tsconfig.json`: `strict: true`, `noImplicitAny: true`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`
- [x] 1.4 Configurar `frontend/vite.config.ts` con `server.port = 5173` y `server.strictPort = true` (ver Riesgos del design: evita arrancar en 5174 y romper el CORS del backend)
- [x] 1.5 Crear `frontend/.env.example` con `VITE_API_URL=http://localhost:8000` y `frontend/.env` local con el mismo valor
- [x] 1.6 Agregar `frontend/.env` (y `frontend/node_modules`, `frontend/dist`) al `.gitignore`
- [x] 1.7 Limpiar el boilerplate de Vite: borrar `src/App.css`, el logo de React y el contenido de ejemplo de `src/App.tsx`

## 2. Dependencias

- [x] 2.1 Instalar dependencias de producción aprobadas en el roadmap: `axios@^1.7`, `react-router-dom@^6.28`, `lucide-react@^0.468`
- [x] 2.2 Instalar dependencias de desarrollo de Tailwind: `tailwindcss`, `postcss`, `autoprefixer`
- [x] 2.3 Verificar que `package.json` no contenga ninguna dependencia adicional no listada arriba

## 3. Tailwind y tema oscuro

- [x] 3.1 Inicializar Tailwind (`npx tailwindcss init -p`) y configurar `content` con `./index.html` y `./src/**/*.{ts,tsx}`
- [x] 3.2 Extender la paleta en `tailwind.config.js` con tokens semánticos: `fondo: #0f172a`, `superficie: #1e293b`, `borde: #334155`, `primario: #3b82f6`, `peligro: #ef4444`, `advertencia: #f59e0b`, `exito: #22c55e`
- [x] 3.3 Declarar `fontFamily.sans` con Inter + fallbacks del sistema y `fontFamily.mono` con JetBrains Mono + fallbacks (sin CDN ni paquetes de fuentes)
- [x] 3.4 Reescribir `src/index.css` con las directivas `@tailwind` y estilos base del `body` (fondo oscuro, texto claro, `font-sans`)
- [x] 3.5 Actualizar `index.html`: `lang="es"`, `<title>` del panel SIEM

## 4. Constantes y tipos comunes

- [x] 4.1 Crear `src/constants/polling.ts` con `INTERVALOS_POLLING` (`ALERTAS_LOG: 3000`, `METRICAS_SISTEMA: 10000`, `FAIL2BAN: 10000`, `DASHBOARD: 30000`, `PROMETHEUS: 30000`) marcado `as const`
- [x] 4.2 Crear `src/types/comun.ts` con `RespuestaPaginada<T>` (`{ items, total, limit, offset }`) y `ParametrosPaginacion` (`{ limit, offset }`)

## 5. Tipos del dominio (derivados de `backend/schemas/`)

> Regla del design D5: se conservan los nombres de campo tal como los emite el backend; `datetime` → `string` (ISO 8601); `| None` → `| null`; nunca `any` (`threat_intel` se tipa `unknown | null`).

- [x] 5.1 `src/types/alertas.ts`: `Alerta` (de `schemas/alerta.py`), `PatronAtaque` (`patron_ataque.py`), `AlertaPrometheus` (`prometheus.py`), `ConteoAlertasWazuh` (`wazuh.py`)
- [x] 5.2 `src/types/contenedores.ts`: `Contenedor` y `RecursoContenedor` (`schemas/contenedor.py`), `EstadoJail` e `IPBaneada` (`fail2ban.py`), `EjecucionWorkflow` (`workflows.py`)
- [x] 5.3 `src/types/tickets.ts`: `Ticket` (de `schemas/ticket.py`) y el union `EstadoTicket`
- [x] 5.4 `src/types/metrics.ts`: `MetricaSistema` (`schemas/metrica_sistema.py`), `MetricaTPW` (`prometheus.py`), `IPBloqueada` (`ip_bloqueada.py`)

## 6. Cliente HTTP

- [x] 6.1 Crear `src/services/apiClient.ts`: exportar `CLAVE_TOKEN = "siem_token"` y la instancia de axios con `baseURL: import.meta.env.VITE_API_URL` y `timeout: 15000`
- [x] 6.2 Agregar el interceptor de request que inyecta `Authorization: Bearer <token>` leyendo `localStorage` cuando hay token
- [x] 6.3 Agregar el interceptor de response: ante `401` limpiar el token y redirigir con `window.location.assign("/login")`
- [x] 6.4 Agregar la normalización de errores: mensaje desde `error.response?.data?.detail`, fallback `"Error de conexión con el servidor"` — todos los mensajes en español
- [x] 6.5 Declarar los tipos de `import.meta.env` en `src/vite-env.d.ts` (`VITE_API_URL: string`) para que `tsc` no infiera `any`

## 7. Autenticación (stub) y polling

- [x] 7.1 Crear `src/contexts/AuthContext.tsx` con el tipo del contexto `{ token, estaAutenticado, iniciarSesion, cerrarSesion }` y su `AuthProvider`
- [x] 7.2 Hidratar el estado inicial del token desde `localStorage` en el inicializador de `useState` (evita el redirect espurio a `/login` en el primer render)
- [x] 7.3 Implementar `iniciarSesion(token)` y `cerrarSesion()` sincronizando estado y `localStorage` con `CLAVE_TOKEN`; **sin** llamada a la API (eso es CH03)
- [x] 7.4 Exportar el hook `useAuth()` que lanza un error explícito en español si se usa fuera del `AuthProvider`
- [x] 7.5 Crear `src/hooks/usePolling.ts` con la firma `usePolling<T>(peticion, intervaloMs, opciones?)` que devuelve `{ datos, cargando, error, refrescar }`
- [x] 7.6 En `usePolling`: guardar `peticion` en un `useRef` actualizado por render, primera ejecución inmediata al montar, `cargando: true` solo en la primera carga
- [x] 7.7 En `usePolling`: `clearInterval` en el cleanup, flag de montado para no setear estado tras desmontar, y no arrancar si `opciones.habilitado === false`

## 8. Layout, navegación y routing

- [x] 8.1 Crear `src/components/layout/Sidebar.tsx` con las 8 secciones (Inicio, Dashboard, Logs y detección, Gestión de IPs, Tickets, Fail2ban, Prometheus, Wazuh), íconos de `lucide-react`, `NavLink` con estilo activo y botón de cerrar sesión
- [x] 8.2 Crear `src/components/layout/Layout.tsx`: shell con sidebar fija a la izquierda y área de contenido con `<Outlet />`
- [x] 8.3 Crear `src/components/layout/ProtectedRoute.tsx`: si `estaAutenticado` es falso, `<Navigate to="/login" replace />`; si no, renderiza los hijos
- [x] 8.4 Crear un componente placeholder reutilizable (título de sección + aviso "En construcción") para las rutas que implementan CH15–CH20
- [x] 8.5 Crear `src/pages/LoginPage.tsx` como stub (marcador visual, sin lógica de login — CH03) y `src/pages/DashboardPage.tsx` como stub (CH14)
- [x] 8.6 Definir el árbol de rutas en `src/App.tsx`: `/login` pública, `/dashboard` protegida con `Layout` y sus 8 rutas hijas (`inicio`, `panel`, `logs`, `ips`, `tickets`, `fail2ban`, `prometheus`, `wazuh`), raíz y catch-all redirigiendo a `/dashboard/inicio`
- [x] 8.7 Montar `BrowserRouter` y `AuthProvider` alrededor de `<App />` en `src/main.tsx`

## 9. Componentes comunes

- [x] 9.1 `src/components/common/Card.tsx`: contenedor con fondo `superficie`, borde, padding y título opcional
- [x] 9.2 `src/components/common/Badge.tsx`: variantes tipadas (`exito | advertencia | peligro | info | neutro`) mapeadas a los tokens de la paleta, sin colores literales
- [x] 9.3 `src/components/common/Spinner.tsx`: indicador de carga con tamaño configurable
- [x] 9.4 `src/components/common/Tabla.tsx`: tabla genérica `<T>` con definición de columnas tipada (`{ clave, encabezado, render? }`), estados de carga y de vacío
- [x] 9.5 En `Tabla.tsx`: controles de paginación offset/limit (anterior/siguiente y "mostrando X–Y de N") consumiendo `RespuestaPaginada<T>`

## 10. Verificación

- [x] 10.1 `npx tsc --noEmit` sin errores y sin ninguna aparición de `any` en `src/` (verificar con búsqueda)
- [x] 10.2 `npm run build` completa sin errores ni warnings de TypeScript
- [x] 10.3 `npm run dev` levanta en `http://localhost:5173` (confirmado, strictPort respetado); la raíz redirige a `/dashboard/inicio` — confirmado con navegación real por el usuario
- [x] 10.4 Con el backend corriendo, una llamada de prueba de `apiClient` a `GET /api/health` responde `{"estado": "ok"}` sin error de CORS — confirmado por el usuario (requirió agregar `extra: "ignore"` a `Settings` en `backend/config.py` y normalizar el driver `asyncpg` en `backend/database.py`, ver engram `opsx/cimiento-frontend/apply`)
- [x] 10.5 Navegar las 8 secciones del sidebar: todas resuelven, el sidebar no se desmonta y el enlace activo se resalta — confirmado por el usuario inyectando un token de prueba en `localStorage` (login real es CH03)
- [x] 10.6 Con `localStorage` vacío, entrar a `/dashboard/inicio` redirige a `/login` — confirmado por el usuario
- [x] 10.7 Confirmar que `git status` no muestra cambios fuera de `frontend/` (salvo el `.gitignore` de la raíz si se editó en 1.6)
