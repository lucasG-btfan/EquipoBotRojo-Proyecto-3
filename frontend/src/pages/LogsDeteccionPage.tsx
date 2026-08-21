import { LogViewer } from '../components/logs-deteccion/LogViewer'
import { BotonesWorkflow } from '../components/logs-deteccion/BotonesWorkflow'
import { InyectorLogs } from '../components/logs-deteccion/InyectorLogs'
import { HistorialWorkflows } from '../components/logs-deteccion/HistorialWorkflows'

/**
 * Página orquestadora de la sección "Logs y detección".
 * Integra los 4 sub-componentes: LogViewer, BotonesWorkflow,
 * InyectorLogs e HistorialWorkflows.
 */
export function LogsDeteccionPage() {
  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 max-lg:gap-4 max-lg:p-4">
      <h1 className="text-2xl font-bold text-slate-100 max-lg:text-xl">Logs y detección</h1>

      {/* Visor de logs — ancho completo */}
      <section>
        <LogViewer />
      </section>

      {/* Fila de 2 columnas: Botones de workflow + Inyector de logs */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <BotonesWorkflow />
        <InyectorLogs />
      </section>

      {/* Historial de workflows — ancho completo, uno por workflow */}
      <section>
        <HistorialWorkflows
          titulo="Historial de workflows"
          endpoint="/api/workflows/runs"
          mostrarItemsProcesados
        />
      </section>

      <section>
        <HistorialWorkflows titulo="Historial de métricas" endpoint="/api/workflows/metrics/runs" />
      </section>
    </div>
  )
}
