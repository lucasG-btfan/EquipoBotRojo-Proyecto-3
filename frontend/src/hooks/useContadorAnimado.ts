import { useEffect, useRef, useState } from 'react'

interface OpcionesContador {
  duracionMs?: number
  decimales?: number
}

interface ResultadoContador {
  valor: number
  referencia: React.RefObject<HTMLDivElement>
}

/**
 * Anima un número de 0 a `valorFinal` una sola vez, cuando el elemento
 * referenciado entra en el viewport (IntersectionObserver + rAF). Usado por
 * las métricas destacadas de LandingPage.
 */
export function useContadorAnimado(valorFinal: number, opciones?: OpcionesContador): ResultadoContador {
  const { duracionMs = 1200, decimales = 0 } = opciones ?? {}
  const [valor, setValor] = useState(0)
  const referencia = useRef<HTMLDivElement>(null)
  const yaAnimadoRef = useRef(false)

  useEffect(() => {
    const elemento = referencia.current
    if (!elemento) return

    const factor = 10 ** decimales

    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (!entrada.isIntersecting || yaAnimadoRef.current) return
        yaAnimadoRef.current = true

        const inicio = performance.now()
        function tick(ahora: number) {
          const progreso = Math.min((ahora - inicio) / duracionMs, 1)
          setValor(Math.round(progreso * valorFinal * factor) / factor)
          if (progreso < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      },
      { threshold: 0.4 },
    )

    observador.observe(elemento)
    return () => observador.disconnect()
  }, [valorFinal, duracionMs, decimales])

  return { valor, referencia }
}
