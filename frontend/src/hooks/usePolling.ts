import { useCallback, useEffect, useRef, useState } from 'react'

interface OpcionesPolling {
  /** Si es `false`, el hook no arranca el polling. Por defecto `true`. */
  habilitado?: boolean
}

interface ResultadoPolling<T> {
  datos: T | null
  cargando: boolean
  error: string | null
  refrescar: () => Promise<void>
}

/**
 * Hook genérico de polling: ejecuta `peticion` una vez al montar y luego
 * cada `intervaloMs`. Reemplaza a `setInterval` manual en cada componente
 * (ver design.md D3) y es el único mecanismo de "tiempo real" permitido
 * (regla dura: nada de WebSockets ni SSE).
 */
export function usePolling<T>(
  peticion: () => Promise<T>,
  intervaloMs: number,
  opciones?: OpcionesPolling,
): ResultadoPolling<T> {
  const habilitado = opciones?.habilitado ?? true

  const [datos, setDatos] = useState<T | null>(null)
  const [cargando, setCargando] = useState<boolean>(habilitado)
  const [error, setError] = useState<string | null>(null)

  // Se guarda la función en un ref actualizado en cada render para que una
  // función inline (recreada en cada render del consumidor) no reinicie el
  // intervalo cada vez.
  const peticionRef = useRef(peticion)
  peticionRef.current = peticion

  // Evita setear estado si el componente ya se desmontó (respuesta tardía).
  const montadoRef = useRef(true)

  // true solo en la carga inicial: los refrescos periódicos no deben
  // hacer parpadear la UI con el estado de carga.
  const primeraCargaRef = useRef(true)

  const ejecutar = useCallback(async () => {
    try {
      if (primeraCargaRef.current) {
        setCargando(true)
      }
      const resultado = await peticionRef.current()
      if (montadoRef.current) {
        setDatos(resultado)
        setError(null)
      }
    } catch (err) {
      if (montadoRef.current) {
        setError(err instanceof Error ? err.message : 'Error de conexión con el servidor')
      }
    } finally {
      primeraCargaRef.current = false
      if (montadoRef.current) {
        setCargando(false)
      }
    }
  }, [])

  useEffect(() => {
    montadoRef.current = true

    if (!habilitado) {
      return
    }

    void ejecutar()
    const idIntervalo = setInterval(() => {
      void ejecutar()
    }, intervaloMs)

    return () => {
      montadoRef.current = false
      clearInterval(idIntervalo)
    }
  }, [habilitado, intervaloMs, ejecutar])

  return { datos, cargando, error, refrescar: ejecutar }
}
