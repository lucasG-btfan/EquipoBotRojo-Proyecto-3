# Design: auth-frontend (CH03)

## Context

Motivación en `proposal.md` — Why. Requisitos observables en `specs/autenticacion-frontend/spec.md`.

Estado real del código al momento de escribir este diseño (verificado en disco):

- `frontend/src/services/apiClient.ts` — instancia axios con `baseURL: import.meta.env.VITE_API_URL`, interceptor de request que inyecta `Authorization: Bearer <token>` leyendo `localStorage` bajo la constante exportada `CLAVE_TOKEN = 'siem_token'`, e interceptor de response que ante 401 borra el token, hace `window.location.assign('/login')` y normaliza cualquier error a `new Error(detail ?? 'Error de conexión con el servidor')`.
- `frontend/src/contexts/AuthContext.tsx` — `AuthProvider` con `token`, `estaAutenticado`, `iniciarSesion(token: string)` (sin llamada a la API, comentario `// la autenticación real se implementa en CH03`) y `cerrarSesion()`. El token se hidrata en el inicializador de `useState`, no en un `useEffect`.
- `frontend/src/components/layout/ProtectedRoute.tsx` — ya redirige a `/login` con `<Navigate replace />` si `!estaAutenticado`. Funcionalmente completo.
- `frontend/src/pages/LoginPage.tsx` — stub visual, sin formulario.
- `frontend/src/App.tsx` — `/login` pública; `/dashboard` envuelta en `<ProtectedRoute><Layout/></ProtectedRoute>` con 8 rutas hijas; `/` y `*` redirigen a `/dashboard/inicio`.
- `frontend/src/components/layout/Sidebar.tsx` — ya tiene el botón "Cerrar sesión" que llama `cerrarSesion()` y navega a `/login` con `replace: true`.

Contrato del backend (CH02, verificado en `backend/routers/auth.py`, `backend/schemas/auth.py`, `backend/auth.py`):

- `POST /api/auth/login`, body `{ "usuario": string, "contraseña": string }`, respuesta `200 { "access_token": string, "token_type": "bearer" }`.
- Credenciales incorrectas → `401 { "detail": "Credenciales inválidas" }`. Body incompleto → `422`. Error inesperado → `500 { "detail": "Error al procesar login: ..." }`.
- Token JWT HS256, `{"sub": "admin", "exp": ...}`, expiración `JWT_EXPIRE_HOURS` (default 8 h). No hay endpoint de refresh ni de verificación de token.

Restricciones duras del proyecto que condicionan el diseño: sin dependencias nuevas, `axios` como único cliente HTTP del frontend, prohibido `any`, todo en español, componentes en PascalCase y servicios/hooks en camelCase, gobernanza **HIGH** (seguridad) para este change.

## Goals / Non-Goals

**Goals:**

- Un único punto en el código que sepa autenticar (`authService`) y un único punto que sepa el estado de la sesión (`AuthContext`).
- Que el estado de sesión sea correcto en el **primer** render, para que `ProtectedRoute` nunca produzca un parpadeo hacia `/login`.
- Que un login fallido muestre el error sin recargar la página.
- Que el frontend no tenga ninguna lógica de decisión sobre validez de credenciales o de token: la autoridad es siempre el backend.

**Non-Goals:**

- Decodificar el JWT en el cliente para anticipar la expiración: la expiración se detecta reactivamente cuando el backend responde 401.
- Refactorizar `apiClient` más allá del ajuste mínimo del interceptor descripto en D3.
- Cambiar el árbol de rutas de `App.tsx`, el `Layout` o la `Sidebar`.

## Decisions

### D1 — Capa de servicio separada del contexto (`authService.ts`)

La llamada HTTP vive en `frontend/src/services/authService.ts`, no dentro de `AuthContext`. El contexto orquesta estado (token, cargando) y el servicio conoce el contrato del backend (ruta, forma del body, forma de la respuesta). Es el mismo patrón que ya usa el resto del frontend (`services/apiClient.ts`) y deja el contrato del backend en un solo archivo si mañana cambia.

*Alternativa descartada:* `axios.post` directo dentro del `AuthProvider`. Menos archivos, pero mezcla estado de React con contrato de red y obliga a duplicar la ruta si otro módulo la necesita.

### D2 — El campo `contraseña` del body se escribe tal cual, con eñe

El schema Pydantic del backend declara el campo como `contraseña`, así que la clave JSON literal es `"contraseña"`. El tipo TypeScript **debe** usar esa misma clave. Es válido como nombre de propiedad en TS/JS (identificador Unicode) y no requiere comillas, pero se documenta acá porque es una fuente de bugs silenciosos: cualquier "corrección" a `password` o `contrasena` produce un `422` del backend que se leería como error genérico.

*Alternativa descartada:* renombrar el campo en el backend a ASCII. Tocaría un change ya archivado y probado (CH02) por una cuestión estética.

### D3 — Exceptuar el endpoint de login de la redirección dura ante 401

El interceptor de response de `apiClient` hace `window.location.assign('/login')` ante cualquier 401. Aplicado al propio login, un usuario que se equivoca de contraseña provoca una **recarga completa de la página**: el estado de React se destruye y el mensaje de error nunca llega a verse. Es un bug latente hoy porque `LoginPage` todavía no llama a la API.

Solución: el interceptor solo dispara la limpieza + redirección dura cuando el 401 **no** proviene de la ruta de login. La ruta se compara contra una constante exportada (`RUTA_LOGIN = '/api/auth/login'`) para no repetir el literal entre `apiClient` y `authService`. El error se sigue rechazando normalizado, así que `AuthContext` lo recibe y lo propaga a la UI.

*Alternativas descartadas:* (a) usar una instancia axios "cruda" solo para el login — duplica `baseURL`/timeout y deja dos configuraciones que pueden divergir; (b) marcar la petición con un flag propio en `config` — requiere ensanchar los tipos de axios sin ganar nada frente a comparar la URL.

### D4 — `iniciarSesion` cambia de firma: `(usuario, contraseña) => Promise<void>`

El stub actual recibe un token ya obtenido, lo que dejaría a `LoginPage` haciendo la llamada HTTP por su cuenta y persistiendo el token a mano — es decir, dos lugares que saben cómo nace una sesión. La firma nueva hace que el contexto sea el único que persiste el token. `LoginPage` solo hace `await iniciarSesion(usuario, contraseña)` y decide qué mostrar.

Manejo de errores: `iniciarSesion` **propaga** la excepción (no la devuelve como valor ni la traga). Motivo: el contexto no sabe cómo se muestra un error, y devolver `boolean` perdería el mensaje ya normalizado por el interceptor. `LoginPage` la captura en un `try/catch`.

`estaAutenticado` se sigue derivando de `token !== null` — no es un `useState` aparte, para que no puedan desincronizarse.

*Impacto:* el único consumidor actual del contexto es `Sidebar`, que solo usa `cerrarSesion`. No hay que tocar nada más.

### D5 — Hidratación del token en el inicializador de `useState` (se conserva)

Ya está resuelto así en el stub (documentado como D4 del design de CH01) y es la razón por la que `ProtectedRoute` funciona tras un F5. Se conserva explícitamente: mover esto a un `useEffect` reintroduciría un primer render con `estaAutenticado === false` y una redirección espuria a `/login`. Se deja el comentario en el código.

### D6 — Estado de carga en el contexto, estado de error en la página

`cargando` vive en el contexto porque es una propiedad de la operación de autenticación (y cualquier otra parte de la app podría necesitar saberlo). El mensaje de error vive en `LoginPage` porque es UI: cómo y dónde se muestra es decisión de la vista. Esto evita un error "pegado" en el contexto que sobreviva a una navegación.

### D7 — Redirección post-login declarativa con `<Navigate>`

`LoginPage` no navega imperativamente tras el `await`. En su lugar, si `estaAutenticado` es `true` renderiza `<Navigate to="/dashboard/inicio" replace />`. Con esto se cubren de una sola vez los dos casos del spec: login recién exitoso y visita a `/login` con sesión ya activa. `replace` evita que "atrás" devuelva a la pantalla de login.

*Alternativa descartada:* `useNavigate()` dentro del `try` + un `useEffect` aparte para el caso "ya autenticado" — dos caminos que hacen lo mismo.

### D8 — Validación de campos vacíos en el cliente, sin librería

Se valida únicamente "no vacío" (tras `trim()` del usuario) antes de emitir la petición, y se muestra un mensaje en español. No se agrega ninguna librería de formularios: el proyecto prohíbe dependencias no consultadas y el formulario tiene dos campos. El backend sigue siendo la autoridad; esta validación solo evita un `422` inútil.

### D9 — Tipos espejo del backend en `types/auth.ts`

`CredencialesLogin` (`usuario`, `contraseña`) y `RespuestaLogin` (`access_token`, `token_type`) se declaran explícitamente, sin `any` ni inferencia desde `axios`. `apiClient.post<RespuestaLogin>(...)` tipa la respuesta. Los nombres de campo replican el JSON del backend aunque no sigan `camelCase`, porque son datos de red, no identificadores del dominio del frontend.

### D10 — Higiene de credenciales en la UI

Decisiones concretas, derivadas del requisito de confidencialidad del spec y del nivel de gobernanza HIGH:

- `type="password"` en el campo de contraseña; `autoComplete="username"` / `autoComplete="current-password"` para que el navegador haga lo esperable.
- El estado del formulario se limpia al desmontar la página (que ocurre naturalmente al redirigir).
- Nunca se pasa la contraseña por query string, ni se registra en consola, ni se guarda en `localStorage`.
- El `catch` de `LoginPage` no vuelca el objeto de error crudo en la UI: usa `error instanceof Error ? error.message : 'Error inesperado al iniciar sesión'`.

## Risks / Trade-offs

- **JWT en `localStorage` es legible por cualquier script de la página (XSS)** → Decisión de proyecto ya tomada (AGENTS.md exige `localStorage`, no cookies). Se mitiga con expiración corta del token (8 h) y borrado del token ante cualquier 401. Documentado como riesgo aceptado, no como descuido.
- **El cliente no sabe cuándo expira el token** → La primera petición posterior a la expiración devuelve 401 y el interceptor limpia y redirige. El costo es una petición fallida y un salto abrupto a `/login`; a cambio, no hay lógica de expiración duplicada entre cliente y servidor.
- **El interceptor distingue el login por comparación de URL (D3)** → Si alguien mueve la ruta del login sin actualizar la constante, se reintroduce el bug de la recarga. Se mitiga con la constante compartida `RUTA_LOGIN` y un comentario en ambos archivos.
- **Cambio de firma de `iniciarSesion` (D4)** → Es una ruptura contenida: hoy nadie fuera del contexto la usa. TypeScript marca cualquier consumidor que aparezca después.
- **Sin `returnTo`: siempre se aterriza en `/dashboard/inicio`** → Molesto si la sesión expira en medio de una sección profunda. Se acepta por simplicidad; agregarlo después no rompe el spec (es una mejora de la redirección, no un cambio de contrato).
- **Mensaje de error de red vs. credenciales** → Ambos llegan como `Error` ya normalizado por el interceptor; se distinguen porque el backend manda `detail: "Credenciales inválidas"` y el fallo de red cae en el default `'Error de conexión con el servidor'`. Si el backend cambiara ese texto, el mensaje seguiría siendo correcto (viene del backend), solo cambiaría la redacción.

## Migration Plan

No hay migración de datos ni despliegue coordinado: es frontend puro contra un backend ya desplegado. Verificación manual tras implementar, con el stack y el backend levantados:

1. Sin token en `localStorage`, entrar a `/dashboard/panel` → redirige a `/login`.
2. Login con credenciales incorrectas → mensaje de error en español, **sin recarga de página** (regresión de D3), sin token guardado.
3. Login con las credenciales de `DASHBOARD_USER` / `DASHBOARD_PASSWORD` → aterriza en `/dashboard/inicio`, `localStorage.siem_token` presente.
4. F5 en una sección protegida → sigue autenticado, sin parpadeo hacia `/login`.
5. Corromper el token a mano en `localStorage` y navegar → primera petición da 401, el token se borra y vuelve a `/login`.
6. "Cerrar sesión" en la sidebar → token borrado, vuelve a `/login`; "atrás" no devuelve a la sección protegida.
7. `npm run build` sin errores de TypeScript.

Rollback: revertir el commit del change. No queda estado persistido incompatible — a lo sumo un token viejo en `localStorage` que el stub anterior también sabía leer.
