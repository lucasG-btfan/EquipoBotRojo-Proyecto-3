import { createContext, useContext, useState, type ReactNode } from 'react'
import { CLAVE_TOKEN } from '../services/apiClient'

interface ContextoAuth {
  token: string | null
  estaAutenticado: boolean
  iniciarSesion: (token: string) => void
  cerrarSesion: () => void
}

const AuthContext = createContext<ContextoAuth | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  // Se hidrata desde localStorage en el inicializador de useState (no en un
  // useEffect) para que el primer render ya conozca la sesión existente y
  // ProtectedRoute no redirija de forma espuria a /login (ver design.md D4).
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(CLAVE_TOKEN))

  function iniciarSesion(nuevoToken: string) {
    // Sin llamada a la API: la autenticación real se implementa en CH03.
    localStorage.setItem(CLAVE_TOKEN, nuevoToken)
    setToken(nuevoToken)
  }

  function cerrarSesion() {
    localStorage.removeItem(CLAVE_TOKEN)
    setToken(null)
  }

  const valor: ContextoAuth = {
    token,
    estaAutenticado: token !== null,
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
