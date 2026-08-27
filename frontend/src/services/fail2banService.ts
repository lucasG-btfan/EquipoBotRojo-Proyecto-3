import apiClient from './apiClient'
import type { EstadoJail } from '../types/fail2ban'

/**
 * Llamadas HTTP de la sección "Fail2ban". Un único endpoint de lectura
 * que el componente consume vía usePolling.
 */
export async function obtenerEstadoJail(): Promise<EstadoJail> {
  const respuesta = await apiClient.get<EstadoJail>('/api/fail2ban/jail')
  return respuesta.data
}
