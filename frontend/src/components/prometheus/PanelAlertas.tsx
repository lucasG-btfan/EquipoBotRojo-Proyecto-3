import { useCallback, useRef } from 'react'
import { RefreshCw } from 'lucide-react'
import { usePolling } from '../../hooks/usePolling'
import { INTERVALOS_POLLING } from '../../constants/polling'
import { obtenerAlertasPrometheus } from '../../services/prometheusService'
import type { AlertaPrometheus, RespuestaAlertasPrometheus } from '../../types/prometheus'
import { Card } from '../common/Card'
import { Badge } from '../common/Badge'
import { Spinner } from '../common/Spinner'
import { TarjetaAlerta } from './TarjetaAlerta'

// Orden fijo de la spec, independiente del orden que devuelva el backend
// (design.md D6). Cualquier alerta fuera de esta lista se agrega al final.
const ALERTAS_ESPERADAS = ['IpBaneadaDetectada', 'Fail2banCaido', 'AtaqueMasivo'] as const

function ordenarAlertas(alertas: AlertaPrometheus[]): AlertaPrometheus[] {
  const porNombre = new Map(alertas.map((alerta) => [alerta.nombre, alerta]))
  const ordenadas: AlertaPrometheus[] = []

  for (const nombreEsperado of ALERTAS_ESPERADAS) {
    const alerta = porNombre.get(nombreEsperado)
    if (alerta) {
      ordenadas.push(alerta)
      porNombre.delete(nombreEsperado)
    }
  }

  // Alertas desconocidas: se muestran igual, después de las 3 esperadas.
  ordenadas.push(...porNombre.values())

  return ordenadas
}

// Mapeo alerta → métrica asociada (design.md D3). No se inventa ningún
// valor: solo se traduce lo que ya entrega el bloque `fail2ban`.
function resolverValorActual(alerta: AlertaPrometheus, fail2ban: RespuestaAlertasPrometheus['fail2ban']): string {
  if (alerta.nombre === 'IpBaneadaDetectada') {
    return fail2ban.banned_ips === null ? '—' : `${fail2ban.banned_ips} IPs baneadas`
  }

  if (alerta.nombre === 'Fail2banCaido') {
    if (fail2ban.up === null) {
      return '—'
    }
    return fail2ban.up === 1 ? 'Fail2ban activo' : 'Fail2ban caído'
  }

  if (alerta.nombre === 'AtaqueMasivo') {
    return alerta.estado === 'firing'
      ? 'Ataque masivo en curso (10 o más IPs baneadas)'
      : 'Sin ataque masivo detectado'
  }

  return 'Sin métrica asociada'
}

// Clave de sessionStorage para que el "tiempo activo (observado)" sobreviva
// a un refresh de la pestaña (se pierde igual si se cierra, por diseño:
// sigue siendo una medición del cliente, no el timestamp real del backend).
const INICIO_FIRING_STORAGE_KEY = 'prometheus_inicio_firing'

function leerInicioFiringGuardado(): Record<string, number> {
  try {
    const crudo = sessionStorage.getItem(INICIO_FIRING_STORAGE_KEY)
    return crudo ? (JSON.parse(crudo) as Record<string, number>) : {}
  } catch {
    return {}
  }
}

function guardarInicioFiring(registro: Record<string, number>): void {
  try {
    sessionStorage.setItem(INICIO_FIRING_STORAGE_KEY, JSON.stringify(registro))
  } catch {
    // sessionStorage no disponible (ej. modo privado): el timer sigue
    // funcionando en memoria, solo no sobrevive a un refresh.
  }
}

function formatearTiempoActivo(inicioMs: number): string {
  const segundosTotales = Math.max(0, Math.floor((Date.now() - inicioMs) / 1000))
  const minutos = Math.floor(segundosTotales / 60)
  const segundos = segundosTotales % 60

  if (minutos === 0) {
    return `${segundos}s`
  }
  return `${minutos}m ${segundos}s`
}

function formatearUltimaActualizacion(iso: string | null): string {
  if (!iso) {
    return '—'
  }
  return new Date(iso).toLocaleString('es-AR')
}

/**
 * Componente contenedor de la sección "Prometheus": hace el polling,
 * calcula el tiempo observado en FIRING por alerta y resuelve la métrica
 * asociada de cada tarjeta (design.md D1, D3, D4).
 */
export function PanelAlertas() {
  const peticion = useCallback(() => obtenerAlertasPrometheus(), [])

  const { datos, cargando, error, refrescar } = usePolling(peticion, INTERVALOS_POLLING.PROMETHEUS)

  // Momento (Date.now()) en que cada alerta fue observada por primera vez
  // en `firing`. Se borra la entrada cuando deja de estarlo, de forma que
  // un re-disparo cuenta desde cero (design.md D4). useRef porque no debe
  // disparar re-render por sí mismo: el ciclo de polling ya lo hace.
  const inicioFiringRef = useRef<Record<string, number>>(leerInicioFiringGuardado())

  if (cargando && !datos) {
    return (
      <Card className="flex items-center justify-center py-12">
        <Spinner tamano={24} />
        <span className="ml-3 text-sm text-slate-300">Consultando estado de las alertas...</span>
      </Card>
    )
  }

  if (error && !datos) {
    return (
      <Card className="border-peligro/30">
        <div className="flex items-center gap-3">
          <Badge variante="peligro">Error</Badge>
          <span className="text-sm text-slate-300">{error}</span>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Prometheus no está disponible o no respondió a tiempo.
        </p>
        <button
          type="button"
          onClick={() => void refrescar()}
          className="mt-3 flex items-center gap-2 rounded-md border border-borde px-3 py-1.5 text-sm text-slate-200 transition-colors hover:bg-borde/30 max-lg:py-2"
        >
          <RefreshCw size={14} />
          Reintentar
        </button>
      </Card>
    )
  }

  const alertas = datos ? ordenarAlertas(datos.alertas) : []
  const nombresVistos = new Set(alertas.map((alerta) => alerta.nombre))

  // Registro/borrado del instante de disparo observado (design.md D4).
  for (const alerta of alertas) {
    if (alerta.estado === 'firing') {
      if (!(alerta.nombre in inicioFiringRef.current)) {
        inicioFiringRef.current[alerta.nombre] = Date.now()
      }
    } else {
      delete inicioFiringRef.current[alerta.nombre]
    }
  }
  // Limpia entradas de alertas que dejaron de aparecer en la respuesta.
  for (const nombreRegistrado of Object.keys(inicioFiringRef.current)) {
    if (!nombresVistos.has(nombreRegistrado)) {
      delete inicioFiringRef.current[nombreRegistrado]
    }
  }
  if (datos) {
    guardarInicioFiring(inicioFiringRef.current)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between max-lg:flex-wrap max-lg:gap-2">
        <p className="text-xs text-slate-400">
          Última actualización: {formatearUltimaActualizacion(datos?.ultima_actualizacion ?? null)}
        </p>
        <button
          type="button"
          onClick={() => void refrescar()}
          disabled={cargando}
          className="flex items-center gap-2 rounded-md border border-borde px-3 py-1.5 text-sm text-slate-200 transition-colors hover:bg-borde/30 disabled:cursor-not-allowed disabled:opacity-50 max-lg:py-2"
        >
          <RefreshCw size={14} className={cargando ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {error && (
        <p className="text-xs text-advertencia">
          Última consulta falló, mostrando el último estado conocido: {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {alertas.map((alerta) => {
          const inicioFiring = inicioFiringRef.current[alerta.nombre]
          return (
            <TarjetaAlerta
              key={alerta.nombre}
              nombre={alerta.nombre}
              descripcion={alerta.descripcion}
              estado={alerta.estado}
              valorActual={datos ? resolverValorActual(alerta, datos.fail2ban) : '—'}
              tiempoActivo={
                alerta.estado === 'firing' && inicioFiring !== undefined
                  ? formatearTiempoActivo(inicioFiring)
                  : null
              }
            />
          )
        })}
      </div>
    </div>
  )
}
