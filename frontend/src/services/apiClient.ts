import axios, { AxiosError } from 'axios'

/**
 * Clave única de `localStorage` para el JWT de sesión. Se exporta desde
 * acá (y no desde `AuthContext`) porque el interceptor de request es
 * código plano fuera del árbol de React y no puede usar hooks; así hay
 * una sola definición del nombre de la clave (ver design.md D2).
 */
export const CLAVE_TOKEN = 'siem_token'

/**
 * Ruta del endpoint de login. Se exporta como constante compartida (en vez
 * de repetir el literal en `authService`) para que el interceptor de
 * response pueda reconocer sus propios 401 sin duplicar la ruta en dos
 * archivos que podrían divergir (ver design.md D3).
 */
export const RUTA_LOGIN = '/api/auth/login'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// Inyecta el JWT en cada request si hay una sesión activa.
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(CLAVE_TOKEN)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Ante 401: la sesión ya no es válida, se limpia y se fuerza el login.
// Para el resto de los errores: normaliza el mensaje a español.
apiClient.interceptors.response.use(
  (respuesta) => respuesta,
  (error: AxiosError<{ detail?: string }>) => {
    const esLogin = error.config?.url === RUTA_LOGIN

    // El 401 del propio login (contraseña incorrecta) NO dispara esta
    // limpieza: si lo hiciera, la redirección dura recargaría la página
    // antes de que LoginPage pueda mostrar el mensaje de error (ver
    // design.md D3).
    if (error.response?.status === 401 && !esLogin) {
      localStorage.removeItem(CLAVE_TOKEN)
      // Fuera del árbol de React: no hay acceso a `navigate()`, por eso
      // se usa una redirección dura (ver design.md D2).
      window.location.assign('/login')
    }

    const mensaje = error.response?.data?.detail ?? 'Error de conexión con el servidor'
    return Promise.reject(new Error(mensaje))
  },
)

export default apiClient
