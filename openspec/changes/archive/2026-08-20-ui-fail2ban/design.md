# Design: ui-fail2ban (CH18)

## D1 — Separación de responsabilidades

- `Fail2banPage.tsx` — Page orquestadora, solo layout (siguiendo patrón de TicketsPage)
- `EstadoJail.tsx` — Componente contenedor que usa `usePolling` para obtener datos del backend
- `fail2banService.ts` — Servicio HTTP centralizado, una función `obtenerEstadoJail()`
- `types/fail2ban.ts` — Interface `EstadoJail` que mapea la respuesta del backend

## D2 — Tipos

```typescript
// types/fail2ban.ts
export interface EstadoJail {
  jail: string
  baneadas: number
  ips: string[]
}
```

## D3 — Flujo de datos

1. `Fail2banPage` renderiza `EstadoJail`
2. `EstadoJail` usa `usePolling` con `INTERVALOS_POLLING.FAIL2BAN` (10s)
3. `usePolling` llama a `fail2banService.obtenerEstadoJail()` → `GET /api/fail2ban/jail`
4. Datos se renderizan en Card con contador y lista de IPs

## D4 — UI Layout

- **Título de página:** "Fail2ban"
- **Card principal:** Nombre de la jail + contador de IPs baneadas (número grande)
- **Lista de IPs:** Cada IP con Badge rojo (`peligro`), fuente monoespaciada
- **Botón refresh:** Manual, al lado del título
- **Timestamp:** Última actualización en formato local
- **Estado vacío:** "No hay IPs baneadas actualmente" cuando `baneadas === 0`
- **Error:** Mensaje en card rojo cuando el backend retorna error (fail2ban no disponible)

## D5 — Integración

- `App.tsx`: Reemplazar `<Placeholder titulo="Fail2ban" />` por `<Fail2banPage />`
- Sidebar: Ya tiene la ruta `/dashboard/fail2ban` configurada, no necesita cambios
- Polling: Usar `INTERVALOS_POLLING.FAIL2BAN` (10s) — constante ya definida en `constants/polling.ts`

## D6 — Estilo

- Seguir token semántico del proyecto: fondo `#0f172a`, cards `#1e293b`, acentos `#ef4444` (peligro para IPs baneadas)
- Componentes reutilizar: `Card`, `Badge`, `Spinner` de `components/common/`
