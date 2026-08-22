import apiClient from './apiClient'
import type { RespuestaPaginada } from '../types/comun'
import type { Ticket } from '../types/tickets'

/**
 * Llamadas HTTP de la sección "Tickets" (ver
 * openspec/changes/ui-tickets/design.md D3). Contrato verificado en
 * `backend/routers/tickets.py`: `GET /api/tickets` acepta `limit`, `offset`,
 * `estado` (opcional, match exacto sobre `security_tickets.status`) y
 * `prioridad` (opcional, match exacto sobre `security_tickets.priority`).
 * `estado`/`prioridad` en `undefined` no se envían: axios omite las claves
 * `undefined` en `params`, que es exactamente la semántica de "sin filtro"
 * del backend.
 */

/** Filas por página (rango 20–50 de AGENTS.md). No se confía en el default 15 del backend. */
export const FILAS_POR_PAGINA = 20

export async function obtenerTickets(params: {
  limit: number
  offset: number
  estado?: string
  prioridad?: string
}): Promise<RespuestaPaginada<Ticket>> {
  const respuesta = await apiClient.get<RespuestaPaginada<Ticket>>('/api/tickets', {
    params,
  })
  return respuesta.data
}

/** Cierre manual de un ticket (`POST /api/tickets/{id}/resolve`): marca `status = 'resolved'`. */
export async function resolverTicket(id: number): Promise<{ mensaje: string }> {
  const respuesta = await apiClient.post<{ mensaje: string }>(`/api/tickets/${id}/resolve`)
  return respuesta.data
}
