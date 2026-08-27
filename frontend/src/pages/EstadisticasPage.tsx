import { useCallback } from 'react'
import { ContadorAlertasWazuh } from '../components/wazuh/ContadorAlertasWazuh'
import { EnlacesExternos } from '../components/estadisticas/EnlacesExternos'
import { INTERVALOS_POLLING } from '../constants/polling'
import { usePolling } from '../hooks/usePolling'
import { obtenerConteoAlertasWazuh } from '../services/wazuhService'

/**
 * Página contenedora de la sección "Estadísticas": conteo de alertas
 * nativas de Wazuh vía polling cada INTERVALOS_POLLING.WAZUH (design.md D1)
 * más accesos directos a las consolas de Kibana y Wazuh. Solo lectura: la
 * única acción sobre el backend es volver a leer el conteo.
 */
export function EstadisticasPage() {
  const peticion = useCallback(() => obtenerConteoAlertasWazuh(), [])

  const { datos, cargando, error, refrescar } = usePolling(peticion, INTERVALOS_POLLING.WAZUH)

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 max-lg:gap-4 max-lg:p-4">
      <h1 className="text-2xl font-bold text-slate-100 max-lg:text-xl">Estadísticas</h1>

      <section>
        <ContadorAlertasWazuh
          total={datos?.total ?? null}
          mensaje={datos?.mensaje ?? null}
          cargando={cargando}
          error={error}
          onRefrescar={() => void refrescar()}
        />
      </section>

      <section>
        <EnlacesExternos />
      </section>
    </div>
  )
}
