/**
 * Tipos derivados de `backend/schemas/ticket.py` (TicketSchema). Ver
 * design.md D5.
 *
 * Nota: la tabla `security_tickets` (bd/schema-extended.sql) define
 * `status` como `VARCHAR(50) DEFAULT 'open'` sin un enum ni un check
 * constraint explícito en el esquema SQL ni en el schema Pydantic. Se
 * infiere el union `EstadoTicket` a partir del ciclo de vida habitual de
 * un ticket de seguridad, siguiendo el mismo criterio que ya usa
 * `alerts.status` en `bd/schema.sql` (comentario `new, investigating,
 * resolved, false_positive`). Si el backend termina emitiendo otros
 * valores, este union se debe ajustar en el change que consuma tickets.
 */
export type EstadoTicket = 'open' | 'in_progress' | 'resolved' | 'closed'

/** `backend/schemas/ticket.py` -> TicketSchema */
export interface Ticket {
  id: number
  ticket_number: string
  title: string | null
  description: string | null
  status: EstadoTicket
  priority: string | null
  category: string | null
  source_ip: string | null
  threat_score: number | null
  assigned_to: string | null
  created_at: string | null
  updated_at: string | null
  alert_reference: number | null
}
