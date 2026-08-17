/**
 * Stub visual de la página de login. La lógica real (formulario validado,
 * llamada a `POST /api/auth/login`, manejo de errores) se implementa en
 * CH03 (auth-frontend) sin cambiar la ruta pública `/login`.
 */
export function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-fondo px-4">
      <div className="w-full max-w-sm rounded-lg border border-borde bg-superficie p-8 text-center">
        <h1 className="text-xl font-semibold text-slate-100">Panel SIEM</h1>
        <p className="mt-2 text-sm text-slate-400">
          El formulario de acceso se implementa en un change posterior (CH03).
        </p>
      </div>
    </div>
  )
}
