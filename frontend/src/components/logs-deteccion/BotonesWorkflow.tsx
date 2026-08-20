import { useState, useRef } from 'react'
import { Spinner } from '../common/Spinner'
import apiClient from '../../services/apiClient'
import type { RespuestaRunWorkflow } from '../../types/workflows'

/** Botones para disparar el workflow principal y el de métricas Prometheus. */
export function BotonesWorkflow() {
  const [cargandoPrincipal, setCargandoPrincipal] = useState<boolean>(false)
  const [cargandoMetricas, setCargandoMetricas] = useState<boolean>(false)
  const [mensajeExito, setMensajeExito] = useState<string | null>(null)
  const [mensajeError, setMensajeError] = useState<string | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const deshabilitado = cargandoPrincipal || cargandoMetricas

  const ejecutar = async (
    url: string,
    setCargando: (v: boolean) => void,
  ) => {
    // Limpiar toast de éxito anterior y cualquier timeout pendiente.
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setMensajeExito(null)
    setMensajeError(null)
    setCargando(true)

    try {
      const respuesta = await apiClient.post<RespuestaRunWorkflow>(url)
      setMensajeExito(`Ejecutada: ${respuesta.data.execution_id}`)
      timeoutRef.current = setTimeout(() => {
        setMensajeExito(null)
        timeoutRef.current = null
      }, 3000)
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error al ejecutar el workflow'
      setMensajeError(mensaje)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-slate-100">Ejecución de workflows</h2>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          disabled={deshabilitado}
          onClick={() => ejecutar('/api/workflows/main/run', setCargandoPrincipal)}
          className="flex items-center justify-center gap-2 rounded-lg border border-primario/40 bg-primario/10 px-4 py-2.5 text-sm font-medium text-primario transition-colors hover:bg-primario/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {cargandoPrincipal && <Spinner tamano={14} />}
          Ejecutar workflow principal
        </button>

        <button
          type="button"
          disabled={deshabilitado}
          onClick={() => ejecutar('/api/workflows/metrics/run', setCargandoMetricas)}
          className="flex items-center justify-center gap-2 rounded-lg border border-primario/40 bg-primario/10 px-4 py-2.5 text-sm font-medium text-primario transition-colors hover:bg-primario/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {cargandoMetricas && <Spinner tamano={14} />}
          Ejecutar métricas Prometheus
        </button>
      </div>

      {/* Toast de éxito — se oculta a los 3 s */}
      {mensajeExito && (
        <div className="mt-3 rounded-lg border border-exito/30 bg-exito/10 p-3 text-sm text-exito">
          {mensajeExito}
        </div>
      )}

      {/* Error — persiste hasta la próxima ejecución */}
      {mensajeError && (
        <div className="mt-3 rounded-lg border border-peligro/30 bg-peligro/10 p-3 text-sm text-peligro">
          {mensajeError}
        </div>
      )}
    </div>
  )
}
