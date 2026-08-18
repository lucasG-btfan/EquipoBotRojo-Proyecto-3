import { createContext, useContext, useState, type ReactNode } from 'react'
import { CLAVE_TOKEN } from '../services/apiClient'
import { iniciarSesion as iniciarSesionServicio } from '../services/authService'

interface ContextoAuth {
  token: string | null
  estaAutenticado: boolean
  cargando: boolean
  iniciarSesion: (usuario: string, contraseña: string) => Promise<void>
  cerrarSesion: () => void
}

const AuthContext = createContext<ContextoAuth | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  // Se hidrata desde localStorage en el inicializador de useState (no en un
  // useEffect) para que el primer render ya conozca la sesión existente y
  // ProtectedRoute no redirija de forma espuria a /login (ver design.md D5).
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(CLAVE_TOKEN))
  const [cargando, setCargando] = useState(false)

  async function iniciarSesion(usuario: string, contraseña: string): Promise<void> {
    setCargando(true)
    try {
      const { access_token } = await iniciarSesionServicio({ usuario, contraseña })
      localStorage.setItem(CLAVE_TOKEN, access_token)
      setToken(access_token)
    } finally {
      setCargando(false)
    }
  }

  function cerrarSesion() {
    localStorage.removeItem(CLAVE_TOKEN)
    setToken(null)
  }

  const valor: ContextoAuth = {
    token,
    estaAutenticado: token !== null,
    cargando,
    iniciarSesion,
    cerrarSesion,
  }

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

export function useAuth(): ContextoAuth {
  const contexto = useContext(AuthContext)
  if (contexto === undefined) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider')
  }
  return contexto
}
