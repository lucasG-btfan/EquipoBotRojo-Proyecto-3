import { Info, RefreshCw } from 'lucide-react'
import { Badge } from '../common/Badge'
import { Card } from '../common/Card'
import { Spinner } from '../common/Spinner'

interface ContadorAlertasWazuhProps {
  /** Último total conocido; `null` mientras no haya dato real. */
  total: number | null
  /** Mensaje de origen provisto por el backend. */
  mensaje: string | null
  /** `true` durante la carga inicial (sin dato previo que mostrar). */
  cargando: boolean
  /** Mensaje de error en español de la última consulta. */
  error: string | null
  /** Refresco manual (botón "Actualizar" / "Reintentar"). */
  onRefrescar: () => void
}

/**
 * Componente presentacional puro de la sección "Wazuh": muestra el total
 * de alertas nativas como número grande y resuelve su representación según
 * el estado recibido por props. No sabe nada de HTTP ni de polling
 * (design.md D1). Solo lectura: la única acción es volver a consultar.
 */
export function ContadorAlertasWazuh({
  total,
  mensaje,
  cargando,
  error,
  onRefrescar,
}: ContadorAlertasWazuhProps) {
  const hayDato = total !== null

  return (
    <Card>
      <div className="flex items-center justify-between max-lg:flex-wrap max-lg:gap-2">
        <h3 className="text-sm font-semibold text-slate-100">Alertas nativas de Wazuh</h3>
        <button
          type="button"
          onClick={onRefrescar}
          disabled={cargando}
          className="flex items-center gap-2 rounded-lg border border-borde px-5 py-2.5 text-base font-medium text-slate-200 transition-colors hover:bg-borde/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw size={18} className={cargando ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* Altura mínima para que la card no salte al pasar de spinner a número. */}
      <div className="flex min-h-[140px] flex-col items-center justify-center py-8">
        {!hayDato && cargando && <Spinner tamano={36} />}

        {!hayDato && !cargando && error !== null && (
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-3">
              <Badge variante="peligro">Error</Badge>
              <span className="text-sm text-slate-300">{error}</span>
            </div>
            <button
              type="button"
              onClick={onRefrescar}
              className="flex items-center gap-2 rounded-md border border-borde px-3 py-1.5 text-sm text-slate-200 transition-colors hover:bg-borde/30 max-lg:py-2"
            >
              <RefreshCw size={14} />
              Reintentar
            </button>
          </div>
        )}

        {hayDato && (
          <>
            {/* `0` es un valor válido: se muestra igual que cualquier otro total. */}
            <p className="text-5xl font-bold text-slate-100 max-lg:text-4xl">{total.toLocaleString('es-AR')}</p>
            {mensaje !== null && <p className="mt-2 text-sm text-slate-400">{mensaje}</p>}
          </>
        )}
      </div>

      {error !== null && hayDato && (
        <p className="mt-2 text-xs text-advertencia">
          La última consulta falló; se muestra el último total conocido: {error}
        </p>
      )}

      {/* Nota fija (spec: Diferenciación frente a las alertas de n8n):
          siempre visible, con datos y ante error también. */}
      <div className="mt-4 flex items-start gap-2.5 border-t border-borde pt-4">
        <Info size={16} className="mt-0.5 shrink-0 text-slate-400" />
        <p className="text-sm text-slate-400">
          Las alertas de seguridad procesadas por el pipeline de n8n no se muestran en esta
          sección: se visualizan en las secciones Dashboard y Tickets.
        </p>
      </div>
    </Card>
  )
}
