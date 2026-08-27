interface SpinnerProps {
  /** Tamaño en píxeles (ancho = alto). Por defecto 20. */
  tamano?: number
  className?: string
}

/** Indicador de carga genérico. */
export function Spinner({ tamano = 20, className = '' }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Cargando"
      className={`inline-block animate-spin rounded-full border-2 border-borde border-t-primario ${className}`}
      style={{ width: tamano, height: tamano }}
    />
  )
}
