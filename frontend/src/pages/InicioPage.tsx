import { Link } from 'react-router-dom'
import {
  Shield,
  Workflow,
  Search,
  Ban,
  Activity,
  Database,
  FileText,
  type LucideIcon,
} from 'lucide-react'
import { Card } from '../components/common/Card'
import { Spinner } from '../components/common/Spinner'
import { usePolling } from '../hooks/usePolling'
import { INTERVALOS_POLLING } from '../constants/polling'
import apiClient from '../services/apiClient'
import type { Contenedor } from '../types/contenedores'

/* ------------------------------------------------------------------ */
/*  Datos estáticos de las tecnologías del stack SIEM                  */
/* ------------------------------------------------------------------ */

interface TecnologiaSIEM {
  nombre: string
  descripcion: string
  icono: LucideIcon
}

const TECNOLOGIAS: TecnologiaSIEM[] = [
  {
    nombre: 'Wazuh',
    descripcion: 'Detección de intrusiones y monitoreo de seguridad.',
    icono: Shield,
  },
  {
    nombre: 'n8n',
    descripcion: 'Automatización de workflows y orquestación.',
    icono: Workflow,
  },
  {
    nombre: 'Elasticsearch',
    descripcion: 'Motor de búsqueda y análisis de logs.',
    icono: Search,
  },
  {
    nombre: 'Fail2ban',
    descripcion: 'Bloqueo automático de IPs maliciosas.',
    icono: Ban,
  },
  {
    nombre: 'Prometheus',
    descripcion: 'Recolección y consulta de métricas.',
    icono: Activity,
  },
  {
    nombre: 'PostgreSQL',
    descripcion: 'Base de datos relacional para alertas y tickets.',
    icono: Database,
  },
  {
    nombre: 'Syslog-ng',
    descripcion: 'Colector y procesador de logs del sistema.',
    icono: FileText,
  },
]

/* ------------------------------------------------------------------ */
/*  Lógica de salud del sistema                                        */
/* ------------------------------------------------------------------ */

type EstadoSalud = 'operativo' | 'caido' | 'error'

interface ResultadoSalud {
  estado: EstadoSalud
  texto: string
}

function calcularSalud(contenedores: Contenedor[] | null, error: string | null): ResultadoSalud {
  if (error) {
    return { estado: 'error', texto: 'No se pudo verificar el estado' }
  }
  if (!contenedores) {
    return { estado: 'error', texto: 'No se pudo verificar el estado' }
  }
  const corriendo = contenedores.filter((c) => c.estado === 'running')
  if (corriendo.length >= 1) {
    return { estado: 'operativo', texto: 'Sistema operativo' }
  }
  return { estado: 'caido', texto: 'Sistema caído' }
}

const COLORES_DOT: Record<EstadoSalud, string> = {
  operativo: 'bg-exito',
  caido: 'bg-peligro',
  error: 'bg-advertencia',
}

/* ------------------------------------------------------------------ */
/*  Componente principal                                               */
/* ------------------------------------------------------------------ */

/** Página de presentación del SIEM Dashboard. */
export function InicioPage() {
  const { datos: contenedores, cargando, error } = usePolling<Contenedor[]>(
    async () => {
      const respuesta = await apiClient.get<Contenedor[]>('/api/status/containers')
      return respuesta.data
    },
    INTERVALOS_POLLING.DASHBOARD,
  )

  const salud = calcularSalud(contenedores, error)

  return (
    <div className="flex flex-col gap-8 p-6 lg:p-8 max-lg:gap-5 max-lg:p-4">
      {/* ——— Hero section ——— */}
      <section className="rounded-lg border border-borde bg-superficie p-8 lg:p-12 max-lg:p-5">
        <div className="flex flex-col items-start gap-6 max-lg:gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-100 lg:text-4xl max-lg:text-2xl">SIEM Dashboard</h1>
            <p className="mt-3 max-w-2xl text-slate-400">
              Panel de control centralizado para el sistema de detección de intrusiones.
              Monitoreo en tiempo real, automatización de respuesta y gestión de incidentes
              integrando las principales herramientas de código abierto de seguridad.
            </p>
          </div>

          {/* Indicador de salud */}
          <div className="flex items-center gap-2">
            {cargando ? (
              <>
                <Spinner tamano={14} />
                <span className="text-sm text-slate-400">Verificando estado del sistema…</span>
              </>
            ) : (
              <>
                <span
                  className={`inline-block h-3 w-3 rounded-full ${COLORES_DOT[salud.estado]}`}
                />
                <span className="text-sm text-slate-300">{salud.texto}</span>
              </>
            )}
          </div>

          {/* Botón CTA */}
          <Link
            to="/dashboard/panel"
            className="rounded-md bg-primario px-5 py-2.5 text-sm font-medium text-slate-100 transition-colors hover:bg-primario/90"
          >
            Ir al Dashboard
          </Link>
        </div>
      </section>

      {/* ——— Grid de tecnologías ——— */}
      <section>
        <h2 className="mb-5 text-2xl font-semibold text-slate-100 max-lg:text-xl">Tecnologías del stack</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {TECNOLOGIAS.map((tech) => {
            const Icono = tech.icono
            return (
              <Card key={tech.nombre} className="flex flex-col gap-4 p-6">
                <Icono className="h-12 w-12 text-primario" />
                <h3 className="text-xl font-semibold text-slate-100">{tech.nombre}</h3>
                <p className="text-base text-slate-400">{tech.descripcion}</p>
              </Card>
            )
          })}
        </div>
      </section>
    </div>
  )
}
