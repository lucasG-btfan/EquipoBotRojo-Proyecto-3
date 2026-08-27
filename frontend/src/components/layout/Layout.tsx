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
    <div className="relative flex min-h-screen bg-fondo max-lg:flex-col lg:h-screen lg:overflow-hidden">
      {/* Mismo fondo del hero de LandingPage: glow radial + grilla sutil. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,theme(colors.primario/25%),transparent_55%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(theme(colors.borde/50%)_1px,transparent_1px),linear-gradient(90deg,theme(colors.borde/50%)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      </div>

      <BarraNavegacion />
      <Sidebar />
      <main className="relative z-10 flex-1 overflow-y-auto p-6 max-lg:p-4">
        <Outlet />
      </main>
    </div>
  )
}
