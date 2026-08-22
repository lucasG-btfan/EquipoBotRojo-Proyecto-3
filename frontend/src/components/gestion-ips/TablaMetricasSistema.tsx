import { useEffect, useState } from 'react'
import { Tabla } from '../common/Tabla'
import type { ColumnaTabla } from '../common/Tabla'
import { usePolling } from '../../hooks/usePolling'
import { INTERVALOS_POLLING } from '../../constants/polling'
import { obtenerMetricasSistema, FILAS_POR_PAGINA } from '../../services/ipsService'
import type { RespuestaPaginada } from '../../types/comun'
import type { MetricaSistema } from '../../types/ips'

/** Formatea un timestamp ISO a formato local argentino, o `—` si es null. */
function formatearFecha(timestamp: string | null): string {
  if (!timestamp) return '—'
  try {
    return new Date(timestamp).toLocaleString('es-AR')
  } catch {
    return timestamp
  }
}

/**
 * Tabla paginada de `system_metrics` con polling cada 10 s y filtro opcional
 * por rango de fechas (design.md D3, D4). Un `useEffect` sobre `offset` (y
 * sobre el rango de fechas) fuerza un `refrescar()` inmediato, sin esperar
 * al próximo tick del intervalo.
 */
export function TablaMetricasSistema() {
  const [offset, setOffset] = useState<number>(0)
  const [desde, setDesde] = useState<string>('')
  const [hasta, setHasta] = useState<string>('')

  const { datos, cargando, error, refrescar } = usePolling<RespuestaPaginada<MetricaSistema>>(
    () =>
      obtenerMetricasSistema({
        limit: FILAS_POR_PAGINA,
        offset,
        desde: desde === '' ? undefined : desde,
        hasta: hasta === '' ? undefined : hasta,
      }),
    INTERVALOS_POLLING.METRICAS_SISTEMA,
  )

  useEffect(() => {
    void refrescar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset, desde, hasta])

  const cambiarDesde = (valor: string) => {
    setDesde(valor)
    setOffset(0)
  }

  const cambiarHasta = (valor: string) => {
    setHasta(valor)
    setOffset(0)
  }

  const limpiarRango = () => {
    setDesde('')
    setHasta('')
    setOffset(0)
  }

  const columnas: ColumnaTabla<MetricaSistema>[] = [
    {
      clave: 'timestamp',
      encabezado: 'Fecha',
      render: (fila) => formatearFecha(fila.timestamp),
    },
    { clave: 'hostname', encabezado: 'Host' },
    { clave: 'metric_name', encabezado: 'Métrica' },
    {
      clave: 'metric_value',
      encabezado: 'Valor',
      render: (fila) => (fila.metric_value ?? '—'),
    },
  ]

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-100">Métricas del sistema</h2>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-base font-medium text-slate-300">
            Desde
            <input
              type="date"
              value={desde}
              max={hasta || undefined}
              onChange={(evento) => cambiarDesde(evento.target.value)}
              className="rounded-lg border border-borde bg-fondo px-4 py-2.5 text-base text-slate-200 focus:border-primario focus:outline-none"
            />
          </label>
          <label className="flex items-center gap-2 text-base font-medium text-slate-300">
            Hasta
            <input
              type="date"
              value={hasta}
              min={desde || undefined}
              onChange={(evento) => cambiarHasta(evento.target.value)}
              className="rounded-lg border border-borde bg-fondo px-4 py-2.5 text-base text-slate-200 focus:border-primario focus:outline-none"
            />
          </label>
          <button
            type="button"
            onClick={limpiarRango}
            className="rounded-lg border border-borde px-4 py-2.5 text-base font-medium text-slate-200 hover:bg-borde/30"
          >
            Limpiar rango
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-peligro/30 bg-peligro/10 p-4 text-sm text-peligro">
          Error al cargar métricas del sistema: {error}
        </div>
      ) : (
        <Tabla<MetricaSistema>
          columnas={columnas}
          respuesta={datos}
          cargando={cargando}
          claveFila={(fila) => fila.id}
          onCambiarOffset={setOffset}
        />
      )}
    </div>
  )
}
