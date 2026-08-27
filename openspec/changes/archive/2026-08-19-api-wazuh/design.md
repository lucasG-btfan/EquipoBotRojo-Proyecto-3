## Context

Ver `proposal.md` — Why. Los requisitos observables están en `specs/conteo-alertas-wazuh/spec.md`; este documento cubre solo el cómo.

Estado actual relevante:

- `backend/routers/wazuh.py`, `backend/services/wazuh_service.py` y `backend/schemas/wazuh.py` existen como stubs de CH00. El router ya está registrado en `main.py` y ya exige JWT vía `Depends(usuario_actual)`.
- `backend/config.py` ya declara `WAZUH_URL` (`https://localhost:55000`), `WAZUH_USER` y `WAZUH_PASSWORD`, pero ningún código las usa todavía.
- El patrón vigente para "servicio externo que puede fallar" es CH11: el servicio define una excepción de dominio propia y el router la traduce a `503`; cualquier otra excepción cae en un `except Exception` que devuelve `500`. Ver `backend/services/fail2ban_service.py` y `backend/routers/fail2ban.py`.
- El patrón vigente para HTTP externo asíncrono es `backend/services/prometheus_service.py`: `httpx.AsyncClient` con timeout constante a nivel de módulo y excepciones de dominio por causa (conexión / timeout / respuesta inesperada).
- El stack real (`docker-compose.yml`) corre **Wazuh 4.7.2** en tres contenedores: `wazuh-manager` (publica `55000`), `wazuh-indexer` (publica `9201` en el host, `9200` interno, credenciales `admin` / `OPENSEARCH_INITIAL_ADMIN_PASSWORD`) y `wazuh-dashboard`. Los tres usan TLS con certificados autofirmados.

## Goals / Non-Goals

**Goals:**

- Obtener el conteo total de alertas nativas con una sola consulta HTTP barata, cuyo costo no crezca con el volumen acumulado.
- Reutilizar exactamente el estilo de CH11/CH06: excepción de dominio en el servicio, traducción a `503` en el router, mensajes en español que distinguen la causa.
- Que toda la conexión (URL, credenciales, índice, verificación TLS) sea configurable por entorno, con defaults funcionales para el stack actual.

**Non-Goals:**

- No se construye un cliente Wazuh reutilizable ni una capa de abstracción sobre OpenSearch. Una función acotada alcanza para un conteo.
- No se cachea el resultado: el frontend hace polling y el spec exige el valor vigente.
- No se agrega paginación ni filtros (por regla, agente o severidad) — fuera de alcance según `proposal.md`.

## Decisions

### 1. Fuente del conteo: el indexador de Wazuh, no la API del manager

> **Estado: CONFIRMADA por el usuario.** Se consulta el indexador (`9201`, `_count`); la API del manager (`55000`) queda descartada para CH12.

El roadmap (CH12) describe `GET WAZUH_URL:55000/alerts?limit=1` con Basic Auth. Al contrastarlo con el stack real, **ese endpoint no existe en Wazuh 4.7.2**:

- La API del *manager* (puerto `55000`) expone administración: agentes, reglas, decoders, syscheck, configuración. No tiene una ruta `/alerts` que devuelva alertas ni su conteo.
- La API del manager tampoco acepta Basic Auth en sus rutas de datos: exige primero `GET /security/user/authenticate` con Basic Auth para obtener un JWT, y recién después `Authorization: Bearer <jwt>` en cada llamada. Ese JWT expira y habría que renovarlo.
- Las alertas de Wazuh (FIM, rootcheck, integridad) se indexan en el *indexer* (OpenSearch), en los índices `wazuh-alerts-*`.

Decisión: consultar el indexador con `GET {WAZUH_INDEXER_URL}/{WAZUH_ALERTS_INDEX}/_count` usando Basic Auth. La respuesta es `{"count": N, "_shards": {...}}` — exactamente un conteo, sin transferir documentos, que es lo que el spec exige ("obtener el total sin descargar el detalle").

Alternativas consideradas:

- **API del manager con flujo JWT.** Descartada: no expone conteo de alertas, así que ni siquiera resuelve el requisito. Habría que traer alertas del indexador igual.
- **`_search` con `size=0` y leer `hits.total.value`.** Descartada: `_count` es más directo y no arrastra el tope de 10 000 de `track_total_hits`, que daría un total truncado en un stack con volumen.
- **Consultar el dashboard de Wazuh (`5602`).** Descartada: es una UI, su API interna no es contrato estable.

`WAZUH_URL` / `WAZUH_USER` / `WAZUH_PASSWORD` (manager) se dejan intactas en `config.py`: no las usa CH12, pero sirven para un change futuro que consulte agentes o estado del manager.

### 2. Variables de entorno nuevas, con defaults funcionales

Siguiendo el criterio de CH07 y CH11 (defaults que funcionan contra el stack actual, `.env` solo para lo que cambie):

| Variable | Default | Rol |
|---|---|---|
| `WAZUH_INDEXER_URL` | `https://localhost:9201` | Puerto publicado del indexador en el host |
| `WAZUH_INDEXER_USER` | `admin` | Usuario del indexador |
| `WAZUH_INDEXER_PASSWORD` | `""` | Se completa por `.env`, nunca se versiona |
| `WAZUH_ALERTS_INDEX` | `wazuh-alerts-*` | Patrón de índice de alertas |
| `WAZUH_VERIFY_TLS` | `False` | Certificados autofirmados del stack |

`WAZUH_VERIFY_TLS` es explícita y no un `verify=False` hardcodeado: el spec exige que la política TLS sea configurable, y un despliegue con certificados propios debe poder activarla sin tocar código.

### 3. Traducción de errores: una excepción de dominio, causa en el mensaje

Se define `ErrorWazuh(Exception)` en `wazuh_service.py`, análoga a `ErrorFail2ban`. El servicio captura `httpx.ConnectError`, `httpx.TimeoutException`, error de certificado, `401/403`, otros códigos no-2xx, y cuerpo no interpretable, y en todos los casos lanza `ErrorWazuh` con un mensaje en español que ya identifica la causa. El router hace `except ErrorWazuh -> 503` y `except Exception -> 500`.

Alternativa considerada: una excepción por causa, como en `prometheus_service.py` (`PrometheusConnectionError`, `PrometheusTimeoutError`, …). Descartada aquí: el spec manda todas las causas al mismo código `503` y solo distingue por texto, así que varias clases agregarían ruido sin cambiar el comportamiento observable. CH11 ya tomó esta misma decisión con `ErrorFail2ban`.

Nota de seguridad: `httpx` no incluye credenciales en el texto de sus excepciones, pero el servicio **nunca** interpola `WAZUH_INDEXER_PASSWORD` en un mensaje, y al reportar un error HTTP incluye el código y un extracto acotado del cuerpo, no la petición.

### 4. Timeout acotado a nivel de módulo

`TIMEOUT_WAZUH = 5.0`, constante de módulo como `TIMEOUT_PROMETHEUS` y `TIMEOUT_FAIL2BAN`. Coherente con un polling de 10 s: la petición nunca puede quedar colgada más de lo que tarda el siguiente ciclo.

### 5. Contrato de respuesta: `{total, mensaje}`

El schema stub (`total`, `por_severidad`) se reemplaza por `total: int` y `mensaje: str`, que es el contrato acordado y el que consumirá el frontend. `por_severidad` se retira en vez de dejarse en `{}`: un campo siempre vacío es una promesa que el endpoint no cumple. `mensaje` es una constante de módulo (`"Alertas nativas de Wazuh (FIM, integridad, etc.)"`), no texto embebido en el handler.

## Risks / Trade-offs

- **La decisión §1 se desvía de la letra del roadmap.** → El roadmap es una guía de alto nivel escrita antes de verificar la API real; el spec y este diseño documentan la fuente efectiva. El usuario confirmó la desviación, así que `apply` implementa contra el indexador.
- **El backend corre en el host y el indexador solo es alcanzable por su puerto publicado (`9201`).** Si en algún despliegue el backend pasa a correr dentro de `wazuh-network`, la URL correcta sería `https://wazuh-indexer:9200`. → Mitigado: es un cambio de `WAZUH_INDEXER_URL` en `.env`, sin tocar código.
- **`WAZUH_VERIFY_TLS=False` por defecto deja la conexión sin verificar el certificado.** → Aceptado: es tráfico interno al stack contra certificados autofirmados, y el spec exige que funcione contra ellos. La variable permite endurecerlo donde haya PKI real.
- **`wazuh-alerts-*` cuenta todas las alertas indexadas, incluidas las que el pipeline de n8n también procesa.** → Aceptado para CH12: el contrato promete "alertas nativas de Wazuh" en el sentido de "alertas que Wazuh indexó", y el `mensaje` lo explicita. Un filtro por regla o grupo (ej. `syscheck`) sería un refinamiento posterior con un requisito propio.
- **Si el indexador todavía no creó ningún índice `wazuh-alerts-*`, `_count` sobre el patrón responde `404` (`index_not_found_exception`).** → El servicio trata ese caso puntual como `total: 0` y no como error: un stack recién levantado sin alertas debe responder `200` con `0` según el spec, no `503`.

## Open Questions

- ¿Se quiere en el futuro discriminar el conteo por grupo de regla (FIM / rootcheck / syscheck) en vez de un total único? No afecta a CH12: sería un requisito adicional sobre la misma consulta, con un `query` en el cuerpo del `_count`.
