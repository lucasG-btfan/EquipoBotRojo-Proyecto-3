import { useEffect, useState } from 'react'
import { Tabla } from '../common/Tabla'
import type { ColumnaTabla } from '../common/Tabla'
import { Badge } from '../common/Badge'
import type { VarianteBadge } from '../common/Badge'
import { DetalleTicket } from './DetalleTicket'
import { obtenerTickets, resolverTicket, FILAS_POR_PAGINA } from '../../services/ticketsService'
import type { RespuestaPaginada } from '../../types/comun'
import { ESTADOS_TICKET_CONOCIDOS, PRIORIDADES_TICKET_CONOCIDAS } from '../../types/tickets'
import type { FiltroEstadoTicket, FiltroPrioridadTicket, Ticket } from '../../types/tickets'

/**
 * Formatea una fecha del backend a formato local argentino (design.md D7).
 * El backend emite `str(datetime)` (`"2026-08-19 14:32:11.123456"`, con
 * espacio en vez de `T`), que no está garantizado por la especificación de
 * ECMAScript. Se normaliza el separador antes de `new Date(...)` para caer
 * en el camino ISO especificado, y se degrada al valor crudo si el
 * resultado es `Invalid Date`.
 */
export function formatearFecha(valor: string | null): string {
  if (!valor) return '—'
  const fecha = new Date(valor.replace(' ', 'T'))
  if (Number.isNaN(fecha.getTime())) return valor
  return fecha.toLocaleString('es-AR')
}

/** Etiqueta y variante de `Badge` según `status` (design.md D6). Reserva `neutro` con el valor crudo. */
const ESTADO_A_PRESENTACION: Record<string, { etiqueta: string; variante: VarianteBadge }> = {
  open: { etiqueta: 'Abierto', variante: 'info' },
  urgent: { etiqueta: 'Urgente', variante: 'peligro' },
  resolved: { etiqueta: 'Resuelto', variante: 'exito' },
}

/** Etiqueta y variante de `Badge` según `priority` (design.md D6). Reserva `neutro` con el valor crudo. */
const PRIORIDAD_A_PRESENTACION: Record<string, { etiqueta: string; variante: VarianteBadge }> = {
  critical: { etiqueta: 'Crítica', variante: 'peligro' },
  high: { etiqueta: 'Alta', variante: 'naranja' },
  medium: { etiqueta: 'Media', variante: 'advertencia' },
  low: { etiqueta: 'Baja', variante: 'info' },
}

function presentacionEstado(status: string): { etiqueta: string; variante: VarianteBadge } {
  return ESTADO_A_PRESENTACION[status] ?? { etiqueta: status, variante: 'neutro' }
}

function presentacionPrioridad(priority: string): { etiqueta: string; variante: VarianteBadge } {
  return PRIORIDAD_A_PRESENTACION[priority] ?? { etiqueta: priority, variante: 'neutro' }
}

/**
 * Tabla paginada de `security_tickets` con filtro por estado y detalle
 * expandible (design.md D4, D5). Sin `usePolling`: se ofrece un botón
 * "Actualizar" explícito.
 */
export function TablaTickets() {
  const [respuesta, setRespuesta] = useState<RespuestaPaginada<Ticket> | null>(null)
  const [cargando, setCargando] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [offset, setOffset] = useState<number>(0)
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstadoTicket>('todos')
  const [filtroPrioridad, setFiltroPrioridad] = useState<FiltroPrioridadTicket>('todas')
  const [ticketExpandido, setTicketExpandido] = useState<number | null>(null)

  const [ticketEnConfirmacion, setTicketEnConfirmacion] = useState<number | null>(null)
  const [ticketResolviendo, setTicketResolviendo] = useState<number | null>(null)
  const [errorResolver, setErrorResolver] = useState<string | null>(null)

  const consultar = async () => {
    setCargando(true)
    try {
      const datos = await obtenerTickets({
        limit: FILAS_POR_PAGINA,
        offset,
        estado: filtroEstado === 'todos' ? undefined : filtroEstado,
        prioridad: filtroPrioridad === 'todas' ? undefined : filtroPrioridad,
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
  }, [offset, filtroEstado, filtroPrioridad])

  const cambiarFiltroEstado = (filtro: FiltroEstadoTicket) => {
    setFiltroEstado(filtro)
    setOffset(0)
    setTicketExpandido(null)
  }

  const cambiarFiltroPrioridad = (filtro: FiltroPrioridadTicket) => {
    setFiltroPrioridad(filtro)
    setOffset(0)
    setTicketExpandido(null)
  }

  const alternarDetalle = (id: number) => {
    setTicketExpandido((actual) => (actual === id ? null : id))
    setTicketEnConfirmacion(null)
    setErrorResolver(null)
  }

  const iniciarResolver = (id: number) => {
    setErrorResolver(null)
    setTicketEnConfirmacion(id)
  }

  const cancelarResolver = () => {
    setTicketEnConfirmacion(null)
  }

  const confirmarResolver = async (id: number) => {
    setErrorResolver(null)
    setTicketEnConfirmacion(null)
    setTicketResolviendo(id)

    try {
      await resolverTicket(id)
      await consultar()
    } catch (err) {
      setErrorResolver(err instanceof Error ? err.message : 'Error al cerrar el ticket')
    } finally {
      setTicketResolviendo(null)
    }
  }

  const columnas: ColumnaTabla<Ticket>[] = [
    {
      clave: 'ticket_number',
      encabezado: 'N.º de ticket',
      render: (fila) => <span className="font-mono">{fila.ticket_number}</span>,
    },
    {
      clave: 'title',
      encabezado: 'Título',
      render: (fila) => fila.title ?? '—',
    },
    {
      clave: 'status',
      encabezado: 'Estado',
      render: (fila) => {
        const { etiqueta, variante } = presentacionEstado(fila.status)
        return <Badge variante={variante}>{etiqueta}</Badge>
      },
    },
    {
      clave: 'priority',
      encabezado: 'Prioridad',
      render: (fila) => {
        if (fila.priority === null) return '—'
        const { etiqueta, variante } = presentacionPrioridad(fila.priority)
        return <Badge variante={variante}>{etiqueta}</Badge>
      },
    },
    {
      clave: 'category',
      encabezado: 'Categoría',
      render: (fila) => fila.category ?? '—',
    },
    {
      clave: 'source_ip',
      encabezado: 'IP de origen',
      render: (fila) => <span className="font-mono">{fila.source_ip ?? '—'}</span>,
    },
    {
      clave: 'threat_score',
      encabezado: 'Puntaje',
      render: (fila) => fila.threat_score ?? '—',
    },
    {
      clave: 'created_at',
      encabezado: 'Creado',
      render: (fila) => formatearFecha(fila.created_at),
    },
    {
      clave: 'id',
      encabezado: 'Detalle',
      render: (fila) => (
        <button
          type="button"
          onClick={() => alternarDetalle(fila.id)}
          className={
            ticketExpandido === fila.id
              ? 'rounded-md border border-primario/60 bg-primario/20 px-2 py-1 text-xs font-medium text-primario'
              : 'rounded-md border border-borde px-2 py-1 text-xs font-medium text-slate-300 hover:bg-borde/30'
          }
        >
          {ticketExpandido === fila.id ? 'Ocultar' : 'Ver detalle'}
        </button>
      ),
    },
  ]

  const ticketSeleccionado =
    ticketExpandido !== null
      ? (respuesta?.items.find((item) => item.id === ticketExpandido) ?? null)
      : null

  const sinResultadosPorFiltro =
    !cargando &&
    !error &&
    (filtroEstado !== 'todos' || filtroPrioridad !== 'todas') &&
    (respuesta?.total ?? 0) === 0

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-100">Tickets de seguridad</h2>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-base font-medium text-slate-300">
            Estado
            <select
              value={filtroEstado}
              onChange={(evento) => cambiarFiltroEstado(evento.target.value as FiltroEstadoTicket)}
              className="rounded-lg border border-borde bg-fondo px-4 py-2.5 text-base text-slate-200 focus:border-primario focus:outline-none"
            >
              <option value="todos">Todos</option>
              {ESTADOS_TICKET_CONOCIDOS.map((estado) => (
                <option key={estado} value={estado}>
                  {presentacionEstado(estado).etiqueta}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-base font-medium text-slate-300">
            Prioridad
            <select
              value={filtroPrioridad}
              onChange={(evento) =>
                cambiarFiltroPrioridad(evento.target.value as FiltroPrioridadTicket)
              }
              className="rounded-lg border border-borde bg-fondo px-4 py-2.5 text-base text-slate-200 focus:border-primario focus:outline-none"
            >
              <option value="todas">Todas</option>
              {PRIORIDADES_TICKET_CONOCIDAS.map((prioridad) => (
                <option key={prioridad} value={prioridad}>
                  {presentacionPrioridad(prioridad).etiqueta}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => void consultar()}
            className="rounded-lg border border-borde px-4 py-2.5 text-base font-medium text-slate-200 hover:bg-borde/30"
          >
            Actualizar
          </button>
        </div>
      </div>

      {sinResultadosPorFiltro && (
        <div className="mb-3 rounded-lg border border-borde bg-fondo p-3 text-sm text-slate-400">
          No hay tickets para el filtro aplicado.
        </div>
      )}

      {ticketSeleccionado && (
        <div className="mb-4">
          <DetalleTicket
            ticket={ticketSeleccionado}
            enConfirmacion={ticketEnConfirmacion === ticketSeleccionado.id}
            resolviendo={ticketResolviendo === ticketSeleccionado.id}
            errorResolver={errorResolver}
            onIniciarResolver={() => iniciarResolver(ticketSeleccionado.id)}
            onConfirmarResolver={() => void confirmarResolver(ticketSeleccionado.id)}
            onCancelarResolver={cancelarResolver}
          />
        </div>
      )}

      {error ? (
        <div className="rounded-lg border border-peligro/30 bg-peligro/10 p-4 text-sm text-peligro">
          Error al cargar tickets: {error}
        </div>
      ) : (
        <Tabla<Ticket>
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
