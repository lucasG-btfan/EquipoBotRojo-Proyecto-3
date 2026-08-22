import {
  Server,
  Ban,
  ShieldCheck,
  Timer,
  AlertTriangle,
  Activity,
} from 'lucide-react'
import { Card } from '../components/common/Card'
import { Badge } from '../components/common/Badge'
import { Spinner } from '../components/common/Spinner'
import { usePolling } from '../hooks/usePolling'
import { INTERVALOS_POLLING } from '../constants/polling'
import apiClient from '../services/apiClient'
import type { Contenedor } from '../types/contenedores'
import type { Alerta } from '../types/alertas'
import type { MetricaTPW } from '../types/metrics'
import type { RespuestaPaginada } from '../types/comun'
import type { VarianteBadge } from '../components/common/Badge'

/* ------------------------------------------------------------------ */
/*  Tipos para la respuesta de /api/prometheus/alerts                  */
/* ------------------------------------------------------------------ */

interface Fail2banPrometheus {
  banned_ips: number | null
  up: boolean | null
}

interface AlertasPrometheusRespuesta {
  alertas: Array<{ nombre: string; estado: string; severidad: string | null }>
  fail2ban: Fail2banPrometheus
  ultima_actualizacion: string | null
}

/* ------------------------------------------------------------------ */
/*  Helpers de formato                                                 */
/* ------------------------------------------------------------------ */

function formatearTiempo(segundos: number | null): string {
  if (segundos === null || segundos === undefined) return '—'
  if (segundos < 1) return `${Math.round(segundos * 1000)}ms`
  if (segundos < 60) return `${segundos.toFixed(1)}s`
  const minutos = Math.floor(segundos / 60)
  const segs = Math.round(segundos % 60)
  return `${minutos}m ${segs}s`
}

function formatearTimestamp(timestamp: string | null): string {
  if (!timestamp) return '—'
  try {
    const fecha = new Date(timestamp)
    return fecha.toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return timestamp
  }
}

function varianteSeveridad(severidad: string): VarianteBadge {
  const s = severidad.toLowerCase()
  if (s === 'critical' || s === 'critico' || s === 'critica') return 'peligro'
  if (s === 'high' || s === 'alto') return 'peligro'
  if (s === 'medium' || s === 'medio') return 'advertencia'
  if (s === 'low' || s === 'bajo') return 'info'
  return 'neutro'
}

function varianteRiskLevel(level: string | null): VarianteBadge {
  if (!level) return 'neutro'
  const l = level.toLowerCase()
  if (l === 'critical' || l === 'critico' || l === 'critica' || l === 'high' || l === 'alto')
    return 'peligro'
  if (l === 'medium' || l === 'medio') return 'advertencia'
  if (l === 'low' || l === 'bajo') return 'info'
  return 'neutro'
}

/* ------------------------------------------------------------------ */
/*  Componente KPI Card                                                */
/* ------------------------------------------------------------------ */

interface KpiCardProps {
  titulo: string
  valor: string | number
  icono: React.ReactNode
  variante?: VarianteBadge
}

function KpiCard({ titulo, valor, icono, variante }: KpiCardProps) {
  return (
    <Card className="flex items-center gap-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primario/15 text-primario max-lg:h-10 max-lg:w-10">
        {icono}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs text-slate-400">{titulo}</p>
        <p className="text-xl font-bold text-slate-100">{valor}</p>
      </div>
      {variante && (
        <Badge variante={variante}>
          {variante === 'exito' ? 'OK' : variante === 'peligro' ? 'Alerta' : 'Info'}
        </Badge>
      )}
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Componente principal                                               */
/* ------------------------------------------------------------------ */

/** Sección Dashboard: KPIs, contenedores, alertas recientes y TPW. */
export function DashboardPage() {
  /* ——— Polls independientes ——— */
  const {
    datos: contenedores,
    cargando: cargandoContenedores,
    error: errorContenedores,
  } = usePolling<Contenedor[]>(
    async () => {
      const respuesta = await apiClient.get<Contenedor[]>('/api/status/containers')
      return respuesta.data
    },
    INTERVALOS_POLLING.METRICAS_SISTEMA, // 10s
  )

  const {
    datos: prometheus,
    cargando: cargandoPrometheus,
    error: errorPrometheus,
  } = usePolling<AlertasPrometheusRespuesta>(
    async () => {
      const respuesta = await apiClient.get<AlertasPrometheusRespuesta>(
        '/api/prometheus/alerts',
      )
      return respuesta.data
    },
    INTERVALOS_POLLING.PROMETHEUS, // 30s
  )

  const {
    datos: alertasRespuesta,
    cargando: cargandoAlertas,
    error: errorAlertas,
  } = usePolling<RespuestaPaginada<Alerta>>(
    async () => {
      const respuesta = await apiClient.get<RespuestaPaginada<Alerta>>(
        '/api/alerts/recent',
        { params: { limit: 20, offset: 0 } },
      )
      return respuesta.data
    },
    INTERVALOS_POLLING.DASHBOARD, // 30s
  )

  const {
    datos: tpw,
    cargando: cargandoTpw,
    error: errorTpw,
  } = usePolling<MetricaTPW>(
    async () => {
      const respuesta = await apiClient.get<MetricaTPW>('/api/metrics/tpw')
      return respuesta.data
    },
    INTERVALOS_POLLING.DASHBOARD, // 30s
  )

  /* ——— Datos derivados para KPIs ——— */
  const contenedoresActivos = contenedores?.filter((c) => c.estado === 'running').length ?? 0
  const ipsBaneadas = prometheus?.fail2ban.banned_ips ?? 0
  const fail2banActivo = prometheus?.fail2ban.up ?? false
  const ultimoTpw = tpw?.valor_actual ?? null

  const alertas = alertasRespuesta?.items ?? []

  /* ——— Estados de carga global ——— */
  const cargandoInicial =
    cargandoContenedores && cargandoPrometheus && cargandoAlertas && cargandoTpw
  const hayError = errorContenedores || errorPrometheus || errorAlertas || errorTpw

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 max-lg:gap-4 max-lg:p-4">
      <h1 className="text-2xl font-bold text-slate-100 max-lg:text-xl">Dashboard</h1>

      {/* ——— Fila de KPI cards ——— */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          titulo="Contenedores activos"
          valor={cargandoContenedores ? '…' : contenedoresActivos}
          icono={<Server className="h-6 w-6" />}
          variante={contenedoresActivos > 0 ? 'exito' : 'peligro'}
        />
        <KpiCard
          titulo="IPs baneadas"
          valor={cargandoPrometheus ? '…' : ipsBaneadas}
          icono={<Ban className="h-6 w-6" />}
          variante={ipsBaneadas > 0 ? 'advertencia' : 'exito'}
        />
        <KpiCard
          titulo="Fail2ban"
          valor={cargandoPrometheus ? '…' : fail2banActivo ? 'Activo' : 'Inactivo'}
          icono={<ShieldCheck className="h-6 w-6" />}
          variante={fail2banActivo ? 'exito' : 'peligro'}
        />
        <KpiCard
          titulo="Último TPW (análisis)"
          valor={cargandoTpw ? '…' : formatearTiempo(ultimoTpw)}
          icono={<Timer className="h-6 w-6" />}
        />
      </section>

      {/* ——— Errores parciales ——— */}
      {hayError && !cargandoInicial && (
        <div className="rounded-lg border border-peligro/30 bg-peligro/10 p-4 text-sm text-peligro">
          {errorContenedores && <p>Error al cargar contenedores: {errorContenedores}</p>}
          {errorPrometheus && <p>Error al cargar métricas Prometheus: {errorPrometheus}</p>}
          {errorAlertas && <p>Error al cargar alertas recientes: {errorAlertas}</p>}
          {errorTpw && <p>Error al cargar métricas TPW: {errorTpw}</p>}
        </div>
      )}

      {/* ——— Grid de contenedores ——— */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-100">Estado de contenedores</h2>
        {cargandoContenedores && !contenedores ? (
          <div className="flex items-center gap-2 text-slate-400">
            <Spinner tamano={16} />
            <span className="text-sm">Cargando contenedores…</span>
          </div>
        ) : contenedores && contenedores.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {contenedores.map((c) => (
              <Card key={c.nombre} className="flex items-center justify-between">
                <span className="truncate text-sm font-medium text-slate-200">{c.nombre}</span>
                <Badge variante={c.estado === 'running' ? 'exito' : 'peligro'}>
                  {c.estado === 'running' ? 'Activo' : 'Detenido'}
                </Badge>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">No hay contenedores registrados.</p>
        )}
      </section>

      {/* ——— Tabla de alertas recientes ——— */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-100">Últimas alertas</h2>
        {cargandoAlertas && !alertasRespuesta ? (
          <div className="flex items-center gap-2 text-slate-400">
            <Spinner tamano={16} />
            <span className="text-sm">Cargando alertas…</span>
          </div>
        ) : alertas.length > 0 ? (
          <Card className="overflow-x-auto p-0">
            <table className="w-full text-left text-base">
              <thead>
                <tr className="border-b border-borde text-sm text-slate-400">
                  <th className="px-4 py-3.5">Fecha</th>
                  <th className="px-4 py-3.5">Severidad</th>
                  <th className="px-4 py-3.5">Categoría</th>
                  <th className="px-4 py-3.5">IP origen</th>
                  <th className="px-4 py-3.5">Nivel de riesgo</th>
                  <th className="px-4 py-3.5">Reputación</th>
                  <th className="px-4 py-3.5">Descripción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borde">
                {alertas.map((a) => (
                  <tr key={a.id} className="text-slate-200 hover:bg-borde/20">
                    <td className="whitespace-nowrap px-4 py-3">
                      {formatearTimestamp(a.timestamp)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variante={varianteSeveridad(a.severity)}>{a.severity}</Badge>
                    </td>
                    <td className="px-4 py-3">{a.category}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-sm">
                      {a.source_ip ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variante={varianteRiskLevel(a.risk_level)}>
                        {a.risk_level ?? '—'}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      {a.threat_reputation ?? '—'}
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-sm" title={a.description ?? undefined}>
                      {a.description ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        ) : (
          <p className="text-sm text-slate-400">No hay alertas recientes.</p>
        )}
      </section>

      {/* ——— Métricas TPW ——— */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-100">
          Métricas TPW (workflow de análisis)
        </h2>
        {cargandoTpw && !tpw ? (
          <div className="flex items-center gap-2 text-slate-400">
            <Spinner tamano={16} />
            <span className="text-sm">Cargando métricas TPW…</span>
          </div>
        ) : tpw ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card className="flex items-center gap-4">
              <Activity className="h-8 w-8 text-primario" />
              <div>
                <p className="text-xs text-slate-400">Último tiempo</p>
                <p className="text-lg font-bold text-slate-100">
                  {formatearTiempo(tpw.valor_actual)}
                </p>
              </div>
            </Card>
            <Card className="flex items-center gap-4">
              <Activity className="h-8 w-8 text-primario" />
              <div>
                <p className="text-xs text-slate-400">Promedio</p>
                <p className="text-lg font-bold text-slate-100">
                  {formatearTiempo(tpw.promedio)}
                </p>
              </div>
            </Card>
          </div>
        ) : (
          <p className="text-sm text-slate-400">No hay métricas TPW disponibles.</p>
        )}
      </section>
    </div>
  )
}
