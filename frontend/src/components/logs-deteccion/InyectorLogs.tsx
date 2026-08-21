import { useState, useEffect, useRef } from 'react'
import { Spinner } from '../common/Spinner'
import apiClient from '../../services/apiClient'
import type { CategoriaInyeccion } from '../../types/workflows'

interface RespuestaInyeccion {
  mensaje: string
}

/** Selector de categoría + botón para inyectar logs de prueba. */
export function InyectorLogs() {
  const [categorias, setCategorias] = useState<CategoriaInyeccion[]>([])
  const [cargandoCatalogo, setCargandoCatalogo] = useState<boolean>(true)
  const [errorCatalogo, setErrorCatalogo] = useState<string | null>(null)
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>('')
  const [cargandoInyeccion, setCargandoInyeccion] = useState<boolean>(false)
  const [mensajeExito, setMensajeExito] = useState<string | null>(null)
  const [mensajeError, setMensajeError] = useState<string | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cargar catálogo una sola vez al montar.
  useEffect(() => {
    let montado = true

    async function cargarCategorias() {
      try {
        const respuesta = await apiClient.get<CategoriaInyeccion[]>(
          '/api/logs/inject/categorias',
        )
        if (montado) {
          setCategorias(respuesta.data)
          // Seleccionar la primera categoría habilitada por defecto.
          const primeraHabilitada = respuesta.data.find((c) => c.emisor_disponible)
          if (primeraHabilitada) {
            setCategoriaSeleccionada(primeraHabilitada.categoria)
          }
        }
      } catch (err) {
        if (montado) {
          const mensaje = err instanceof Error ? err.message : 'Error al cargar categorías'
          setErrorCatalogo(mensaje)
        }
      } finally {
        if (montado) {
          setCargandoCatalogo(false)
        }
      }
    }

    void cargarCategorias()
    return () => { montado = false }
  }, [])

  const categoriaActual = categorias.find((c) => c.categoria === categoriaSeleccionada)
  const botonDeshabilitado =
    cargandoInyeccion ||
    !categoriaSeleccionada ||
    !categoriaActual?.emisor_disponible

  const inyectar = async () => {
    if (botonDeshabilitado) return

    // Limpiar estados previos.
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setMensajeExito(null)
    setMensajeError(null)
    setCargandoInyeccion(true)

    try {
      const respuesta = await apiClient.post<RespuestaInyeccion>('/api/logs/inject', {
        categoria: categoriaSeleccionada,
      })
      setMensajeExito(respuesta.data.mensaje)
      timeoutRef.current = setTimeout(() => {
        setMensajeExito(null)
        timeoutRef.current = null
      }, 3000)
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error al inyectar logs'
      setMensajeError(mensaje)
    } finally {
      setCargandoInyeccion(false)
    }
  }

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-slate-100">Inyector de logs</h2>

      {cargandoCatalogo ? (
        <div className="flex items-center gap-2 text-slate-400">
          <Spinner tamano={16} />
          <span className="text-sm">Cargando categorías…</span>
        </div>
      ) : errorCatalogo ? (
        <div className="rounded-lg border border-peligro/30 bg-peligro/10 p-4 text-sm text-peligro">
          {errorCatalogo}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <select
            value={categoriaSeleccionada}
            onChange={(e) => setCategoriaSeleccionada(e.target.value)}
            className="rounded-lg border border-borde bg-superficie px-3 py-2 text-sm text-slate-200 focus:border-primario focus:outline-none max-lg:text-base"
          >
            {categorias.map((cat) => (
              <option
                key={cat.categoria}
                value={cat.categoria}
                disabled={!cat.emisor_disponible}
              >
                {cat.etiqueta} ({cat.cantidad_logs} logs)
                {!cat.emisor_disponible ? ' — emisor no disponible' : ''}
              </option>
            ))}
          </select>

          <button
            type="button"
            disabled={botonDeshabilitado}
            onClick={() => void inyectar()}
            className="flex items-center justify-center gap-2 rounded-lg border border-primario/40 bg-primario/10 px-4 py-2.5 text-sm font-medium text-primario transition-colors hover:bg-primario/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cargandoInyeccion && <Spinner tamano={14} />}
            Inyectar
          </button>
        </div>
      )}

      {/* Toast de éxito — se oculta a los 3 s */}
      {mensajeExito && (
        <div className="mt-3 rounded-lg border border-exito/30 bg-exito/10 p-3 text-sm text-exito">
          {mensajeExito}
        </div>
      )}

      {/* Error — persiste hasta la próxima inyección */}
      {mensajeError && (
        <div className="mt-3 rounded-lg border border-peligro/30 bg-peligro/10 p-3 text-sm text-peligro">
          {mensajeError}
        </div>
      )}
    </div>
  )
}
