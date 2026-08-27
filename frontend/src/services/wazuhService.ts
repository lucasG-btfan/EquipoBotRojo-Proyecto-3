import apiClient from './apiClient'
import type { ConteoAlertasWazuh } from '../types/wazuh'

/**
 * Llamadas HTTP de la sección "Wazuh". Un único endpoint de lectura
 * que el componente consume vía usePolling.
 */
export async function obtenerConteoAlertasWazuh(): Promise<ConteoAlertasWazuh> {
  const respuesta = await apiClient.get<ConteoAlertasWazuh>('/api/wazuh/alerts/count')
  return respuesta.data
}
