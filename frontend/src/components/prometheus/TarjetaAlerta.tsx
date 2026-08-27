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

// Clases del contenedor según estado: el card entero se tiñe de rojo/amarillo
// cuando la alerta está disparada/pendiente, no solo el badge, para que se
// note de un vistazo sin tener que leer el texto.
const CONTENEDOR_POR_ESTADO: Record<string, string> = {
  firing: '!border-peligro/50 !bg-peligro/10',
  pending: '!border-advertencia/50 !bg-advertencia/10',
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
    <Card className={`flex flex-col gap-4 p-7 transition-colors ${CONTENEDOR_POR_ESTADO[estado] ?? ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-100">{nombre}</h3>
          <p className="mt-1 text-sm text-slate-400">{descripcion}</p>
        </div>
        <Badge variante={variante}>{etiqueta}</Badge>
      </div>

      <div className="flex flex-col gap-2 border-t border-borde pt-4 text-base text-slate-300">
        <span>
          Valor actual: <span className="font-semibold text-slate-100">{valorActual}</span>
        </span>
        {tiempoActivo && (
          <span className="text-sm text-slate-400">Tiempo disparada: {tiempoActivo} (observado)</span>
        )}
      </div>
    </Card>
  )
}
