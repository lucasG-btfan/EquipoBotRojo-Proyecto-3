import { PanelAlertas } from '../components/prometheus/PanelAlertas'

/**
 * Página orquestadora de la sección "Prometheus". Un único bloque de datos;
 * no maneja estado ni llamadas HTTP propias (design.md D1).
 */
export function PrometheusPage() {
  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 max-lg:gap-4 max-lg:p-4">
      <h1 className="text-2xl font-bold text-slate-100 max-lg:text-xl">Prometheus</h1>

      <section>
        <PanelAlertas />
      </section>
    </div>
  )
}
