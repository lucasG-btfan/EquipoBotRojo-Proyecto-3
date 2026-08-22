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
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      {/* Card resumen */}
      <Card className="p-8 lg:col-span-2">
        <div className="flex items-center justify-between max-lg:flex-wrap max-lg:gap-2">
          <h3 className="text-lg font-semibold text-slate-100">
            Jail: <span className="font-mono text-primario">{datos?.jail ?? '—'}</span>
          </h3>
          <button
            type="button"
            onClick={() => void refrescar()}
            disabled={cargando}
            className="flex items-center gap-2 rounded-lg border border-borde px-5 py-2.5 text-base font-medium text-slate-200 transition-colors hover:bg-borde/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw size={18} className={cargando ? 'animate-spin' : ''} />
            Actualizar
          </button>
        </div>
        <p className="mt-2 text-sm text-slate-400">
          Última actualización: {new Date().toLocaleString('es-AR')}
        </p>

        <div className="mt-8 flex items-baseline gap-4">
          <span className="text-7xl font-bold text-peligro max-lg:text-5xl">
            {datos?.baneadas ?? 0}
          </span>
          <span className="text-lg text-slate-300">
            IP{(datos?.baneadas ?? 0) !== 1 ? 's' : ''} baneada{((datos?.baneadas ?? 0) !== 1 ? 's' : '')}
          </span>
        </div>
      </Card>

      {/* Lista de IPs baneadas */}
      <Card className="p-8 lg:col-span-3">
        <h3 className="mb-5 text-lg font-semibold text-slate-100">IPs baneadas</h3>
        {!datos || datos.ips.length === 0 ? (
          <p className="text-base text-slate-400">No hay IPs baneadas actualmente.</p>
        ) : (
          <ul className="flex flex-wrap gap-3">
            {datos.ips.map((ip) => (
              <li key={ip}>
                <span className="inline-flex items-center rounded-full bg-peligro/15 px-4 py-2 font-mono text-base text-peligro">
                  {ip}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
