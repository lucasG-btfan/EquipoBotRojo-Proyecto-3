import { TablaIpsBloqueadas } from '../components/gestion-ips/TablaIpsBloqueadas'
import { TablaPatronesAtaque } from '../components/gestion-ips/TablaPatronesAtaque'
import { TablaMetricasSistema } from '../components/gestion-ips/TablaMetricasSistema'

/**
 * Página orquestadora de la sección "Gestión de IPs". Integra los 3
 * sub-componentes; no maneja estado ni llamadas HTTP propias (design.md D1).
 */
export function GestionIpsPage() {
  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8">
      <h1 className="text-2xl font-bold text-slate-100">Gestión de IPs</h1>

      <section>
        <TablaIpsBloqueadas />
      </section>

      <section>
        <TablaPatronesAtaque />
      </section>

      <section>
        <TablaMetricasSistema />
      </section>
    </div>
  )
}
