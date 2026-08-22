import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { BarraNavegacion } from './BarraNavegacion'

/**
 * Shell del área protegida: sidebar fija a la izquierda + contenido de la
 * ruta activa. Al vivir en un layout con rutas anidadas (`<Outlet />`), la
 * sidebar no se desmonta al navegar entre secciones (ver design.md D7).
 * En móvil (< lg) la sidebar se oculta y la navegación pasa a la barra
 * superior (`BarraNavegacion`); el eje pasa a columna vía max-lg:flex-col.
 */
export function Layout() {
  return (
    <div className="flex min-h-screen bg-fondo max-lg:flex-col lg:h-screen lg:overflow-hidden">
      <BarraNavegacion />
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6 max-lg:p-4">
        <Outlet />
      </main>
    </div>
  )
}
