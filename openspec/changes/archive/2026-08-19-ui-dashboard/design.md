# Design: CH14 ui-dashboard

## Arquitectura

DashboardPage es un componente de composición que orquesta 4 sub-secciones, cada una con su propio polling independiente. No es un layout nuevo — reutiliza el Layout existente de CH01.

## Estructura del componente

```
DashboardPage
├── Fila 1: Resumen general (4 cards KPI)
│   ├── Contenedores activos (N/M)
│   ├── IPs baneadas (fail2ban_banned_ips)
│   ├── Estado fail2ban (fail2ban_up)
│   └── Último TPW (segundos)
├── Fila 2: Estado de contenedores (grid de cards)
│   └── Card por cada contenedor: nombre + badge estado
├── Fila 3: Dos columnas
│   ├── Izquierda: Últimas 5 alertas (tabla)
│   └── Derecha: Métricas TPW (historial)
```

## Datos y polling

| Sección | Endpoint | Intervalo | Constante |
|---------|----------|-----------|-----------|
| Contenedores | `GET /api/status/containers` | 10s | `METRICAS_SISTEMA` |
| Prometheus (fail2ban) | `GET /api/prometheus/alerts` | 30s | `PROMETHEUS` |
| Alertas recientes | `GET /api/alerts/recent?limit=5` | 30s | `DASHBOARD` |
| TPW | `GET /api/metrics/tpw` | 30s | `DASHBOARD` |

**Nota:** Contenedores usa 10s (cambian rápido). El resto usa 30s (datos más estables).

## Componentes reutilizados

- `Card` — contenedor oscuro base
- `Badge` — etiquetas de estado (running/stopped, severidad)
- `Spinner` — indicador de carga
- `usePolling<T>` — hook genérico de polling
- `apiClient` — cliente HTTP con JWT
- `INTERVALOS_POLLING` — constantes de intervalo

## Tipos reutilizados

- `Contenedor` (types/contenedores.ts)
- `RecursoContenedor` (types/contenedores.ts)
- `Alerta` (types/alertas.ts)
- `AlertaPrometheus` (types/alertas.ts)
- `MetricaTPW` (types/metrics.ts)

## Decisiones de diseño

1. **4 polls independientes** — no un solo poll masivo. Cada sección tiene su intervalo.
2. **KPI cards arriba** — resumen de un vistazo antes del detalle.
3. **Grid responsive** — 1 columna en móvil, 2-4 en desktop.
4. **Colores semánticos** — usar tokens de Tailwind (`bg-exito`, `bg-peligro`), nunca literales.
5. **Sin dependencias nuevas** — todo con lo que ya existe.
