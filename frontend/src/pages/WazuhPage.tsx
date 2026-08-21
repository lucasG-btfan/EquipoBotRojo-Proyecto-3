import { useCallback } from 'react'
import { ContadorAlertasWazuh } from '../components/wazuh/ContadorAlertasWazuh'
import { INTERVALOS_POLLING } from '../constants/polling'
import { usePolling } from '../hooks/usePolling'
import { obtenerConteoAlertasWazuh } from '../services/wazuhService'

/**
 * Página contenedora de la sección "Wazuh": consulta el conteo de alertas
 * nativas vía polling cada INTERVALOS_POLLING.WAZUH y le pasa el estado ya
 * resuelto al componente presentacional (design.md D1). Solo lectura: la
 * única acción sobre el backend es volver a leer el conteo.
 */
export function WazuhPage() {
  const peticion = useCallback(() => obtenerConteoAlertasWazuh(), [])

  const { datos, cargando, error, refrescar } = usePolling(peticion, INTERVALOS_POLLING.WAZUH)

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 max-lg:gap-4 max-lg:p-4">
      <h1 className="text-2xl font-bold text-slate-100 max-lg:text-xl">Wazuh</h1>

      <section>
        <ContadorAlertasWazuh
          total={datos?.total ?? null}
          mensaje={datos?.mensaje ?? null}
          cargando={cargando}
          error={error}
          onRefrescar={() => void refrescar()}
        />
      </section>
    </div>
  )
}
