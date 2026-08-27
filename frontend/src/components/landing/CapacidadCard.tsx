import type { LucideIcon } from 'lucide-react'

interface CapacidadCardProps {
  Icono: LucideIcon
  titulo: string
  descripcion: string
}

/**
 * Card de una capacidad del sistema, con un anillo de luz que rota
 * lentamente en el borde (conic-gradient + rotación) — el "sello" visual
 * compartido por las 3 cards de esta sección, distinto del de la card de
 * "el problema" (barrido horizontal) para no verse repetitivo.
 */
export function CapacidadCard({ Icono, titulo, descripcion }: CapacidadCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-lg p-[3px] shadow-[0_0_25px_-6px_theme(colors.primario/70%)]">
      <div
        aria-hidden
        className="absolute inset-[-150%] animate-spin-slow bg-[conic-gradient(from_0deg,transparent_0%,theme(colors.primario)_10%,white_16%,theme(colors.primario)_22%,transparent_32%)] opacity-90 transition-opacity duration-300 group-hover:opacity-100"
      />
      <div className="relative flex h-full flex-col items-start gap-4 rounded-lg bg-superficie p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primario/15">
          <Icono size={24} className="text-primario" />
        </div>
        <h3 className="text-xl font-semibold text-slate-100">{titulo}</h3>
        <p className="text-lg leading-relaxed text-slate-300">{descripcion}</p>
      </div>
    </div>
  )
}
