import { formatearFecha } from './TablaTickets'
import type { Ticket } from '../../types/tickets'

interface DetalleTicketProps {
  ticket: Ticket
}

/**
 * Panel de detalle de un ticket: los campos que no entran en la tabla
 * (design.md D5). Componente de presentación puro, sin estado ni llamadas
 * HTTP.
 */
export function DetalleTicket({ ticket }: DetalleTicketProps) {
  return (
    <div className="rounded-lg border border-borde bg-fondo p-4 text-sm text-slate-200">
      <h3 className="mb-3 text-base font-semibold text-slate-100">
        Detalle del ticket {ticket.ticket_number}
      </h3>

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
