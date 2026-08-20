/**
 * Tipos de la sección "Gestión de IPs". No duplica tipos ya definidos:
 * re-exporta `IPBloqueada` y `MetricaSistema` desde `types/metrics.ts` y
 * `PatronAtaque` desde `types/alertas.ts`, y agrega solo lo nuevo que
 * consume esta sección (ver openspec/changes/ui-gestion-ips/design.md D2).
 * Contrato verificado contra `backend/routers/ips.py`.
 */

export type { IPBloqueada, MetricaSistema } from './metrics'
export type { PatronAtaque } from './alertas'

/** Respuesta de `POST /api/ips/{ip}/unblock`. */
export interface RespuestaDesbloqueo {
  mensaje: string
}

/** Filtro de estado del listado de IPs bloqueadas. */
export type FiltroEstadoIp = 'activas' | 'inactivas' | 'todas'
