/**
 * Intervalos de polling (en milisegundos) usados por `usePolling` en todo
 * el panel. Ningún componente debe hardcodear un intervalo: siempre debe
 * referenciar una de estas constantes.
 *
 * "Tiempo real" en este proyecto es polling por intervalo, nunca
 * WebSockets ni Server-Sent Events (regla dura de AGENTS.md).
 */
export const INTERVALOS_POLLING = {
  /** Visor de alerts.log (sección Logs y detección). */
  ALERTAS_LOG: 3000,
  /** Tabla de métricas de sistema (CPU/RAM por contenedor). */
  METRICAS_SISTEMA: 10000,
  /** Estado de la jail y de las IPs baneadas por Fail2ban. */
  FAIL2BAN: 10000,
  /** Resumen general de la sección Dashboard. */
  DASHBOARD: 30000,
  /** Estado de las alertas de Prometheus. */
  PROMETHEUS: 30000,
} as const
