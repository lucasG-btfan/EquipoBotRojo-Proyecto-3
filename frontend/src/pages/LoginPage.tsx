import { useState, type FormEvent } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { Eye, EyeOff, ShieldCheck, ArrowLeft } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

/** Pantalla de acceso al dashboard: formulario de usuario y contraseña. */
export function LoginPage() {
  const { estaAutenticado, cargando, iniciarSesion } = useAuth()
  const [usuario, setUsuario] = useState('')
  const [contraseña, setContraseña] = useState('')
  const [mostrarContraseña, setMostrarContraseña] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cubre tanto el post-login exitoso como la visita a /login con una
  // sesión ya activa: en ambos casos no se muestra el formulario
  // (ver design.md D7).
  if (estaAutenticado) {
    return <Navigate to="/dashboard/inicio" replace />
  }

  async function manejarEnvio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setError(null)

    if (usuario.trim() === '' || contraseña === '') {
      setError('Usuario y contraseña son obligatorios.')
      return
    }

    try {
      await iniciarSesion(usuario.trim(), contraseña)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error inesperado al iniciar sesión')
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-fondo px-4 py-10">
      {/* Mismo fondo del hero de LandingPage: glow radial + grilla sutil. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,theme(colors.primario/25%),transparent_55%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(theme(colors.borde/50%)_1px,transparent_1px),linear-gradient(90deg,theme(colors.borde/50%)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      </div>

      {/* Recuadro con borde animado y brillante, mismo efecto que CapacidadCard
          de la landing (anillo cónico rotando detrás de una capa interior). */}
      <div className="group relative w-full max-w-md overflow-hidden rounded-2xl p-[3px] shadow-[0_0_35px_-8px_theme(colors.primario/70%)]">
        <div
          aria-hidden
          className="absolute inset-[-150%] animate-spin-slow bg-[conic-gradient(from_0deg,transparent_0%,theme(colors.primario)_10%,white_16%,theme(colors.primario)_22%,transparent_32%)] opacity-90"
        />

        <div className="relative rounded-2xl bg-superficie p-10 max-lg:p-7">
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primario/15 text-primario">
              <ShieldCheck className="h-9 w-9" />
            </div>
            <h1 className="text-center text-3xl font-bold text-slate-100 max-lg:text-2xl">Panel SIEM</h1>
            <p className="text-center text-base text-slate-400">
              Ingresá tus credenciales para acceder al panel.
            </p>
          </div>

          <form onSubmit={manejarEnvio} className="mt-8 flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="usuario" className="text-sm font-medium text-slate-300">
                Usuario
              </label>
              <input
                id="usuario"
                type="text"
                autoComplete="username"
                value={usuario}
                onChange={(evento) => setUsuario(evento.target.value)}
                className="rounded-lg border border-borde bg-fondo px-4 py-3 text-base text-slate-100 outline-none focus:border-primario"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="contraseña" className="text-sm font-medium text-slate-300">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="contraseña"
                  type={mostrarContraseña ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={contraseña}
                  onChange={(evento) => setContraseña(evento.target.value)}
                  className="w-full rounded-lg border border-borde bg-fondo px-4 py-3 pr-11 text-base text-slate-100 outline-none focus:border-primario"
                />
                <button
                  type="button"
                  onClick={() => setMostrarContraseña((actual) => !actual)}
                  aria-label={mostrarContraseña ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-200"
                >
                  {mostrarContraseña ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {error && <p className="text-sm text-peligro">{error}</p>}

            <button
              type="submit"
              disabled={cargando}
              className="mt-2 rounded-lg bg-primario px-4 py-3 text-base font-medium text-slate-100 transition-colors hover:bg-primario/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cargando ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          <Link
            to="/"
            className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-400 transition-colors hover:text-slate-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a la página de inicio
          </Link>
        </div>
      </div>
    </div>
  )
}
