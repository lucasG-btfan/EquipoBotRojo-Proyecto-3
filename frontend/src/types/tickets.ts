/**
 * Tipos derivados de `backend/schemas/ticket.py` (TicketSchema). Ver
 * design.md D2.
 *
 * La tabla `security_tickets` (bd/schema-extended.sql) define `status` y
 * `priority` como `VARCHAR(50)` libre, sin enum ni check constraint. Los
 * valores realmente producidos por los workflows de n8n
 * (`Sistema de Tickets Automático.json`, `Anotar desbaneo en BD.json`) son
 * `open` / `urgent` / `resolved` para `status` y `low` / `medium` /
 * `critical` para `priority`. Declarar `status` como union cerrado sería
 * mentirle al compilador sobre un campo de texto libre; se modela como
 * `string` y se agregan las listas de valores conocidos para alimentar el
 * filtro de la UI y el mapeo de colores, con reserva para cualquier valor
 * no listado.
 */

/** Valores de `security_tickets.status` observados en los workflows de n8n. */
export const ESTADOS_TICKET_CONOCIDOS = ['open', 'urgent', 'resolved'] as const
export type EstadoTicketConocido = (typeof ESTADOS_TICKET_CONOCIDOS)[number]

/** Valores de `security_tickets.priority` observados en los workflows de n8n. */
export const PRIORIDADES_TICKET_CONOCIDAS = ['low', 'medium', 'critical'] as const
export type PrioridadTicketConocida = (typeof PRIORIDADES_TICKET_CONOCIDAS)[number]

/** Opciones que ofrece el filtro de estado de la sección "Tickets". */
export type FiltroEstadoTicket = EstadoTicketConocido | 'todos'

/** Opciones que ofrece el filtro de prioridad de la sección "Tickets". */
export type FiltroPrioridadTicket = PrioridadTicketConocida | 'todas'

/** `backend/schemas/ticket.py` -> TicketSchema */
export interface Ticket {
  id: number
  ticket_number: string
  title: string | null
  description: string | null
  status: string
  priority: string | null
  category: string | null
  source_ip: string | null
  threat_score: number | null
  assigned_to: string | null
  created_at: string | null
  updated_at: string | null
  alert_reference: number | null
}
