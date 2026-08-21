import { ExternalLink } from 'lucide-react'
import { Card } from '../common/Card'

interface EnlaceExterno {
  etiqueta: string
  url: string
}

// URLs configurables vía VITE_KIBANA_URL / VITE_WAZUH_URL (frontend/.env),
// con los puertos publicados del stack como default.
const ENLACES: EnlaceExterno[] = [
  { etiqueta: 'Abrir Kibana', url: import.meta.env.VITE_KIBANA_URL ?? 'http://localhost:5601' },
  { etiqueta: 'Abrir Wazuh', url: import.meta.env.VITE_WAZUH_URL ?? 'http://localhost:5602' },
]

/**
 * Accesos directos a las consolas nativas de Kibana y Wazuh, en pestaña
 * nueva. Solo enlaces: no hay estado ni llamadas al backend.
 */
export function EnlacesExternos() {
  return (
    <Card titulo="Consolas externas">
      <div className="grid grid-cols-2 gap-4 max-lg:grid-cols-1">
        {ENLACES.map(({ etiqueta, url }) => (
          <a
            key={url}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-between gap-3 rounded-lg border border-borde bg-fondo px-5 py-4 text-slate-200 transition-colors hover:border-primario/60 hover:bg-primario/10"
          >
            <span className="text-sm font-medium">{etiqueta}</span>
            <ExternalLink
              size={18}
              className="shrink-0 text-slate-400 transition-colors group-hover:text-primario"
            />
          </a>
        ))}
      </div>
    </Card>
  )
}
