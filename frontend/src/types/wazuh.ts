/**
 * Tipos de la sección "Wazuh". Contrato verificado contra
 * backend/routers/wazuh.py y backend/schemas/wazuh.py
 * (`ConteoAlertasWazuhSchema`) — ver design.md D2.
 */
export interface ConteoAlertasWazuh {
  total: number
  mensaje: string
}
