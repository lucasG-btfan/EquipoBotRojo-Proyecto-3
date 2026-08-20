# Proposal: CH14 ui-dashboard

## Objetivo

Implementar la página principal del dashboard (`/dashboard/panel`) con métricas en tiempo real: estado de contenedores Docker, métricas de Prometheus (IPs baneadas, fail2ban), últimas alertas de PostgreSQL y métricas de desempeño TPW.

## Motivación

Es la vista central del SIEM Dashboard — el operador necesita ver de un vistazo el estado de todo el sistema. Actualmente es un stub (`Placeholder`). El roadmap CH14 la define como la segunda página funcional después de Inicio.

## Alcance

- Reemplazar `DashboardPage.tsx` (stub) con composición real
- 4 secciones: Contenedores, Prometheus, Alertas recientes, TPW
- Polling configurable según AGENTS.md: 10s contenedores/métricas, 30s alertas/TPW
- Reutilizar componentes existentes: `Card`, `Badge`, `Spinner`, `usePolling`, `apiClient`
- Reutilizar tipos existentes: `Contenedor`, `RecursoContenedor`, `Alerta`, `MetricaTPW`, `AlertaPrometheus`

## No-alcance

- No se crean endpoints nuevos (todos ya existen)
- No se modifican componentes existentes
- No se agregan dependencias
- No se implementan las otras secciones (CH15-CH20)

## Dependencias

- **CH01** (cimiento-frontend): layout, routing, componentes base
- **CH04** (api-contenedores): `GET /api/status/containers`, `GET /api/status/resources`
- **CH05** (api-prometheus): `GET /api/prometheus/alerts`
- **CH06** (api-alertas): `GET /api/alerts/recent`
- **CH08** (api-workflows): `GET /api/metrics/tpw`
