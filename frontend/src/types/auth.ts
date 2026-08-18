/**
 * Tipos espejo del contrato de `POST /api/auth/login` (backend/schemas/auth.py).
 * Las claves replican el JSON tal cual lo emite el backend, incluida la eñe
 * de `contraseña`: son datos de red, no identificadores del dominio del
 * frontend (ver design.md D2, D9).
 */
export interface CredencialesLogin {
  usuario: string
  contraseña: string
}

export interface RespuestaLogin {
  access_token: string
  token_type: string
}
