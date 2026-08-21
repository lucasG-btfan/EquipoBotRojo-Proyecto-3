import { useCallback } from 'react'
import { usePolling } from '../../hooks/usePolling'
import { INTERVALOS_POLLING } from '../../constants/polling'
import { Spinner } from '../common/Spinner'
import { Badge } from '../common/Badge'
import type { VarianteBadge } from '../common/Badge'
import apiClient from '../../services/apiClient'
import type { HistorialWorkflow } from '../../types/workflows'

/** Formatea segundos a string legible: "Xms", "Xs" o "Xm Ys". */
function formatearTiempo(segundos: number | null): string {
  if (segundos === null || segundos === undefined) return '—'
  if (segundos < 1) return `${Math.round(segundos * 1000)}ms`
  if (segundos < 60) return `${segundos.toFixed(1)}s`
  const minutos = Math.floor(segundos / 60)
  const segs = Math.round(segundos % 60)
  return `${minutos}m ${segs}s`
}

/** Formatea un timestamp ISO a formato local argento. */
function formatearTimestamp(timestamp: string | null): string {
  if (!timestamp) return '—'
  try {
    const fecha = new Date(timestamp)
    return fecha.toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return timestamp
  }
}

/** Mapea el status de una ejecución a la variante del Badge. */
function varianteEstado(status: string): VarianteBadge {
  const s = status.toLowerCase()
  if (s === 'success' || s === 'éxito' || s === 'exito') return 'exito'
  if (s === 'error' || s === 'failed' || s === 'fallo') return 'peligro'
  return 'neutro'
}

/** Mapea el status a texto legible. */
function textoEstado(status: string): string {
  const s = status.toLowerCase()
  if (s === 'success') return 'Éxito'
  if (s === 'error' || s === 'failed') return 'Error'
  return status
}

interface HistorialWorkflowsProps {
  /** Título de la sección (ej. "Historial de workflows"). */
  titulo: string
  /** Endpoint del backend a consultar (ej. "/api/workflows/runs"). */
  endpoint: string
  /** Si se muestra la columna "Logs procesados" (solo aplica al principal). */
  mostrarItemsProcesados?: boolean
}

/** Tabla de historial de ejecuciones de un workflow, con polling cada 3 s. */
export function HistorialWorkflows({ titulo, endpoint, mostrarItemsProcesados = false }: HistorialWorkflowsProps) {
  const peticion = useCallback(
    async () => {
      const respuesta = await apiClient.get<HistorialWorkflow>(endpoint, { params: { limit: 10 } })
      return respuesta.data
    },
    [endpoint],
  )

  const { datos, cargando, error } = usePolling<HistorialWorkflow>(peticion, INTERVALOS_POLLING.HISTORIAL_WORKFLOWS)

  const ejecuciones = datos?.ejecuciones ?? []

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-slate-100">{titulo}</h2>

      {cargando && !datos ? (
        <div className="flex items-center gap-2 text-slate-400">
          <Spinner tamano={16} />
          <span className="text-sm">Cargando historial…</span>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-peligro/30 bg-peligro/10 p-4 text-sm text-peligro">
          Error al cargar historial: {error}
        </div>
      ) : ejecuciones.length === 0 ? (
        <p className="text-sm text-slate-400">No hay ejecuciones registradas.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-borde bg-superficie">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-borde text-xs text-slate-400">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Inicio</th>
                <th className="px-4 py-3">Fin</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Duración</th>
                {mostrarItemsProcesados && <th className="px-4 py-3">Logs procesados</th>}
                <th className="px-4 py-3">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borde">
              {ejecuciones.map((ejecucion) => (
                <tr key={ejecucion.id} className="text-slate-300 hover:bg-borde/20">
                  <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs">
                    {ejecucion.id.slice(0, 8)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    {formatearTimestamp(ejecucion.startedAt)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    {formatearTimestamp(ejecucion.stoppedAt)}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variante={varianteEstado(ejecucion.status)}>
                      {textoEstado(ejecucion.status)}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    {formatearTiempo(ejecucion.duracion_segundos)}
                  </td>
                  {mostrarItemsProcesados && (
                    <td className="whitespace-nowrap px-4 py-2.5">
                      {ejecucion.items_procesados ?? '—'}
                    </td>
                  )}
                  <td className="max-w-xs truncate px-4 py-2.5 text-xs text-peligro" title={ejecucion.error ?? undefined}>
                    {ejecucion.error ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
