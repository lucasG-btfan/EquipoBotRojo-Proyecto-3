/**
 * Tipos derivados de los schemas Pydantic de contenedores, Fail2ban y
 * workflows del backend (`backend/schemas/contenedor.py`, `fail2ban.py`,
 * `workflows.py`). Ver design.md D5.
 */

/** `backend/schemas/contenedor.py` -> ContenedorSchema */
export interface Contenedor {
  nombre: string
  estado: string
  puerto: string | null
}

/** `backend/schemas/contenedor.py` -> RecursoSchema */
export interface RecursoContenedor {
  nombre: string
  cpu_porcentaje: number | null
  ram_porcentaje: number | null
  ram_uso: string | null
}

/** `backend/schemas/fail2ban.py` -> JailSchema */
export interface EstadoJail {
  nombre: string
  estado: string
  total_baneadas: number
}

/** `backend/schemas/fail2ban.py` -> IPBaneadaSchema */
export interface IPBaneada {
  ip: string
  jail: string
  baneada_desde: string | null
  baneada_hasta: string | null
}

/** `backend/schemas/workflows.py` -> EjecucionWorkflowSchema */
export interface EjecucionWorkflow {
  id: string
  nombre: string
  /** "éxito" o "error" */
  estado: string
  ejecutado_en: string | null
  duracion_segundos: number | null
}
