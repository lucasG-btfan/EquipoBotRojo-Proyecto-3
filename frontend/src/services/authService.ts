import apiClient, { RUTA_LOGIN } from './apiClient'
import type { CredencialesLogin, RespuestaLogin } from '../types/auth'

/**
 * Autentica contra el backend. No captura errores: el interceptor de
 * `apiClient` ya los normaliza a `Error` con mensaje en español, y es la
 * capa superior (`AuthContext`) la que decide qué hacer con ellos
 * (ver design.md D1, D4).
 */
export async function iniciarSesion(credenciales: CredencialesLogin): Promise<RespuestaLogin> {
  const { data } = await apiClient.post<RespuestaLogin>(RUTA_LOGIN, credenciales)
  return data
}
