import type { ReactNode } from 'react'

interface CardProps {
  titulo?: string
  children: ReactNode
  className?: string
}

/** Contenedor oscuro base usado por todas las secciones del panel. */
export function Card({ titulo, children, className = '' }: CardProps) {
  return (
    <div className={`rounded-lg border border-borde bg-superficie p-4 max-lg:p-3 ${className}`}>
      {titulo && <h3 className="mb-3 text-sm font-semibold text-slate-100">{titulo}</h3>}
      {children}
    </div>
  )
}
