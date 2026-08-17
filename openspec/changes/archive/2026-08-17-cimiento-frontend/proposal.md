# Proposal: cimiento-frontend

## Why

CH00 (`cimiento-backend`) ya entregó el backend FastAPI operativo en `backend/` (11 routers registrados, login JWT funcional, modelos SQLAlchemy y schemas Pydantic), pero la carpeta `frontend/` está completamente vacía: no existe ninguna aplicación que consuma esa API. CH03 (auth-frontend) y todas las páginas del dashboard (CH13–CH20) dependen de que exista una base React con routing, layout, cliente HTTP y tipos ya montada; sin este change ninguno de ellos puede arrancar.

## What Changes

- **Scaffolding** del proyecto en `frontend/` con Vite + React + TypeScript (`npm create vite@latest frontend -- --template react-ts`), `.nvmrc` en Node 20.x y `tsconfig.json` en modo estricto (`strict: true`, `noImplicitAny`, sin `any` permitido).
- **Tailwind CSS** configurado con el tema oscuro del SDD: fondo `#0f172a`, superficie de cards `#1e293b`, acento primario `#3b82f6`, acento de peligro `#ef4444`; tipografías Inter (general) y JetBrains Mono (visor de logs).
- **Cliente HTTP** `src/services/apiClient.ts`: instancia única de axios con `baseURL` leída de `VITE_API_URL`, interceptor de request que inyecta `Authorization: Bearer <token>`, interceptor de response que ante 401 limpia la sesión y redirige a `/login`, y normalización central de errores a mensajes en español.
- **Routing** en `src/App.tsx` con `react-router-dom`: ruta pública `/login`, wrapper `ProtectedRoute` para todo lo demás, rutas del dashboard bajo `/dashboard/*` y redirección de la raíz a `/dashboard/inicio`.
- **Layout base**: `Layout.tsx` (shell sidebar + área de contenido con `<Outlet />`) y `Sidebar.tsx` con las 8 secciones canónicas de AGENTS.md — Inicio, Dashboard, Logs y detección, Gestión de IPs, Tickets, Fail2ban, Prometheus, Wazuh — con íconos de `lucide-react`.
- **Contexto de autenticación** `src/contexts/AuthContext.tsx` como stub funcional: guarda/lee el token, expone `token`, `estaAutenticado`, `iniciarSesion`, `cerrarSesion`. La llamada real a `POST /api/auth/login` se implementa en CH03.
- **Hook de polling** `src/hooks/usePolling.ts`: hook genérico y tipado que ejecuta una función asíncrona en un intervalo configurable, con estados `datos` / `cargando` / `error`, pausa al desmontar y opción de deshabilitado. Cumple la regla dura de "tiempo real = polling, nunca WebSockets ni SSE".
- **Constantes de polling** `src/constants/polling.ts` con `INTERVALOS_POLLING` (`ALERTAS_LOG: 3000`, `METRICAS_SISTEMA: 10000`, `FAIL2BAN: 10000`, `DASHBOARD: 30000`, `PROMETHEUS: 30000`) marcadas `as const`, para que ningún componente hardcodee intervalos.
- **Tipos TypeScript** en `src/types/` (`alertas.ts`, `contenedores.ts`, `tickets.ts`, `metrics.ts`) derivados campo por campo de los schemas Pydantic ya existentes en `backend/schemas/`, más un tipo genérico `RespuestaPaginada<T>` que refleja el contrato `{ items, total, limit, offset }`.
- **Componentes comunes** `src/components/common/`: `Badge.tsx` (estado/severidad con color), `Card.tsx` (contenedor oscuro base), `Tabla.tsx` (tabla genérica con paginación offset/limit), `Spinner.tsx` (indicador de carga).
- **Páginas stub** `LoginPage.tsx` (se completa en CH03) y `DashboardPage.tsx` (se completa en CH14), suficientes para que el router y el layout se puedan verificar de punta a punta.
- **Dependencias nuevas** (las tres ya aprobadas en el roadmap CH01): `axios ^1.7`, `react-router-dom ^6.28`, `lucide-react ^0.468`.
- **Configuración de entorno**: `.env.example` con `VITE_API_URL=http://localhost:8000`, `.env` agregado a `.gitignore`, y puerto de dev fijado en 5173 para que coincida con el `FRONTEND_ORIGIN` que el backend ya tiene en su CORS.

No hay cambios *BREAKING*: el proyecto frontend no existe todavía.

## Capabilities

### New Capabilities

Ninguna. Este change es puramente de andamiaje y tooling del proyecto frontend: no introduce comportamiento observable de producto (las páginas son stubs y el login real llega en CH03). El roadmap CH01 declara explícitamente `proposal, design, tasks` como únicos artefactos, y `openspec/specs/` está vacío en este punto del proyecto. Por eso `.openspec.yaml` de este change lleva `skip_specs: true` en lugar de inventar requisitos solo para satisfacer la validación.

### Modified Capabilities

Ninguna.

## Impact

- **Código afectado**: exclusivamente archivos nuevos bajo `frontend/`. Cero modificaciones en `backend/`, `bd/`, `docker-compose.yml`, workflows de n8n o cualquier archivo del stack.
- **Contrato de API**: se consume el contrato ya implementado en `backend/routers/` — no se inventan endpoints. Los tipos del front se derivan de `backend/schemas/`.
- **Dependencias**: 3 paquetes nuevos de producción (`axios`, `react-router-dom`, `lucide-react`) más las devDependencies que trae el template de Vite y Tailwind (`tailwindcss`, `postcss`, `autoprefixer`). Todas listadas en el roadmap; no se agrega ninguna otra sin consultar.
- **Entorno**: requiere Node 20.x. Se agrega `frontend/.nvmrc` y `frontend/.env.example`; `frontend/.env` queda ignorado por git.
- **Changes desbloqueados**: CH03 (auth-frontend) y CH13–CH20 (páginas del dashboard) pasan a ser implementables sobre esta base.

## No-alcance

- **Lógica real de autenticación** (llamada a `POST /api/auth/login`, persistencia y renovación del token, formulario validado) → CH03.
- **Consumo real de datos y contenido de las páginas** (tablas con datos, gráficos, visor de `alerts.log`, botones de acción) → CH13–CH20.
- **Servicios por dominio** (`alertasService`, `ipsService`, etc.): en este change solo se crea el `apiClient` genérico; cada servicio se agrega en el change de su página.
- **Tests automatizados**: AGENTS.md prohíbe crearlos salvo pedido explícito; no se configura Vitest ni Testing Library en este change.
- **Dockerización o build de producción del frontend**: fuera del alcance; el stack Docker no se toca.
- **Cualquier modificación al backend**, aunque se detecte una discrepancia — se reporta, no se corrige aquí.
