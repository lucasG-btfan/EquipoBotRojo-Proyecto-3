import type { ReactNode } from 'react'
import type { RespuestaPaginada } from '../../types/comun'
import { Spinner } from './Spinner'

export interface ColumnaTabla<T> {
  clave: keyof T
  encabezado: string
  /** Si no se define, se renderiza `String(fila[clave])`. */
  render?: (fila: T) => ReactNode
}

interface TablaProps<T> {
  columnas: ColumnaTabla<T>[]
  /** `null` mientras no llegó la primera respuesta del backend. */
  respuesta: RespuestaPaginada<T> | null
  cargando: boolean
  /** Identificador único de fila, para la `key` de React. */
  claveFila: (fila: T) => string | number
  onCambiarOffset: (offset: number) => void
}

/** Tabla genérica con paginación offset/limit, según `RespuestaPaginada<T>`. */
export function Tabla<T>({
  columnas,
  respuesta,
  cargando,
  claveFila,
  onCambiarOffset,
}: TablaProps<T>) {
  const items = respuesta?.items ?? []
  const total = respuesta?.total ?? 0
  const limit = respuesta?.limit ?? 0
  const offset = respuesta?.offset ?? 0

  const desde = total === 0 ? 0 : offset + 1
  const hasta = Math.min(offset + limit, total)
  const hayAnterior = offset > 0
  const haySiguiente = offset + limit < total

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-lg border border-borde">
        <table className="w-full text-left text-sm">
          <thead className="bg-fondo text-slate-400">
            <tr>
              {columnas.map((columna) => (
                <th key={String(columna.clave)} className="px-4 py-2 font-medium max-lg:px-3">
                  {columna.encabezado}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-borde">
            {cargando && (
              <tr>
                <td colSpan={columnas.length} className="px-4 py-6 text-center">
                  <Spinner className="mx-auto" />
                </td>
              </tr>
            )}

            {!cargando && items.length === 0 && (
              <tr>
                <td colSpan={columnas.length} className="px-4 py-6 text-center text-slate-500">
                  Sin datos para mostrar
                </td>
              </tr>
            )}

            {!cargando &&
              items.map((fila) => (
                <tr key={claveFila(fila)} className="text-slate-200">
                  {columnas.map((columna) => (
                    <td key={String(columna.clave)} className="px-4 py-2 max-lg:px-3">
                      {columna.render ? columna.render(fila) : String(fila[columna.clave] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>
          Mostrando {desde}–{hasta} de {total}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={!hayAnterior}
            onClick={() => onCambiarOffset(Math.max(offset - limit, 0))}
            className="rounded-md border border-borde px-3 py-1 disabled:cursor-not-allowed disabled:opacity-40 max-lg:px-4 max-lg:py-2"
          >
            Anterior
          </button>
          <button
            type="button"
            disabled={!haySiguiente}
            onClick={() => onCambiarOffset(offset + limit)}
            className="rounded-md border border-borde px-3 py-1 disabled:cursor-not-allowed disabled:opacity-40 max-lg:px-4 max-lg:py-2"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  )
}
