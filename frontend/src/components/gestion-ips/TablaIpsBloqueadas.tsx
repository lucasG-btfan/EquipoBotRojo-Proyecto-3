import { useEffect, useRef, useState } from 'react'
import { Tabla } from '../common/Tabla'
import type { ColumnaTabla } from '../common/Tabla'
import { Badge } from '../common/Badge'
import { Spinner } from '../common/Spinner'
import { desbloquearIp, obtenerIpsBloqueadas, FILAS_POR_PAGINA } from '../../services/ipsService'
import type { RespuestaPaginada } from '../../types/comun'
import type { FiltroEstadoIp, IPBloqueada } from '../../types/ips'

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

/** Traduce el filtro de estado al parámetro `activo` que espera el backend. */
function activoDesdeFiltro(filtro: FiltroEstadoIp): boolean | undefined {
  if (filtro === 'activas') return true
  if (filtro === 'inactivas') return false
  return undefined
}

/**
 * Tabla paginada de `blocked_ips` con filtro por estado y desbloqueo manual
 * con confirmación en dos pasos (ver design.md D3, D4, D6). Sin `usePolling`:
 * es una tabla que el operador lee y opera, no un flujo en vivo.
 */
export function TablaIpsBloqueadas() {
  const [respuesta, setRespuesta] = useState<RespuestaPaginada<IPBloqueada> | null>(null)
  const [cargando, setCargando] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [offset, setOffset] = useState<number>(0)
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstadoIp>('activas')
  const [filtroMotivo, setFiltroMotivo] = useState<string>('')
  const [filtroMotivoDebounced, setFiltroMotivoDebounced] = useState<string>('')

  const [ipEnConfirmacion, setIpEnConfirmacion] = useState<string | null>(null)
  const [ipEnProceso, setIpEnProceso] = useState<string | null>(null)
  const [mensajeExito, setMensajeExito] = useState<string | null>(null)
  const [mensajeError, setMensajeError] = useState<string | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const consultar = async () => {
    setCargando(true)
    try {
      const datos = await obtenerIpsBloqueadas({
        limit: FILAS_POR_PAGINA,
        offset,
        activo: activoDesdeFiltro(filtroEstado),
        motivo: filtroMotivoDebounced.trim() === '' ? undefined : filtroMotivoDebounced.trim(),
      })
      setRespuesta(datos)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión con el servidor')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void consultar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset, filtroEstado, filtroMotivoDebounced])

  useEffect(() => {
    const idTimeout = setTimeout(() => {
      setFiltroMotivoDebounced(filtroMotivo)
      setOffset(0)
    }, DEBOUNCE_MS)

    return () => clearTimeout(idTimeout)
  }, [filtroMotivo])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const cambiarFiltro = (filtro: FiltroEstadoIp) => {
    setFiltroEstado(filtro)
    setOffset(0)
  }

  const iniciarConfirmacion = (ip: string) => {
    setMensajeError(null)
    setIpEnConfirmacion(ip)
  }

  const cancelarConfirmacion = () => {
    setIpEnConfirmacion(null)
  }

  const confirmarDesbloqueo = async (ip: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setMensajeExito(null)
    setMensajeError(null)
    setIpEnConfirmacion(null)
    setIpEnProceso(ip)

    try {
      await desbloquearIp(ip)
      setMensajeExito(
        `IP ${ip}: desbloqueo enviado. La actualización en la base de datos es asíncrona (vía workflow n8n de fail2ban) y puede tardar unos segundos en reflejarse.`,
      )
      timeoutRef.current = setTimeout(() => {
        setMensajeExito(null)
        timeoutRef.current = null
      }, 3000)
      await consultar()
    } catch (err) {
      setMensajeError(err instanceof Error ? err.message : 'Error al desbloquear la IP')
    } finally {
      setIpEnProceso(null)
    }
  }

  const columnas: ColumnaTabla<IPBloqueada>[] = [
    {
      clave: 'ip_address',
      encabezado: 'IP',
      render: (fila) => <span className="font-mono">{fila.ip_address}</span>,
    },
    {
      clave: 'threat_score',
      encabezado: 'Puntaje',
      render: (fila) => (fila.threat_score ?? '—'),
    },
    {
      clave: 'reason',
      encabezado: 'Motivo',
      render: (fila) => fila.reason ?? '—',
    },
    {
      clave: 'blocked_at',
      encabezado: 'Bloqueada el',
      render: (fila) => formatearFecha(fila.blocked_at),
    },
    {
      clave: 'is_active',
      encabezado: 'Estado',
      render: (fila) =>
        fila.is_active ? (
          <Badge variante="exito">Activa (bloqueada)</Badge>
        ) : (
          <Badge variante="neutro">Inactiva</Badge>
        ),
    },
    {
      clave: 'id',
      encabezado: 'Acción',
      render: (fila) => {
        if (!fila.is_active) return null

        if (ipEnProceso === fila.ip_address) {
          return <Spinner tamano={16} />
        }

        if (ipEnConfirmacion === fila.ip_address) {
          return (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void confirmarDesbloqueo(fila.ip_address)}
                className="rounded-md border border-peligro/40 bg-peligro/10 px-2 py-1 text-xs font-medium text-peligro hover:bg-peligro/20"
              >
                ¿Confirmar?
              </button>
              <button
                type="button"
                onClick={cancelarConfirmacion}
                className="rounded-md border border-borde px-2 py-1 text-xs font-medium text-slate-300 hover:bg-borde/30"
              >
                Cancelar
              </button>
            </div>
          )
        }

        return (
          <button
            type="button"
            disabled={ipEnProceso !== null}
            onClick={() => iniciarConfirmacion(fila.ip_address)}
            className="rounded-md border border-primario/40 bg-primario/10 px-2 py-1 text-xs font-medium text-primario hover:bg-primario/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Desbloquear
          </button>
        )
      },
    },
  ]

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-100">IPs bloqueadas</h2>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={filtroMotivo}
            onChange={(evento) => setFiltroMotivo(evento.target.value)}
            placeholder="Buscar por motivo…"
            className="rounded-lg border border-borde bg-fondo px-4 py-2.5 text-base text-slate-200 placeholder:text-slate-500 focus:border-primario focus:outline-none max-lg:w-full"
          />
          <select
            value={filtroEstado}
            onChange={(evento) => cambiarFiltro(evento.target.value as FiltroEstadoIp)}
            className="rounded-lg border border-borde bg-fondo px-4 py-2.5 text-base text-slate-200 focus:border-primario focus:outline-none"
          >
            <option value="activas">Activas</option>
            <option value="inactivas">Inactivas</option>
            <option value="todas">Todas</option>
          </select>
          <button
            type="button"
            onClick={() => void consultar()}
            className="rounded-lg border border-borde px-4 py-2.5 text-base font-medium text-slate-200 hover:bg-borde/30"
          >
            Actualizar
          </button>
        </div>
      </div>

      {mensajeExito && (
        <div className="mb-3 rounded-lg border border-exito/30 bg-exito/10 p-3 text-sm text-exito">
          {mensajeExito}
        </div>
      )}

      {mensajeError && (
        <div className="mb-3 rounded-lg border border-peligro/30 bg-peligro/10 p-3 text-sm text-peligro">
          {mensajeError}
        </div>
      )}

      {error ? (
        <div className="rounded-lg border border-peligro/30 bg-peligro/10 p-4 text-sm text-peligro">
          Error al cargar IPs bloqueadas: {error}
        </div>
      ) : (
        <Tabla<IPBloqueada>
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
