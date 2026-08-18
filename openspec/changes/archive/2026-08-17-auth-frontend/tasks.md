# Tasks: auth-frontend (CH03)

> Gobernanza **HIGH** (seguridad): estos artefactos requieren revisión humana antes de escribir código.
> Referencias: requisitos en `specs/autenticacion-frontend/spec.md`, decisiones en `design.md` (D1–D10).

## 1. Tipos y contrato del backend

- [x] 1.1 Crear `frontend/src/types/auth.ts` con `CredencialesLogin` (`usuario: string`, `contraseña: string`) y `RespuestaLogin` (`access_token: string`, `token_type: string`) — claves exactamente como las emite el backend, con eñe incluida (D2, D9)
- [x] 1.2 Verificar contra `backend/schemas/auth.py` que los nombres de campo coinciden carácter por carácter; sin `any` en ningún tipo

## 2. Ajuste del cliente HTTP

- [x] 2.1 En `frontend/src/services/apiClient.ts`, exportar la constante `RUTA_LOGIN = '/api/auth/login'` (D3)
- [x] 2.2 Condicionar la limpieza de token + `window.location.assign('/login')` del interceptor de response a que el 401 NO provenga de `RUTA_LOGIN`, dejando intacta la normalización del mensaje de error para todos los casos (D3)
- [x] 2.3 Comentar en el interceptor por qué existe la excepción (un 401 del login recargaría la página y borraría el mensaje de error)

## 3. Servicio de autenticación

- [x] 3.1 Crear `frontend/src/services/authService.ts` con `iniciarSesion(credenciales: CredencialesLogin): Promise<RespuestaLogin>` que haga `apiClient.post<RespuestaLogin>(RUTA_LOGIN, credenciales)` y devuelva `data` (D1)
- [x] 3.2 No capturar el error en el servicio: se propaga ya normalizado por el interceptor para que lo maneje la capa superior (D4)

## 4. Contexto de autenticación

- [x] 4.1 En `frontend/src/contexts/AuthContext.tsx`, cambiar la firma a `iniciarSesion(usuario: string, contraseña: string): Promise<void>` en la interfaz `ContextoAuth` (D4)
- [x] 4.2 Implementar `iniciarSesion`: llamar al servicio, y solo ante respuesta exitosa persistir `access_token` en `localStorage` bajo `CLAVE_TOKEN` y actualizar el estado
- [x] 4.3 Propagar la excepción hacia el llamador sin transformarla (no devolver `boolean`, no tragarla) (D4)
- [x] 4.4 Agregar `cargando: boolean` al contexto, en `true` mientras la petición está en curso y en `false` en un `finally` (incluido el camino de error) (D6)
- [x] 4.5 Conservar la hidratación del token en el inicializador de `useState` y su comentario explicativo — no moverla a un `useEffect` (D5)
- [x] 4.6 Mantener `estaAutenticado` derivado de `token !== null`, sin estado propio
- [x] 4.7 Eliminar el comentario obsoleto `// la autenticación real se implementa en CH03`
- [x] 4.8 Verificar que `cerrarSesion()` sigue borrando el token de `localStorage` y dejando `token` en `null`

## 5. Pantalla de login

- [x] 5.1 Reescribir `frontend/src/pages/LoginPage.tsx` como formulario controlado con estados locales de usuario, contraseña y mensaje de error (D6)
- [x] 5.2 Si `estaAutenticado`, retornar `<Navigate to="/dashboard/inicio" replace />` antes de renderizar el formulario — cubre tanto el post-login como la visita con sesión activa (D7)
- [x] 5.3 Usar `<form onSubmit>` con `event.preventDefault()` para que Enter envíe igual que el botón
- [x] 5.4 Validar campos no vacíos (`trim()` en usuario) antes de llamar al backend; si falta alguno, mostrar mensaje en español y no emitir la petición (D8)
- [x] 5.5 En el submit: limpiar el error previo, `await iniciarSesion(usuario, contraseña)` dentro de `try/catch`; en el `catch`, mostrar `error instanceof Error ? error.message : 'Error inesperado al iniciar sesión'` (D10)
- [x] 5.6 Deshabilitar el botón de envío mientras `cargando` es `true` e indicar visualmente el estado de carga (texto o spinner)
- [x] 5.7 Campo de contraseña con `type="password"`; `autoComplete="username"` y `autoComplete="current-password"` en los campos correspondientes (D10)
- [x] 5.8 Estilo SOC oscuro consistente con el resto del proyecto: tokens Tailwind ya definidos (`bg-fondo`, `bg-superficie`, `border-borde`, acentos `primario` / `peligro`); todos los textos en español
- [x] 5.9 Asegurar que la contraseña no se registre en consola, no se persista y no viaje por la URL (D10)

## 6. Rutas protegidas

- [x] 6.1 Revisar `frontend/src/components/layout/ProtectedRoute.tsx`: confirmar que redirige a `/login` con `replace` cuando `!estaAutenticado` y que no renderiza contenido protegido en ese caso — no requiere cambios funcionales
- [x] 6.2 Confirmar que `App.tsx`, `Layout.tsx` y `Sidebar.tsx` no necesitan modificaciones (el botón "Cerrar sesión" ya llama `cerrarSesion()` y navega a `/login` con `replace`)

## 7. Verificación manual

> Requiere backend levantado y `VITE_API_URL` apuntando a él.

- [x] 7.1 `npm run build` (o `tsc --noEmit`) sin errores de tipos; sin ocurrencias de `any` en los archivos tocados
- [x] 7.2 Sin token en `localStorage`, navegar a `/dashboard/panel` → redirige a `/login`
- [x] 7.3 Login con credenciales incorrectas → mensaje de error en español, **sin recarga de la página**, sin token guardado (regresión de D3)
- [x] 7.4 Login con campos vacíos → mensaje de campos obligatorios, sin petición al backend (verificable en la pestaña Red)
- [x] 7.5 Login con las credenciales válidas de `DASHBOARD_USER` / `DASHBOARD_PASSWORD` → redirige a `/dashboard/inicio` y `localStorage.siem_token` queda presente
- [x] 7.6 F5 en una sección protegida → la sesión persiste, sin parpadeo hacia `/login`
- [ ] 7.7 Con el token corrompido a mano en `localStorage`, navegar a una sección → la petición da 401, el token se borra y vuelve a `/login` — **no verificable todavía**: las secciones protegidas (`DashboardPage`, etc.) son placeholders sin llamadas a endpoints protegidos (se implementan desde CH14 en adelante), así que el interceptor de 401 nunca se dispara. `ProtectedRoute` solo comprueba la presencia del token, no su validez — comportamiento esperado por diseño (D3). Re-verificar cuando exista al menos una página que consuma un endpoint protegido.
- [x] 7.8 Backend apagado + intento de login → mensaje de error de conexión, distinguible del de credenciales inválidas
- [x] 7.9 "Cerrar sesión" en la sidebar → token borrado y vuelta a `/login`; el botón "atrás" del navegador no muestra contenido protegido
- [x] 7.10 Confirmar en la pestaña Red que el body del login envía exactamente `{"usuario": "...", "contraseña": "..."}` y que las peticiones protegidas llevan `Authorization: Bearer ...`
