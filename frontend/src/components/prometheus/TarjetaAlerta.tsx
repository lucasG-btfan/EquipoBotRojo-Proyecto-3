import { Badge, type VarianteBadge } from '../common/Badge'
import { Card } from '../common/Card'

interface TarjetaAlertaProps {
  nombre: string
  descripcion: string
  estado: string
  /** Valor actual ya resuelto a texto por el contenedor (design.md D3). Nunca `null`/`undefined`. */
  valorActual: string
  /** Texto de tiempo en FIRING ya formateado, o `null` si la alerta no está disparada (design.md D4). */
  tiempoActivo: string | null
}

interface MapeoEstado {
  variante: VarianteBadge
  etiqueta: string
}

// Mapeo estado → variante/etiqueta (design.md D5). Acceso por defecto a
// "neutro" para no romper el render ante un estado no mapeado.
const MAPEO_ESTADOS: Record<string, MapeoEstado> = {
  firing: { variante: 'peligro', etiqueta: 'Disparada' },
  pending: { variante: 'advertencia', etiqueta: 'Pendiente' },
  inactive: { variante: 'exito', etiqueta: 'Inactiva' },
  no_configurada: { variante: 'neutro', etiqueta: 'No configurada' },
}

function resolverMapeoEstado(estado: string): MapeoEstado {
  return MAPEO_ESTADOS[estado] ?? { variante: 'neutro', etiqueta: estado }
}

/**
 * Componente presentacional puro: recibe props ya resueltas por
 * `PanelAlertas` y no realiza llamadas HTTP ni cálculos de tiempo
 * (design.md D1).
 */
export function TarjetaAlerta({
  nombre,
  descripcion,
  estado,
  valorActual,
  tiempoActivo,
}: TarjetaAlertaProps) {
  const { variante, etiqueta } = resolverMapeoEstado(estado)

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">{nombre}</h3>
          <p className="mt-1 text-xs text-slate-400">{descripcion}</p>
        </div>
        <Badge variante={variante}>{etiqueta}</Badge>
      </div>

      <div className="flex flex-col gap-1 border-t border-borde pt-3 text-sm text-slate-300">
        <span>
          Valor actual: <span className="font-medium text-slate-100">{valorActual}</span>
        </span>
        {tiempoActivo && (
          <span className="text-xs text-slate-400">Tiempo disparada: {tiempoActivo} (observado)</span>
        )}
      </div>
    </Card>
  )
}
