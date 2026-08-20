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
 * Tabla paginada de `system_metrics` con polling cada 10 s (design.md D3,
 * D4). Un `useEffect` sobre `offset` fuerza un `refrescar()` inmediato al
 * cambiar de página, sin esperar al próximo tick del intervalo.
 */
export function TablaMetricasSistema() {
  const [offset, setOffset] = useState<number>(0)

  const { datos, cargando, error, refrescar } = usePolling<RespuestaPaginada<MetricaSistema>>(
    () => obtenerMetricasSistema({ limit: FILAS_POR_PAGINA, offset }),
    INTERVALOS_POLLING.METRICAS_SISTEMA,
  )

  useEffect(() => {
    void refrescar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset])

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
      <h2 className="mb-4 text-lg font-semibold text-slate-100">Métricas del sistema</h2>

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
