export type VarianteBadge = 'exito' | 'advertencia' | 'peligro' | 'naranja' | 'info' | 'neutro'

interface BadgeProps {
  variante: VarianteBadge
  children: string
}

// Mapeo explícito a los tokens semánticos de tailwind.config.js: ningún
// componente debe escribir un color literal (ver design.md D6).
const CLASES_POR_VARIANTE: Record<VarianteBadge, string> = {
  exito: 'bg-exito/15 text-exito',
  advertencia: 'bg-advertencia/15 text-advertencia',
  peligro: 'bg-peligro/15 text-peligro',
  naranja: 'bg-naranja/15 text-naranja',
  info: 'bg-primario/15 text-primario',
  neutro: 'bg-borde/40 text-slate-300',
}

/** Etiqueta de estado/severidad, coloreada según la variante semántica. */
export function Badge({ variante, children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${CLASES_POR_VARIANTE[variante]}`}
    >
      {children}
    </span>
  )
}
