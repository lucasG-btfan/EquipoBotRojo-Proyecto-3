/**
 * Tipos derivados de los schemas Pydantic de alertas del backend
 * (`backend/schemas/alerta.py`, `patron_ataque.py`, `prometheus.py`,
 * `wazuh.py`). Los nombres de campo se conservan tal como los emite el
 * backend (ver design.md D5): no se traducen al español.
 */

/** `backend/schemas/alerta.py` -> AlertaSchema */
export interface Alerta {
  id: number
  timestamp: string | null
  severity: string
  category: string
  source_host: string | null
  source_ip: string | null
  target_host: string | null
  event_count: number
  description: string | null
  raw_log: string | null
  status: string
  assigned_to: string | null
  notes: string | null
  resolved_at: string | null
  risk_score: number | null
  risk_level: string | null
  threat_reputation: string | null
  // El backend lo tipa como `Any | None`; nunca `any` en el frontend
  // (regla dura). El consumidor debe hacer narrowing antes de usarlo.
  threat_intel: unknown | null
}

/** `backend/schemas/patron_ataque.py` -> PatronAtaqueSchema */
export interface PatronAtaque {
  id: number
  pattern_type: string
  source_ip: string
  target_host: string | null
  first_seen: string | null
  last_seen: string | null
  occurrence_count: number
  is_blocked: boolean
  recent_count: number
  window_start: string | null
}

/** `backend/schemas/prometheus.py` -> AlertaPrometheusSchema */
export interface AlertaPrometheus {
  nombre: string
  /** "firing" o "inactive" */
  estado: string
  severidad: string | null
}

/** `backend/schemas/wazuh.py` -> ConteoAlertasWazuhSchema */
export interface ConteoAlertasWazuh {
  total: number
  por_severidad: Record<string, number>
}
