import { formatearFecha } from './TablaTickets'
import type { Ticket } from '../../types/tickets'

interface DetalleTicketProps {
  ticket: Ticket
  /** `true` si este ticket está en el paso de "¿Confirmar?" antes de cerrarlo. */
  enConfirmacion: boolean
  /** `true` mientras la llamada a `POST /resolve` de este ticket está en curso. */
  resolviendo: boolean
  /** Mensaje de error de la última resolución fallida de este ticket, si lo hay. */
  errorResolver: string | null
  onIniciarResolver: () => void
  onConfirmarResolver: () => void
  onCancelarResolver: () => void
}

/**
 * Panel de detalle de un ticket: los campos que no entran en la tabla, más
 * el cierre manual para tickets `open` que el workflow de n8n no resuelve
 * automáticamente (ej. `sudo_usage`, `kernel_oops`, `service_restart`). El
 * estado de la confirmación/resolución vive en `TablaTickets` (contenedor);
 * este componente es presentacional, solo recibe props.
 */
export function DetalleTicket({
  ticket,
  enConfirmacion,
  resolviendo,
  errorResolver,
  onIniciarResolver,
  onConfirmarResolver,
  onCancelarResolver,
}: DetalleTicketProps) {
  return (
    <div className="rounded-lg border border-borde bg-fondo p-4 text-sm text-slate-200">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-slate-100">
          Detalle del ticket {ticket.ticket_number}
        </h3>

        {ticket.status === 'open' && (
          <div className="flex items-center gap-2">
            {resolviendo ? (
              <span className="text-xs text-slate-400">Cerrando ticket…</span>
            ) : enConfirmacion ? (
              <>
                <button
                  type="button"
                  onClick={onConfirmarResolver}
                  className="rounded-md border border-exito/40 bg-exito/10 px-2 py-1 text-xs font-medium text-exito hover:bg-exito/20"
                >
                  ¿Confirmar cierre?
                </button>
                <button
                  type="button"
                  onClick={onCancelarResolver}
                  className="rounded-md border border-borde px-2 py-1 text-xs font-medium text-slate-300 hover:bg-borde/30"
                >
                  Cancelar
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onIniciarResolver}
                className="rounded-md border border-primario/40 bg-primario/10 px-3 py-1.5 text-xs font-medium text-primario hover:bg-primario/20"
              >
                Cerrar ticket
              </button>
            )}
          </div>
        )}
      </div>

      {errorResolver && (
        <div className="mb-3 rounded-lg border border-peligro/30 bg-peligro/10 p-2.5 text-xs text-peligro">
          {errorResolver}
        </div>
      )}

      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <dt className="text-xs font-medium text-slate-400">Descripción</dt>
          <dd className="mt-1 whitespace-pre-wrap">{ticket.description ?? 'Sin descripción.'}</dd>
        </div>

        <div>
          <dt className="text-xs font-medium text-slate-400">Responsable</dt>
          <dd className="mt-1">{ticket.assigned_to ?? 'Sin asignar'}</dd>
        </div>

        <div>
          <dt className="text-xs font-medium text-slate-400">Última actualización</dt>
          <dd className="mt-1">{formatearFecha(ticket.updated_at)}</dd>
        </div>

        <div>
          <dt className="text-xs font-medium text-slate-400">Referencia de alerta</dt>
          <dd className="mt-1">{ticket.alert_reference ?? 'Sin alerta asociada'}</dd>
        </div>
      </dl>
    </div>
  )
}
