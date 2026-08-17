import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../../contexts/AuthContext'

interface ProtectedRouteProps {
  children: ReactNode
}

/** Redirige a /login si no hay sesión activa; si la hay, renderiza los hijos. */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { estaAutenticado } = useAuth()

  if (!estaAutenticado) {
    return <Navigate to="/login" replace />
  }

  return children
}
