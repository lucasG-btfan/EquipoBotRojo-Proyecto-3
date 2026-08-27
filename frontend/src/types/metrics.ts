/**
 * Tipos derivados de los schemas Pydantic de métricas del backend
 * (`backend/schemas/metrica_sistema.py`, `prometheus.py`,
 * `ip_bloqueada.py`). Ver design.md D5.
 */

/** `backend/schemas/metrica_sistema.py` -> MetricaSistemaSchema */
export interface MetricaSistema {
  id: number
  timestamp: string | null
  hostname: string
  metric_name: string
  metric_value: number | null
  unit: string | null
}

/** `backend/schemas/prometheus.py` -> TPWSchema */
export interface MetricaTPW {
  valor_actual: number | null
  promedio: number | null
  historial: number[]
}

/** `backend/schemas/ip_bloqueada.py` -> IPBloqueadaSchema */
export interface IPBloqueada {
  id: number
  ip_address: string
  threat_score: number | null
  reason: string | null
  blocked_at: string | null
  blocked_until: string | null
  is_active: boolean
}
