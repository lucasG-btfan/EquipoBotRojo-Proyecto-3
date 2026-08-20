import { useCallback } from 'react'
import { RefreshCw } from 'lucide-react'
import { usePolling } from '../../hooks/usePolling'
import { INTERVALOS_POLLING } from '../../constants/polling'
import { obtenerEstadoJail } from '../../services/fail2banService'
import { Card } from '../common/Card'
import { Badge } from '../common/Badge'
import { Spinner } from '../common/Spinner'

/**
 * Componente contenedor que consulta el estado de la jail de Fail2ban
 * vía polling cada 10 segundos (INTERVALOS_POLLING.FAIL2BAN). Muestra
 * nombre de la jail, contador de IPs baneadas y lista detallada.
 */
export function EstadoJail() {
  const peticion = useCallback(() => obtenerEstadoJail(), [])

  const { datos, cargando, error, refrescar } = usePolling(
    peticion,
    INTERVALOS_POLLING.FAIL2BAN,
  )

  if (cargando && !datos) {
    return (
      <Card className="flex items-center justify-center py-12">
        <Spinner tamano={24} />
        <span className="ml-3 text-sm text-slate-300">Consultando estado de Fail2ban...</span>
      </Card>
    )
  }

  if (error && !datos) {
    return (
      <Card className="border-peligro/30">
        <div className="flex items-center gap-3">
          <Badge variante="peligro">Error</Badge>
          <span className="text-sm text-slate-300">{error}</span>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Fail2ban no está disponible o el contenedor no responde.
        </p>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Card resumen */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">
              Jail: <span className="font-mono text-primario">{datos?.jail ?? '—'}</span>
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Última actualización: {new Date().toLocaleString('es-AR')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refrescar()}
            disabled={cargando}
            className="flex items-center gap-2 rounded-md border border-borde px-3 py-1.5 text-sm text-slate-200 transition-colors hover:bg-borde/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw size={14} className={cargando ? 'animate-spin' : ''} />
            Actualizar
          </button>
        </div>

        <div className="mt-4 flex items-baseline gap-3">
          <span className="text-4xl font-bold text-peligro">
            {datos?.baneadas ?? 0}
          </span>
          <span className="text-sm text-slate-300">
            IP{(datos?.baneadas ?? 0) !== 1 ? 's' : ''} baneada{((datos?.baneadas ?? 0) !== 1 ? 's' : '')}
          </span>
        </div>
      </Card>

      {/* Lista de IPs baneadas */}
      <Card titulo="IPs baneadas">
        {!datos || datos.ips.length === 0 ? (
          <p className="text-sm text-slate-400">No hay IPs baneadas actualmente.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {datos.ips.map((ip) => (
              <li key={ip}>
                <Badge variante="peligro">
                  <span className="font-mono">{ip}</span>
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
