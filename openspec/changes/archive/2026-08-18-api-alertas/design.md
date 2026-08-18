# Design: api-alertas (CH06)

## Resumen técnico

Implementar los dos endpoints de alertas en el router existente `backend/routers/alertas.py`, que actualmente contiene stubs. No se crean nuevos archivos de router ni modelo — se reutiliza lo existente.

## Decisiones de diseño

### 1. Endpoint `/api/alerts/recent`

**Enfoque:** Consulta SQLAlchemy async sobre el modelo `Alerta` existente.

- **Sesión DB:** Usar `async_session_factory` de `backend/database.py` vía dependency injection (`get_db`). El router ya importa `usuario_actual` — agregar `get_db`.
- **Query:** `select(Alerta).order_by(Alerta.timestamp.desc()).limit(limit).offset(offset)` + `select(func.count(Alerta.id))` para el total.
- **Serialización:** Dado que el modelo ORM tiene más campos de los que el frontend necesita, se mapea cada `Alerta` a un diccionario con los 11 campos especificados. No se usa Pydantic response model para evitar un modelo nuevo que solo se usa aquí — un dict plano es más directo y consistente con el patrón del proyecto.
- **Límites:** `limit` con rango [1, 50], default 5. `offset` default 0. Si `limit` <= 0, usar default. Si `limit` > 50, cap a 50.

**Alternativa descartada:** Usar Pydantic `response_model` — crearía un modelo de respuesta que solo se usa en un endpoint, sin beneficio real ya que el frontend consume un dict plano.

### 2. Endpoint `/api/alerts/log`

**Enfoque:** Lectura de archivo con `asyncio.to_thread` para no bloquear el event loop.

- **Lectura:** `asyncio.to_thread` envolviendo una función que abre el archivo, lee todas las líneas y retorna las últimas 50. Esto evita instalar `aiofiles` como dependencia nueva.
- **Archivo inexistente:** Capturar `FileNotFoundError` y retornar array vacío (no error 500), según el contrato.
- **Permisos:** Capturar `PermissionError` y retornar array vacío con warning en log del servidor.
- **Ruta:** `settings.ALERTS_LOG_PATH` — nueva variable en `Settings`.

**Alternativa descartada:** `aiofiles` — dependencia innecesaria cuando `asyncio.to_thread` resuelve el problema sin instalar nada.

### 3. Configuración

- Agregar `ALERTS_LOG_PATH: str` a `Settings` en `backend/config.py` con valor por defecto `"logs/alerts.log"`.
- La variable se carga desde `.env` igual que las demás.

### 4. Modelo ORM

- El modelo `Alerta` en `backend/models/alerta.py` ya tiene todos los campos necesarios. No se modifica.
- El campo `source_ip` usa tipo `INET` de PostgreSQL — al serializar, SQLAlchemy lo retorna como string IP, que es directamente serializable a JSON.

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `backend/routers/alertas.py` | Reemplazar stubs con implementación real |
| `backend/config.py` | Agregar `ALERTS_LOG_PATH` a `Settings` |

## Archivos NO modificados

- `backend/models/alerta.py` — ya tiene los campos necesarios
- `backend/database.py` — ya expone `async_session_factory` y `Base`
- `backend/dependencies.py` — ya expone `usuario_actual`
- Cualquier archivo fuera de `backend/`

## Contratos de respuesta

### `GET /api/alerts/recent`

```json
{
  "items": [
    {
      "id": 1,
      "timestamp": "2026-08-18T10:30:00",
      "severity": "high",
      "category": "brute_force",
      "source_host": "attacker.example.com",
      "source_ip": "192.168.1.100",
      "target_host": "server.local",
      "event_count": 15,
      "description": "Múltiples intentos fallidos de SSH",
      "risk_score": 85,
      "risk_level": "critical"
    }
  ],
  "total": 42,
  "limit": 5,
  "offset": 0
}
```

### `GET /api/alerts/log`

```json
{
  "lineas": [
    "2026-08-18 10:30:00 [ALERT] Brute force detected from 192.168.1.100",
    "2026-08-18 10:30:05 [INFO] IP 192.168.1.100 added to jail"
  ]
}
```

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Archivo de log muy grande (>1GB) | Leer solo las últimas 50 líneas con `collections.deque(file, 50)` — no se carga el archivo completo en memoria |
| Tabla `alerts` sin índices para `timestamp` | Ya existe `idx_alerts_timestamp` definido en `schema.sql` |
| `source_ip` tipo INET serializado | SQLAlchemy lo retorna como string, compatible con JSON |
