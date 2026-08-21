# Proposal: ui-wazuh (CH20)

## Why

La ruta `/dashboard/wazuh` existe desde el cimiento del frontend (CH01) pero renderiza un `Placeholder`: el operador no tiene forma de ver cuántas alertas nativas genera Wazuh (FIM, integridad de archivos). El backend ya expone el dato (`GET /api/wazuh/alerts/count`, implementado en CH12) y el Sidebar ya enlaza la sección, así que falta únicamente la capa de presentación. Es además el último placeholder del panel: completarlo cierra el roadmap de secciones del dashboard.

## What Changes

- Crear la página `WazuhPage.tsx` (componente contenedor) que consulta `GET /api/wazuh/alerts/count` vía polling y renderiza la vista real en `/dashboard/wazuh`, reemplazando al `Placeholder`.
- Crear el componente presentacional `ContadorAlertasWazuh.tsx` (en `frontend/src/components/wazuh/`): card con el **número total en grande** y el mensaje de origen que provee el backend.
- Incluir una **nota aclaratoria fija** en la vista: las alertas de seguridad procesadas por el pipeline de n8n NO se ven acá — se consultan en las secciones Dashboard y Tickets.
- Agregar el intervalo de polling de la sección (`INTERVALOS_POLLING.WAZUH = 10000`) a `constants/polling.ts`, siguiendo la cadencia de 10s que AGENTS.md define para lecturas de métricas.
- Crear `services/wazuhService.ts` y `types/wazuh.ts` tipando el contrato real del backend (`{ total, mensaje }`), sin `any`.
- Botón de refresco manual + estados de carga y error en español, con reintento sin recargar la página.
- Limpiar el import de `Placeholder` en `App.tsx` (queda sin uso al ser la última ruta que lo consumía).

## Capabilities

### New Capabilities

- `ui-wazuh`: comportamiento observable de la sección "Wazuh" del panel — contador de alertas nativas en formato card con número grande, nota de diferenciación frente a las alertas de n8n, actualización periódica por polling, refresco manual, estados de carga/error y acceso protegido.

### Modified Capabilities

Ninguna. La capability de backend `conteo-alertas-wazuh` (CH12) no cambia: este change es exclusivamente de frontend y consume el endpoint tal como está.

## Impact

- **Archivos nuevos** (todos dentro de `frontend/src/`): `pages/WazuhPage.tsx`, `components/wazuh/ContadorAlertasWazuh.tsx`, `services/wazuhService.ts`, `types/wazuh.ts`.
- **Archivos modificados**: `App.tsx` (import de `WazuhPage`, reemplazo del `Placeholder`, limpieza del import huérfano), `constants/polling.ts` (nueva constante `WAZUH`).
- **Backend**: sin cambios. `routers/wazuh.py` y `schemas/wazuh.py` se consumen tal cual están.
- **Dependencias**: ninguna nueva (axios, lucide-react y el resto del stack ya están).
- **Riesgo**: bajo — sección de solo lectura, sin efectos sobre el stack ni sobre Wazuh.

## No-alcance

- No se modifica el backend ni se agregan endpoints: el contrato `{ total, mensaje }` ya existe y es suficiente.
- No se muestra el detalle ni el contenido de las alertas individuales de Wazuh: la vista es un contador, nada más.
- No se integran acá las alertas que llegan por n8n: esas ya se visualizan en Dashboard y Tickets, y la nota aclaratoria de la vista lo indica explícitamente.
- No se crean tests automatizados (el proyecto verifica manualmente, según convención establecida).
