import { Construction } from 'lucide-react'

interface PlaceholderProps {
  titulo: string
}

/**
 * Placeholder reutilizable para las secciones que todavía no tienen
 * contenido real (CH15–CH20 las reemplazan cada una en su change, sin
 * tocar el router más que el `import` — ver design.md D7).
 */
export function Placeholder({ titulo }: PlaceholderProps) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-xl font-semibold text-slate-100">{titulo}</h2>
      <div className="flex items-center gap-2 rounded-md border border-borde bg-superficie px-4 py-3 text-sm text-slate-400">
        <Construction size={16} className="text-advertencia" />
        En construcción
      </div>
    </div>
  )
}
