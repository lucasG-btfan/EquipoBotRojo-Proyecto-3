import apiClient from './apiClient'
import type { RespuestaPaginada } from '../types/comun'
import type { IPBloqueada, MetricaSistema, PatronAtaque, RespuestaDesbloqueo } from '../types/ips'

/**
 * Llamadas HTTP de la sección "Gestión de IPs" (ver
 * openspec/changes/ui-gestion-ips/design.md D2). A diferencia de
 * `logs-deteccion`, que llama a `apiClient` directamente desde cada
 * componente, acá se centraliza el armado de query params condicionales
 * (`activo`, `ip`, `categoria`) para que esa lógica no se repita ni se
 * filtre a la capa de vista. Los parámetros `undefined` no se envían:
 * axios omite las claves `undefined` en `params`.
 */

/** Filas por página fijas para las tres tablas de la sección (rango 20–50 de AGENTS.md). */
export const FILAS_POR_PAGINA = 20

export async function obtenerIpsBloqueadas(params: {
  limit: number
  offset: number
  activo?: boolean
}): Promise<RespuestaPaginada<IPBloqueada>> {
  const respuesta = await apiClient.get<RespuestaPaginada<IPBloqueada>>('/api/ips/blocked', {
    params,
  })
  return respuesta.data
}

export async function desbloquearIp(ip: string): Promise<RespuestaDesbloqueo> {
  const respuesta = await apiClient.post<RespuestaDesbloqueo>(`/api/ips/${ip}/unblock`)
  return respuesta.data
}

export async function obtenerPatronesAtaque(params: {
  limit: number
  offset: number
  ip?: string
  categoria?: string
}): Promise<RespuestaPaginada<PatronAtaque>> {
  const respuesta = await apiClient.get<RespuestaPaginada<PatronAtaque>>(
    '/api/ips/attack-patterns',
    { params },
  )
  return respuesta.data
}

export async function obtenerMetricasSistema(params: {
  limit: number
  offset: number
}): Promise<RespuestaPaginada<MetricaSistema>> {
  const respuesta = await apiClient.get<RespuestaPaginada<MetricaSistema>>(
    '/api/metrics/system',
    { params },
  )
  return respuesta.data
}
