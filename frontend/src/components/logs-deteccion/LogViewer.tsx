import { useEffect, useRef } from 'react'
import { usePolling } from '../../hooks/usePolling'
import { INTERVALOS_POLLING } from '../../constants/polling'
import { Spinner } from '../common/Spinner'
import apiClient from '../../services/apiClient'

interface RespuestaAlertasLog {
  lineas: string[]
}

/** Visor scrollable de alertas.log con auto-scroll y polling cada 3 s. */
export function LogViewer() {
  const contenedorRef = useRef<HTMLDivElement>(null)

  const {
    datos,
    cargando,
    error,
  } = usePolling<RespuestaAlertasLog>(
    async () => {
      const respuesta = await apiClient.get<RespuestaAlertasLog>('/api/alerts/log')
      return respuesta.data
    },
    INTERVALOS_POLLING.ALERTAS_LOG,
  )

  // Auto-scroll al fondo solo si el usuario ya estaba al fondo (tolerancia 50 px).
  useEffect(() => {
    const contenedor = contenedorRef.current
    if (!contenedor) return

    const enElFondo =
      contenedor.scrollTop + contenedor.clientHeight >= contenedor.scrollHeight - 50

    if (enElFondo) {
      contenedor.scrollTop = contenedor.scrollHeight
    }
  }, [datos])

  const lineas = datos?.lineas ?? []

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-slate-100">Visor de logs</h2>

      {cargando && !datos ? (
        <div className="flex items-center gap-2 text-slate-400">
          <Spinner tamano={16} />
          <span className="text-sm">Cargando logs…</span>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-peligro/30 bg-peligro/10 p-4 text-sm text-peligro">
          Error al cargar logs: {error}
        </div>
      ) : lineas.length === 0 ? (
        <p className="text-sm text-slate-400">No hay líneas de log disponibles.</p>
      ) : (
        <div
          ref={contenedorRef}
          className="max-h-96 overflow-y-auto rounded-lg border border-borde bg-superficie p-3"
        >
          {lineas.map((linea, indice) => (
            <pre
              key={indice}
              className="whitespace-pre-wrap font-mono text-xs text-slate-300"
            >
              {linea}
            </pre>
          ))}
        </div>
      )}
    </div>
  )
}
