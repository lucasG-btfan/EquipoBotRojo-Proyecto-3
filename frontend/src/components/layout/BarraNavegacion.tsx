import { LogOut } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { SECCIONES } from './Sidebar'

/**
 * Barra de navegación superior exclusiva de móvil (< lg): los mismos items
 * de la sidebar en una fila con scroll horizontal, de modo que todos quedan
 * accesibles sin menú hamburguesa. En escritorio no se renderiza (lg:hidden)
 * y convive con la sidebar, que ahí toma el relevo (max-lg:hidden).
 */
export function BarraNavegacion() {
  const { cerrarSesion } = useAuth()
  const navigate = useNavigate()

  function manejarCerrarSesion() {
    cerrarSesion()
    navigate('/login', { replace: true })
  }

  return (
    <header className="sticky top-0 z-10 border-b border-borde bg-superficie lg:hidden">
      <div className="px-4 pt-3">
        <h1 className="text-sm font-semibold text-slate-100">Panel SIEM</h1>
      </div>

      {/* w-max evita que la fila se comprima: el desborde se resuelve con scroll */}
      <nav className="mt-2 overflow-x-auto">
        <ul className="flex w-max items-center gap-1 px-2 pb-2">
          {SECCIONES.map(({ etiqueta, ruta, Icono }) => (
            <li key={ruta}>
              <NavLink
                to={ruta}
                className={({ isActive }) =>
                  `flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? 'bg-primario/15 text-primario'
                      : 'text-slate-300 hover:bg-fondo hover:text-slate-100'
                  }`
                }
              >
                <Icono size={16} />
                {etiqueta}
              </NavLink>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={manejarCerrarSesion}
              className="flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-peligro/15 hover:text-peligro"
            >
              <LogOut size={16} />
              Cerrar sesión
            </button>
          </li>
        </ul>
      </nav>
    </header>
  )
}
