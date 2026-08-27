/**
 * Tipos de la sección "Fail2ban". Contrato verificado contra
 * backend/schemas/fail2ban.py (JailSchema).
 */
export interface EstadoJail {
  jail: string
  baneadas: number
  ips: string[]
}
