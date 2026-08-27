## Why

El dashboard SIEM muestra alertas que llegan por el pipeline de n8n (PostgreSQL) y métricas de Fail2ban vía Prometheus, pero no tiene forma de saber cuántas alertas **nativas de Wazuh** (FIM, chequeos de integridad, rootcheck) se generaron. Sin ese contador, la sección "Wazuh" del dashboard queda vacía y el operador no puede distinguir la detección propia de Wazuh de la que llega orquestada por n8n. Hoy `GET /api/wazuh/alerts/count` existe como stub de CH00 y responde `{"mensaje": "Endpoint no implementado"}`.

## What Changes

- Implementar `GET /api/wazuh/alerts/count`, que retorna la cantidad total de alertas nativas de Wazuh junto con un mensaje descriptivo que aclara su origen (FIM, integridad, etc.).
- Implementar `backend/services/wazuh_service.py` (hoy stub) con la integración real contra la API de Wazuh vía `httpx.AsyncClient`, con timeout acotado, autenticación por credenciales de entorno y tolerancia a certificados autofirmados.
- Definir una excepción de dominio propia (`ErrorWazuh`) que el router traduce a `503` con mensaje en español distinguible por causa, siguiendo el patrón ya establecido en `fail2ban_service.py` / `routers/fail2ban.py` (CH11).
- Ajustar `backend/schemas/wazuh.py`: el schema actual (`total`, `por_severidad`) no coincide con el contrato acordado (`total`, `mensaje`). Se alinea al contrato del endpoint.
- Agregar a `backend/config.py` y documentar en el bloque `.env` del backend en `CLAUDE.md` las variables de conexión al indexador de Wazuh: `WAZUH_INDEXER_URL`, `WAZUH_INDEXER_USER`, `WAZUH_INDEXER_PASSWORD`, `WAZUH_ALERTS_INDEX` y `WAZUH_VERIFY_TLS`, con defaults funcionales para el stack actual. `WAZUH_URL` / `WAZUH_USER` / `WAZUH_PASSWORD` (API del manager) ya existen y quedan sin uso en CH12.

Sin cambios breaking: el endpoint ya está publicado y el frontend aún no lo consume con datos reales.

### No-alcance

- No se listan ni pagina el detalle de alertas de Wazuh; solo el conteo agregado. El detalle queda fuera de CH12.
- No se agrupa por severidad ni por regla (el campo `por_severidad` del schema stub se retira, no se implementa).
- No se toca el stack Docker, la configuración de Wazuh ni sus reglas.
- No se implementa la vista frontend de la sección Wazuh (change posterior); CH12 entrega solo el contrato de backend.
- No se agregan dependencias nuevas: `httpx` ya está en `requirements.txt`.

## Capabilities

### New Capabilities

- `conteo-alertas-wazuh`: comportamiento del backend al exponer la cantidad de alertas nativas de Wazuh — qué se cuenta, forma de la respuesta, autenticación requerida y degradación cuando Wazuh no está disponible.

### Modified Capabilities

(ninguna — no cambian requisitos de capabilities existentes)

## Impact

- **Código afectado:**
  - `backend/services/wazuh_service.py` — se reemplaza el stub por la integración real.
  - `backend/routers/wazuh.py` — se reemplaza la respuesta placeholder por la llamada al servicio y el mapeo de errores.
  - `backend/schemas/wazuh.py` — se alinea al contrato `{total, mensaje}`.
  - `backend/config.py` — se agregan las variables de conexión al indexador de Wazuh.
  - `CLAUDE.md` — documentación del bloque `.env`.
- **API:** `GET /api/wazuh/alerts/count` pasa de placeholder a datos reales. Requiere JWT como el resto de las rutas.
- **Sistemas externos:** nueva dependencia operativa del backend con el indexador de Wazuh (`wazuh-indexer`, puerto publicado `9201`). Si el indexador está caído, el endpoint degrada a `503` y el resto del dashboard sigue funcionando.
- **Dependencias:** ninguna nueva.
- **Decisión confirmada:** el roadmap describía consultar la API del manager en el puerto `55000`, que en Wazuh 4.7.2 no expone conteo de alertas. La fuente efectiva, confirmada por el usuario, es el indexador. Ver `design.md` §1.
