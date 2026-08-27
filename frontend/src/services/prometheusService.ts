import apiClient from './apiClient'
import type { RespuestaAlertasPrometheus } from '../types/prometheus'

/**
 * Llamadas HTTP de la sección "Prometheus". Un único endpoint de lectura
 * que el componente consume vía usePolling.
 */
export async function obtenerAlertasPrometheus(): Promise<RespuestaAlertasPrometheus> {
  const respuesta = await apiClient.get<RespuestaAlertasPrometheus>('/api/prometheus/alerts')
  return respuesta.data
}
