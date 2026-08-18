import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

/** Pantalla de acceso al dashboard: formulario de usuario y contraseña. */
export function LoginPage() {
  const { estaAutenticado, cargando, iniciarSesion } = useAuth()
  const [usuario, setUsuario] = useState('')
  const [contraseña, setContraseña] = useState('')
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
    <div className="flex min-h-screen items-center justify-center bg-fondo px-4">
      <div className="w-full max-w-sm rounded-lg border border-borde bg-superficie p-8">
        <h1 className="text-center text-xl font-semibold text-slate-100">Panel SIEM</h1>
        <p className="mt-2 text-center text-sm text-slate-400">
          Ingresá tus credenciales para acceder al panel.
        </p>

        <form onSubmit={manejarEnvio} className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="usuario" className="text-sm text-slate-300">
              Usuario
            </label>
            <input
              id="usuario"
              type="text"
              autoComplete="username"
              value={usuario}
              onChange={(evento) => setUsuario(evento.target.value)}
              className="rounded-md border border-borde bg-fondo px-3 py-2 text-sm text-slate-100 outline-none focus:border-primario"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="contraseña" className="text-sm text-slate-300">
              Contraseña
            </label>
            <input
              id="contraseña"
              type="password"
              autoComplete="current-password"
              value={contraseña}
              onChange={(evento) => setContraseña(evento.target.value)}
              className="rounded-md border border-borde bg-fondo px-3 py-2 text-sm text-slate-100 outline-none focus:border-primario"
            />
          </div>

          {error && <p className="text-sm text-peligro">{error}</p>}

          <button
            type="submit"
            disabled={cargando}
            className="mt-2 rounded-md bg-primario px-3 py-2 text-sm font-medium text-slate-100 transition-colors hover:bg-primario/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cargando ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}
