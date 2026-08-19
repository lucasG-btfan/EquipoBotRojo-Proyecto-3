## 1. Configuración

- [x] 1.1 Agregar a `backend/config.py` las variables `WAZUH_INDEXER_URL` (`https://localhost:9201`), `WAZUH_INDEXER_USER` (`admin`), `WAZUH_INDEXER_PASSWORD` (`""`), `WAZUH_ALERTS_INDEX` (`wazuh-alerts-*`) y `WAZUH_VERIFY_TLS` (`False`), con comentario `# ... (CH12)` siguiendo el estilo de los bloques de CH07 y CH11. No tocar `WAZUH_URL` / `WAZUH_USER` / `WAZUH_PASSWORD`.
- [x] 1.2 Documentar esas cinco variables en el bloque `.env` del backend en `CLAUDE.md`, con la nota al pie explicando que apuntan al indexador y no a la API del manager (ver `design.md` §1).

## 2. Schema

- [x] 2.1 Reescribir `backend/schemas/wazuh.py`: `ConteoAlertasWazuhSchema` con `total: int` y `mensaje: str`, sin `por_severidad`.

## 3. Servicio de Wazuh

- [x] 3.1 Escribir el docstring de módulo de `backend/services/wazuh_service.py` explicando que consulta el indexador (no la API del manager) y referenciando `design.md` §1, al estilo del docstring de `fail2ban_service.py`.
- [x] 3.2 Definir `TIMEOUT_WAZUH = 5.0`, la constante `MENSAJE_ALERTAS` (`"Alertas nativas de Wazuh (FIM, integridad, etc.)"`) y la excepción de dominio `ErrorWazuh(Exception)`.
- [x] 3.3 Implementar la función pura `_extraer_total(datos: dict) -> int` que lee `count` del cuerpo de `_count` y lanza `ErrorWazuh("No se pudo interpretar la respuesta de Wazuh...")` si falta o no es un entero.
- [x] 3.4 Implementar `contar_alertas_wazuh() -> dict` con `httpx.AsyncClient(timeout=TIMEOUT_WAZUH, verify=settings.WAZUH_VERIFY_TLS)`, `GET {WAZUH_INDEXER_URL}/{WAZUH_ALERTS_INDEX}/_count` y `auth=(WAZUH_INDEXER_USER, WAZUH_INDEXER_PASSWORD)`. Retorna `{"total": N, "mensaje": MENSAJE_ALERTAS}`.
- [x] 3.5 Traducir cada modo de falla a `ErrorWazuh` con mensaje en español que identifique la causa: `httpx.ConnectError` (no se pudo conectar, nombrando `WAZUH_INDEXER_URL`), `httpx.TimeoutException` (superó `TIMEOUT_WAZUH`), error de certificado TLS, `401`/`403` (credenciales rechazadas), y otros códigos no-2xx (incluyendo el código y un extracto acotado del cuerpo). Verificar que la contraseña nunca se interpola en ningún mensaje.
- [x] 3.6 Tratar el `404` con `index_not_found_exception` (índice `wazuh-alerts-*` aún inexistente) como `total: 0` con respuesta exitosa, no como error.

## 4. Router

- [x] 4.1 Reescribir `backend/routers/wazuh.py`: `response_model=ConteoAlertasWazuhSchema`, llamada a `wazuh_service.contar_alertas_wazuh()`, `except ErrorWazuh -> HTTPException(503, str(e))` y `except Exception -> HTTPException(500, ...)`, calcando la estructura de `routers/fail2ban.py`. Mantener `Depends(usuario_actual)`.

## 5. Verificación

- [x] 5.1 Levantar el backend y verificar que `GET /api/wazuh/alerts/count` sin token es rechazado, y con token válido responde `200` con `total` y `mensaje`.
- [x] 5.2 Verificar la degradación: apuntar `WAZUH_INDEXER_URL` a un puerto cerrado y confirmar `503` con mensaje en español que nombra la URL; luego con credenciales incorrectas y confirmar `503` con el mensaje de credenciales rechazadas y sin filtrar la contraseña.
- [x] 5.3 Confirmar que `/docs` refleja el nuevo `response_model` y que el resto de los endpoints del dashboard siguen funcionando con Wazuh caído.
