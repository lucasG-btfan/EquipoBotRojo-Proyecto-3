/**
 * Tipos comunes de paginación offset/limit (contrato definido en
 * AGENTS.md): `{ items, total, limit, offset }` en la respuesta,
 * `{ limit, offset }` como parámetros de consulta.
 */

export interface RespuestaPaginada<T> {
  items: T[]
  total: number
  limit: number
  offset: number
}

export interface ParametrosPaginacion {
  limit: number
  offset: number
}
