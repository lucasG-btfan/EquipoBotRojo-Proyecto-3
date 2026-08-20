import { TablaTickets } from '../components/tickets/TablaTickets'

/**
 * Página orquestadora de la sección "Tickets". Un único bloque de datos;
 * no maneja estado ni llamadas HTTP propias (design.md D1).
 */
export function TicketsPage() {
  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8">
      <h1 className="text-2xl font-bold text-slate-100">Tickets</h1>

      <section>
        <TablaTickets />
      </section>
    </div>
  )
}
