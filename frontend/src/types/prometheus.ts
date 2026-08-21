/**
 * Tipos de la sección "Prometheus". Contrato verificado contra
 * backend/routers/prometheus.py y backend/services/prometheus_service.py
 * (`obtener_alertas_completas`) — ver design.md D2.
 */
export type EstadoAlerta = 'firing' | 'pending' | 'inactive' | 'no_configurada' | 'desconocido'

export interface AlertaPrometheus {
  nombre: string
  descripcion: string
  // El backend puede devolver un estado fuera del conjunto conocido; se acepta
  // string para no romper el render, y el mapeo de color cae en "neutro".
  estado: EstadoAlerta | string
}

export interface MetricasFail2banPrometheus {
  banned_ips: number | null
  up: number | null
}

export interface RespuestaAlertasPrometheus {
  alertas: AlertaPrometheus[]
  fail2ban: MetricasFail2banPrometheus
  ultima_actualizacion: string | null
}
