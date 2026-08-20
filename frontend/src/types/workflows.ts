/**
 * Tipos para la sección "Logs y detección" — workflows e inyección de logs.
 *
 * Los nombres de campo coinciden exactamente con los schemas del backend:
 * - EjecucionWorkflow → backend/schemas/workflows.py (EjecucionWorkflowSchema)
 * - HistorialWorkflow → backend/schemas/workflows.py (HistorialWorkflowSchema)
 * - CategoriaInyeccion → backend/schemas/logs.py (CategoriaLogSchema)
 * - RespuestaRunWorkflow → backend/schemas/workflows.py (RespuestaRunWorkflowSchema)
 */

/** Una ejecución individual de un workflow (n8n). */
export interface EjecucionWorkflow {
  /** ID de la ejecución (UUID). */
  id: string
  /** Timestamp de inicio (ISO 8601) o null si aún no empezó. */
  startedAt: string | null
  /** Timestamp de fin (ISO 8601) o null si aún no terminó. */
  stoppedAt: string | null
  /** Estado de la ejecución: "success", "error", "running", etc. */
  status: string
  /** Duración total en segundos o null si no se pudo calcular. */
  duracion_segundos: number | null
}

/** Respuesta paginada del endpoint GET /api/workflows/runs. */
export interface HistorialWorkflow {
  ejecuciones: EjecucionWorkflow[]
  total: number
}

/** Categoría disponible para inyección de logs de prueba. */
export interface CategoriaInyeccion {
  /** Clave interna de la categoría (se envía al backend). */
  categoria: string
  /** Nombre legible para mostrar en el selector. */
  etiqueta: string
  /** Host de origen del log inyectado. */
  host_origen: string
  /** Cantidad de líneas de log que se inyectan por ejecución. */
  cantidad_logs: number
  /** Si el emisor (logger) está disponible en el stack actual. */
  emisor_disponible: boolean
}

/** Respuesta del endpoint POST /api/workflows/main/run o /metrics/run. */
export interface RespuestaRunWorkflow {
  mensaje: string
  execution_id: string
}
