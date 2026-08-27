import { Link, Navigate } from 'react-router-dom'
import { Search, Zap, BarChart3, ArrowRight, type LucideIcon } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { MetricaAnimada } from '../components/landing/MetricaAnimada'
import { CapacidadCard } from '../components/landing/CapacidadCard'
import { Card } from '../components/common/Card'

interface Capacidad {
  Icono: LucideIcon
  titulo: string
  descripcion: string
}

const CAPACIDADES: Capacidad[] = [
  {
    Icono: Search,
    titulo: 'Centralización y análisis',
    descripcion:
      'Syslog-ng recolecta eventos de múltiples fuentes. n8n los analiza contra 8 reglas de detección, calcula un risk score y enriquece cada alerta con inteligencia geográfica y reputación histórica de la IP.',
  },
  {
    Icono: Zap,
    titulo: 'Respuesta automatizada',
    descripcion:
      'Las amenazas confirmadas activan bloqueos automáticos vía Fail2ban, generan tickets formales y notifican al equipo por correo y Telegram — todo sin intervención manual.',
  },
  {
    Icono: BarChart3,
    titulo: 'Monitoreo continuo',
    descripcion:
      'Elasticsearch, Kibana, Wazuh y Prometheus proveen visibilidad en tiempo real sobre el estado del sistema, las IPs bloqueadas y el rendimiento del pipeline de detección.',
  },
]

// Botón CTA compartido por navbar, hero y cierre: grande, con glow en el
// color primario que se intensifica al hover (pedido: "brillante, con luz").
const ESTILO_BOTON_PRIMARIO =
  'inline-flex items-center gap-2 rounded-md bg-primario px-7 py-3.5 text-base font-semibold text-slate-100 shadow-[0_0_25px_-5px_theme(colors.primario/70%)] transition-all hover:-translate-y-0.5 hover:bg-primario/90 hover:shadow-[0_0_40px_-5px_theme(colors.primario/90%)]'

const STACK = [
  'Syslog-ng',
  'n8n',
  'Wazuh',
  'Elasticsearch',
  'Kibana',
  'Logstash',
  'Fail2ban',
  'Prometheus',
  'Alertmanager',
  'PostgreSQL',
]

/**
 * Página pública de presentación, previa al login (design.md pendiente:
 * mejora post-roadmap). Si ya hay sesión activa se salta directo al panel,
 * igual que LoginPage con una sesión existente.
 */
export function LandingPage() {
  const { estaAutenticado } = useAuth()

  if (estaAutenticado) {
    return <Navigate to="/dashboard/inicio" replace />
  }

  return (
    <div className="bg-fondo text-slate-100">
      {/* ——— Barra superior: botón de login visible y notorio ——— */}
      <header className="sticky top-0 z-20 border-b border-borde/60 bg-fondo/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 lg:px-8">
          <span className="text-xl font-bold tracking-wide text-slate-100 lg:text-2xl">
            EquipoBotRojo SIEM/SOAR
          </span>
          <Link to="/login" className={ESTILO_BOTON_PRIMARIO}>
            Iniciar sesión
          </Link>
        </div>
      </header>

      {/* ——— Sección 1: Hero ——— */}
      <section className="relative flex min-h-[calc(100vh-65px)] items-center overflow-hidden px-6 lg:px-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,theme(colors.primario/25%),transparent_55%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(theme(colors.borde/50%)_1px,transparent_1px),linear-gradient(90deg,theme(colors.borde/50%)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
        </div>

        <div className="relative mx-auto max-w-4xl text-center">
          <h1 className="animate-fade-in-up bg-gradient-to-br from-slate-100 to-slate-400 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent opacity-0 lg:text-7xl">
            EquipoBotRojo SIEM/SOAR
          </h1>
          <p
            className="animate-fade-in-up mt-6 text-2xl font-semibold text-primario opacity-0 [animation-delay:150ms] lg:text-3xl"
          >
            Detección inteligente de amenazas. Respuesta automatizada. Control total.
          </p>
          <p
            className="animate-fade-in-up mx-auto mt-6 max-w-2xl text-xl leading-relaxed text-slate-200 opacity-0 [animation-delay:300ms]"
          >
            Plataforma de seguridad de código abierto que centraliza, analiza y responde ante incidentes en
            tiempo real — sin intervención manual.
          </p>
          <Link
            to="/login"
            className={`animate-fade-in-up mt-10 opacity-0 [animation-delay:450ms] ${ESTILO_BOTON_PRIMARIO}`}
          >
            Iniciar sesión
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* ——— Sección 2: El problema que resolvemos ——— */}
      <section className="border-t border-borde/60 px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-3xl font-bold lg:text-4xl">
            Los ataques no esperan. Tu respuesta tampoco debería.
          </h2>

          <div className="relative mt-8 overflow-hidden rounded-lg">
            {/* Barrido de luz horizontal sobre el borde superior — el sello
                visual propio de esta card, distinto del anillo rotante de
                las 3 capacidades de abajo. */}
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-10 h-1 overflow-hidden">
              <div className="h-full w-1/2 animate-shimmer bg-gradient-to-r from-transparent via-primario to-transparent shadow-[0_0_16px_3px_theme(colors.primario/90%)]" />
            </div>

            <Card className="!border-l-4 !border-l-primario">
              <p className="text-left text-xl leading-relaxed text-slate-200">
                En infraestructuras modernas, los eventos de seguridad se generan en cientos de fuentes
                simultáneas: servidores, firewalls, aplicaciones, agentes de host. Sin una plataforma
                centralizada, detectar una amenaza real entre miles de registros es lento, costoso y
                propenso al error humano.
              </p>
              <p className="mt-4 text-left text-xl leading-relaxed text-slate-200">
                EquipoBotRojo transforma ese caos en inteligencia accionable: cada log es analizado,
                clasificado y correlacionado automáticamente. Cuando se detecta una amenaza real, el sistema
                responde en segundos — bloqueando IPs, generando tickets y notificando al equipo — mientras
                el analista mantiene visibilidad total desde un único panel.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* ——— Sección 3: Qué hace el sistema ——— */}
      <section className="border-t border-borde/60 bg-superficie/40 px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {CAPACIDADES.map((capacidad) => (
              <CapacidadCard key={capacidad.titulo} {...capacidad} />
            ))}
          </div>
        </div>
      </section>

      {/* ——— Sección 4: Stack tecnológico ——— */}
      <section className="border-t border-borde/60 px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold lg:text-4xl">Construido sobre herramientas de clase empresarial</h2>
          <p className="mx-auto mt-4 max-w-2xl text-xl leading-relaxed text-slate-200">
            Cada componente fue seleccionado por su madurez, adopción en la industria y capacidad de
            integración en arquitecturas reales de seguridad.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {STACK.map((tecnologia) => (
              <span
                key={tecnologia}
                className="rounded-full border border-borde px-5 py-2.5 text-base text-slate-200"
              >
                {tecnologia}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ——— Sección 5: Métricas destacadas ——— */}
      <section className="border-t border-borde/60 bg-superficie/40 px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold lg:text-4xl">Rendimiento validado en entorno de laboratorio</h2>

          <div className="mt-12 grid grid-cols-1 gap-10 sm:grid-cols-3">
            <MetricaAnimada valorFinal={1.081} decimales={3} sufijo=" s" etiqueta="Tiempo de respuesta promedio (TPW)" />
            <MetricaAnimada valorFinal={100} sufijo="%" etiqueta="Tasa de detección" />
            <MetricaAnimada valorFinal={0} sufijo="%" etiqueta="Falsos positivos" />
          </div>

          <p className="mx-auto mt-8 max-w-2xl text-sm text-slate-400">
            Validado sobre un corpus de 47 eventos distribuidos en 8 categorías de amenaza, incluyendo SSH
            brute force, port scanning, root login attempts e iptables DROP.
          </p>
        </div>
      </section>

      {/* ——— Sección 6: CTA final ——— */}
      <section className="border-t border-borde/60 px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold lg:text-4xl">Listo para operar</h2>
          <p className="mt-4 text-xl leading-relaxed text-slate-200">
            El panel de control integra todas las capacidades del sistema en una interfaz unificada.
            Monitoreo en tiempo real, gestión de IPs, tickets, alertas de Prometheus y ejecución de
            workflows — desde un único lugar.
          </p>
          <Link to="/login" className={`mt-10 ${ESTILO_BOTON_PRIMARIO}`}>
            Ingresar al panel
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  )
}
