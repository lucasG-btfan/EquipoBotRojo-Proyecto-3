import {
  Home,
  LayoutDashboard,
  FileSearch,
  Shield,
  Ticket,
  Lock,
  Flame,
  BarChart3,
  LogOut,
} from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

interface SeccionNav {
  etiqueta: string
  ruta: string
  Icono: typeof Home
}

// Las 8 secciones canónicas del dashboard (AGENTS.md). "Dashboard" vive en
// /dashboard/panel para no colisionar con /dashboard, el prefijo del área
// protegida (ver design.md D7). Exportado también para BarraNavegacion.
export const SECCIONES: SeccionNav[] = [
  { etiqueta: 'Inicio', ruta: '/dashboard/inicio', Icono: Home },
  { etiqueta: 'Dashboard', ruta: '/dashboard/panel', Icono: LayoutDashboard },
  { etiqueta: 'Logs y detección', ruta: '/dashboard/logs', Icono: FileSearch },
  { etiqueta: 'Gestión de IPs', ruta: '/dashboard/ips', Icono: Shield },
  { etiqueta: 'Tickets', ruta: '/dashboard/tickets', Icono: Ticket },
  { etiqueta: 'Fail2ban', ruta: '/dashboard/fail2ban', Icono: Lock },
  { etiqueta: 'Prometheus', ruta: '/dashboard/prometheus', Icono: Flame },
  { etiqueta: 'Estadísticas', ruta: '/dashboard/estadisticas', Icono: BarChart3 },
]

export function Sidebar() {
  const { cerrarSesion } = useAuth()
  const navigate = useNavigate()

  function manejarCerrarSesion() {
    cerrarSesion()
    navigate('/login', { replace: true })
  }

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-borde bg-superficie max-lg:hidden">
      <div className="border-b border-borde px-6 py-5">
        <h1 className="text-xl font-bold text-slate-100">Panel SIEM</h1>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="flex flex-col gap-1">
          {SECCIONES.map(({ etiqueta, ruta, Icono }) => (
            <li key={ruta}>
              <NavLink
                to={ruta}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? 'bg-primario/15 text-primario'
                      : 'text-slate-300 hover:bg-fondo hover:text-slate-100'
                  }`
                }
              >
                <Icono size={18} />
                {etiqueta}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-borde p-3">
        <button
          type="button"
          onClick={manejarCerrarSesion}
          className="flex w-full items-center gap-3 rounded-lg border border-peligro/30 bg-peligro/10 px-4 py-3 text-base font-medium text-peligro transition-colors hover:bg-peligro/20"
        >
          <LogOut size={20} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
