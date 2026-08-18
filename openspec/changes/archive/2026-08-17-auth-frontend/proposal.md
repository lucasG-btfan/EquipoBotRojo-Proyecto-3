# Proposal: auth-frontend (CH03)

## Resumen

Completar la autenticación del lado del frontend: formulario de login funcional, contexto de sesión que consume `POST /api/auth/login`, persistencia del JWT en `localStorage` y protección efectiva de las rutas del dashboard.

## Why

CH00/CH01 dejaron el andamiaje del frontend en pie (`LoginPage`, `AuthContext`, `ProtectedRoute`, `apiClient` con interceptores) pero sin autenticación real: `LoginPage` es un cartel estático sin formulario y `AuthContext.iniciarSesion(token)` recibe un token ya armado, nunca lo pide al backend. En la práctica hoy es imposible iniciar sesión desde la UI, y el área protegida solo es alcanzable escribiendo el token a mano en `localStorage`.

CH02 ya dejó el contrato del backend cerrado y todas las rutas protegidas con `Depends(usuario_actual)`, así que el frontend es la única pieza faltante para que el dashboard sea usable de punta a punta. Sin esto, ningún change posterior de UI (CH13–CH20) se puede verificar en el navegador.

## What Changes

- **`frontend/src/services/authService.ts` (nuevo)** — servicio que llama `POST /api/auth/login` con `{ usuario, contraseña }` y devuelve el `access_token` tipado.
- **`frontend/src/types/auth.ts` (nuevo)** — tipos `CredencialesLogin` y `RespuestaLogin` espejo de los schemas Pydantic del backend.
- **`frontend/src/contexts/AuthContext.tsx` (modificado)** — **BREAKING** respecto del stub: `iniciarSesion(token: string): void` pasa a ser `iniciarSesion(usuario: string, contraseña: string): Promise<void>`, que autentica contra el backend y recién entonces persiste el token. Se agrega `cargando` para el estado de la petición en curso. El único consumidor actual (`Sidebar`, que usa `cerrarSesion`) no se ve afectado.
- **`frontend/src/pages/LoginPage.tsx` (modificado)** — reemplaza el stub por un formulario controlado usuario/contraseña con estilo SOC oscuro, estado de carga, mensaje de error en español y redirección a `/dashboard/inicio` al autenticar. Si ya hay sesión activa, redirige sin mostrar el formulario.
- **`frontend/src/services/apiClient.ts` (modificado)** — el interceptor de respuesta deja de forzar la redirección dura a `/login` cuando el 401 proviene del propio endpoint de login; de lo contrario un login fallido recargaría la página y el usuario nunca vería el mensaje de error.
- **`frontend/src/components/layout/ProtectedRoute.tsx`** — se valida y se documenta; no requiere cambios funcionales.

### No-alcance

- Refresh tokens, "recordarme", expiración anticipada leída del JWT en el cliente (la expiración se detecta reactivamente vía 401).
- Sistema multiusuario, registro, recuperación de contraseña o roles.
- Cookies `httpOnly` — el proyecto define explícitamente `localStorage` como mecanismo de persistencia.
- Volver a la ruta previa tras el login (`returnTo`): siempre se redirige a `/dashboard/inicio`.
- Tests automatizados (prohibidos por AGENTS.md salvo pedido explícito).

## Capabilities

### New Capabilities
- `autenticacion-frontend`: sesión del dashboard en el cliente — formulario de login, obtención y persistencia del JWT, exposición del estado de sesión a la app, cierre de sesión y bloqueo de las rutas protegidas.

### Modified Capabilities
<!-- Ninguna: no existen specs principales previas bajo openspec/specs/. -->

## Impact

- **Código afectado:** `frontend/src/pages/LoginPage.tsx`, `frontend/src/contexts/AuthContext.tsx`, `frontend/src/services/apiClient.ts`, `frontend/src/services/authService.ts` (nuevo), `frontend/src/types/auth.ts` (nuevo). `App.tsx`, `Layout.tsx` y `Sidebar.tsx` no cambian.
- **APIs consumidas:** `POST /api/auth/login` del backend propio (contrato ya implementado en CH02). Ninguna API externa.
- **Dependencias:** ninguna nueva — `axios` y `react-router-dom` ya están en `package.json`.
- **Seguridad (gobernanza HIGH):** se manipulan credenciales y el JWT de sesión. Las credenciales nunca se persisten ni se loguean; solo viaja el token. El backend sigue siendo la única autoridad de autenticación: el frontend nunca valida credenciales localmente.
- **Riesgo conocido:** el JWT en `localStorage` es legible por JavaScript de la página (expuesto a XSS). Es una decisión ya tomada a nivel proyecto; se mitiga con expiración corta del token (8 h, configurable en backend) y limpieza del token ante cualquier 401.
