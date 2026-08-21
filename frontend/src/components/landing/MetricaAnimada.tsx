import { useContadorAnimado } from '../../hooks/useContadorAnimado'

interface MetricaAnimadaProps {
  valorFinal: number
  etiqueta: string
  sufijo?: string
  decimales?: number
}

/** Número grande que cuenta desde 0 hasta `valorFinal` al entrar en viewport. */
export function MetricaAnimada({ valorFinal, etiqueta, sufijo = '', decimales = 0 }: MetricaAnimadaProps) {
  const { valor, referencia } = useContadorAnimado(valorFinal, { decimales })

  const formateado = valor.toLocaleString('es-AR', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  })

  return (
    <div ref={referencia} className="flex flex-col items-center gap-2 text-center">
      <span className="text-5xl font-bold text-primario lg:text-6xl">
        {formateado}
        {sufijo}
      </span>
      <span className="text-base text-slate-300">{etiqueta}</span>
    </div>
  )
}
