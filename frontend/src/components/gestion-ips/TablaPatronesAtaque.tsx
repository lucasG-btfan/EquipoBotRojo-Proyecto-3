import { useEffect, useState } from 'react'
import { Tabla } from '../common/Tabla'
import type { ColumnaTabla } from '../common/Tabla'
import { Badge } from '../common/Badge'
import { obtenerPatronesAtaque, FILAS_POR_PAGINA } from '../../services/ipsService'
import type { RespuestaPaginada } from '../../types/comun'
import type { PatronAtaque } from '../../types/ips'

const DEBOUNCE_MS = 400

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
 * Tabla paginada de `attack_patterns` con filtros por IP de origen y
 * categoría, ambos texto libre con debounce (ver design.md D3, D7). El
 * backend filtra por coincidencia parcial (LIKE) y no expone catálogo de
 * categorías.
 */
export function TablaPatronesAtaque() {
  const [respuesta, setRespuesta] = useState<RespuestaPaginada<PatronAtaque> | null>(null)
  const [cargando, setCargando] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [offset, setOffset] = useState<number>(0)
  const [filtroIp, setFiltroIp] = useState<string>('')
  const [filtroCategoria, setFiltroCategoria] = useState<string>('')

  useEffect(() => {
    const idTimeout = setTimeout(() => {
      const ip = filtroIp.trim()
      const categoria = filtroCategoria.trim()

      setCargando(true)
      obtenerPatronesAtaque({
        limit: FILAS_POR_PAGINA,
        offset,
        ip: ip === '' ? undefined : ip,
        categoria: categoria === '' ? undefined : categoria,
      })
        .then((datos) => {
          setRespuesta(datos)
          setError(null)
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : 'Error de conexión con el servidor')
        })
        .finally(() => {
          setCargando(false)
        })
    }, DEBOUNCE_MS)

    return () => clearTimeout(idTimeout)
  }, [offset, filtroIp, filtroCategoria])

  const cambiarFiltroIp = (valor: string) => {
    setFiltroIp(valor)
    setOffset(0)
  }

  const cambiarFiltroCategoria = (valor: string) => {
    setFiltroCategoria(valor)
    setOffset(0)
  }

  const limpiarFiltros = () => {
    setFiltroIp('')
    setFiltroCategoria('')
    setOffset(0)
  }

  const hayFiltroActivo = filtroIp.trim() !== '' || filtroCategoria.trim() !== ''
  const sinResultadosPorFiltro =
    !cargando && hayFiltroActivo && respuesta !== null && respuesta.total === 0

  const columnas: ColumnaTabla<PatronAtaque>[] = [
    { clave: 'pattern_type', encabezado: 'Categoría' },
    {
      clave: 'source_ip',
      encabezado: 'IP de origen',
      render: (fila) => <span className="font-mono">{fila.source_ip}</span>,
    },
    {
      clave: 'target_host',
      encabezado: 'Host objetivo',
      render: (fila) => fila.target_host ?? '—',
    },
    {
      clave: 'first_seen',
      encabezado: 'Primera vez',
      render: (fila) => formatearFecha(fila.first_seen),
    },
    {
      clave: 'last_seen',
      encabezado: 'Última vez',
      render: (fila) => formatearFecha(fila.last_seen),
    },
    { clave: 'occurrence_count', encabezado: 'Ocurrencias' },
    {
      clave: 'is_blocked',
      encabezado: 'Bloqueada la ultima vez?',
      render: (fila) =>
        fila.is_blocked ? (
          <Badge variante="peligro">Bloqueada</Badge>
        ) : (
          <Badge variante="neutro">No bloqueada</Badge>
        ),
    },
  ]

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-100">Patrones de ataque</h2>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={filtroIp}
            onChange={(evento) => cambiarFiltroIp(evento.target.value)}
            placeholder="Buscar por IP (ej. 192.168)…"
            className="rounded-lg border border-borde bg-fondo px-4 py-2.5 text-base text-slate-200 placeholder:text-slate-500 focus:border-primario focus:outline-none max-lg:w-full"
          />
          <input
            type="text"
            value={filtroCategoria}
            onChange={(evento) => cambiarFiltroCategoria(evento.target.value)}
            placeholder="Buscar por categoría (ej. brute)…"
            className="rounded-lg border border-borde bg-fondo px-4 py-2.5 text-base text-slate-200 placeholder:text-slate-500 focus:border-primario focus:outline-none max-lg:w-full"
          />
          <button
            type="button"
            onClick={limpiarFiltros}
            className="rounded-lg border border-borde px-4 py-2.5 text-base font-medium text-slate-200 hover:bg-borde/30"
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      {sinResultadosPorFiltro && (
        <p className="mb-3 text-sm text-slate-400">No hay patrones para el filtro aplicado.</p>
      )}

      {error ? (
        <div className="rounded-lg border border-peligro/30 bg-peligro/10 p-4 text-sm text-peligro">
          Error al cargar patrones de ataque: {error}
        </div>
      ) : (
        <Tabla<PatronAtaque>
          columnas={columnas}
          respuesta={respuesta}
          cargando={cargando}
          claveFila={(fila) => fila.id}
          onCambiarOffset={setOffset}
        />
      )}
    </div>
  )
}
