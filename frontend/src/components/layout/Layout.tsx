import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'

/**
 * Shell del área protegida: sidebar fija a la izquierda + contenido de la
 * ruta activa. Al vivir en un layout con rutas anidadas (`<Outlet />`), la
 * sidebar no se desmonta al navegar entre secciones (ver design.md D7).
 */
export function Layout() {
  return (
    <div className="flex min-h-screen bg-fondo">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  )
}
