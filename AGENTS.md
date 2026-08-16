# AGENTS.md

## Descripción del proyecto

Panel de control web (SIEM Dashboard) para el proyecto EquipoBotRojo-Proyecto-3, una arquitectura SIEM/SOAR basada en herramientas de código abierto. El frontend permite visualizar y operar el sistema de detección de intrusiones en tiempo real.

## Stack tecnológico

- **Frontend:** React + TypeScript + Tailwind CSS
- **Backend:** FastAPI (Python)
- **Base de datos:** PostgreSQL (ya existente en el stack Docker)
- **APIs externas consumidas:** n8n, Prometheus, fail2ban-exporter

## Estructura de carpetas esperada
EquipoBotRojo-Proyecto-3/
├── frontend/
│ ├── src/
│ │ ├── components/
│ │ ├── pages/
│ │ ├── services/
│ │ ├── types/
│ │ └── hooks/
│ ├── public/
│ └── package.json
├── backend/
│ ├── routers/
│ ├── services/
│ ├── models/
│ ├── main.py
│ └── requirements.txt
└── docs/
## Convenciones de código

- Todo el código, comentarios, nombres de variables, mensajes de error y documentación en **español**
- Nombres de archivos y carpetas en **snake_case** para Python, **kebab-case** para React
- Componentes React en **PascalCase**
- Funciones y variables en **camelCase**
- Constantes en **SCREAMING_SNAKE_CASE**
- Sin comentarios obvios — solo comentar lógica no evidente

## Reglas para el agente

- Nunca modificar archivos fuera de `frontend/` y `backend/`
- Nunca tocar `docker-compose.yml`, archivos de configuración de contenedores, workflows de n8n, ni ningún archivo del stack existente
- Nunca hardcodear IPs ni credenciales — usar variables de entorno
- Siempre tipar correctamente en TypeScript — prohibido usar `any`
- Cada endpoint del backend debe tener manejo de errores explícito
- El frontend consume el backend, no las APIs del stack directamente (excepto donde se indique en el SDD)
- Usar `axios` para llamadas HTTP en el frontend
- Usar `httpx` para llamadas HTTP en el backend

## Variables de entorno

### Backend (.env)
```
DATABASE_URL=postgresql://db_user:db_pass@192.168.100.160:5432/security_monitoring
N8N_URL=http://192.168.100.160:5678
N8N_API_KEY=
PROMETHEUS_URL=http://192.168.100.160:9090
FAIL2BAN_EXPORTER_URL=http://192.168.100.160:9121
DOCKER_HOST=unix:///var/run/docker.sock
```

### Frontend (.env)
VITE_API_URL=http://localhost:8000

## Secciones del dashboard

1. **Inicio** — presentación del sistema, estado general
2. **Dashboard** — métricas en tiempo real, estado de contenedores, últimas alertas
3. **Logs y detección** — visor de alerts.log, inyector de logs, ejecución de workflows
4. **Gestión de IPs** — blocked_ips, attack_patterns, system_metrics
5. **Tickets** — lista paginada de tickets generados
6. **Fail2ban** — estado de la jail, IPs baneadas actualmente
7. **Prometheus** — estado de las 3 alertas

## Lo que NO debe hacer el agente

- No crear tests automatizados salvo que se pidan explícitamente
- No instalar dependencias no mencionadas sin consultar primero
- No cambiar el puerto del backend (usar 8000)
- No cambiar el puerto del frontend (usar 5173)
- No asumir que el stack Docker está en localhost — usar las variables de entorno