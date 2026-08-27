import { useState } from 'react'
import type { ReactNode } from 'react'

interface ColapsableProps {
  /** Título mostrado en el encabezado clickeable. */
  titulo: ReactNode
  /** Contenido a la derecha del título (ej. un badge de estado). */
  accesorio?: ReactNode
  /** Si arranca expandido. Por defecto colapsado. */
  abiertoPorDefecto?: boolean
  children: ReactNode
}

/** Sección expandible/colapsable con encabezado clickeable. */
export function Colapsable({ titulo, accesorio, abiertoPorDefecto = false, children }: ColapsableProps) {
  const [abierto, setAbierto] = useState(abiertoPorDefecto)

  return (
    <div className="rounded-lg border border-borde bg-superficie">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={abierto}
      >
        <span className="flex items-center gap-3">
          <svg
            className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${abierto ? 'rotate-90' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-lg font-semibold text-slate-100">{titulo}</span>
        </span>
        {accesorio}
      </button>
      {abierto && <div className="border-t border-borde px-4 pb-4 pt-3">{children}</div>}
    </div>
  )
}
