# Spec delta: consultas-alertas (CH06)

## Purpose

Define el comportamiento de los endpoints de alertas del backend SIEM: la consulta paginada de alertas almacenadas en PostgreSQL y la lectura de las últimas líneas del archivo de log `alerts.log`. Estos endpoints son consumidos por el frontend para las secciones "Dashboard" y "Logs y detección".

## ADDED Requirements

### Requirement: Consulta paginada de alertas desde PostgreSQL (SHALL)

El endpoint `GET /api/alerts/recent` DEBE retornar las alertas almacenadas en la tabla `alerts`, ordenadas por `timestamp` en orden descendente (más recientes primero). DEBE soportar paginación mediante query params `limit` y `offset`. DEBE requerir autenticación JWT válida.

#### Scenario: Consulta exitosa con parámetros por defecto

- **WHEN** el operador autenticado consulta `GET /api/alerts/recent` sin query params
- **THEN** el sistema retorna HTTP 200
- **AND** la respuesta contiene `items` (array), `total` (entero), `limit` (entero, default 5), `offset` (entero, default 0)
- **AND** `items` contiene como máximo 5 alertas
- **AND** las alertas están ordenadas por `timestamp` descendente

#### Scenario: Consulta con paginación personalizada

- **WHEN** el operador consulta `GET /api/alerts/recent?limit=10&offset=5`
- **THEN** el sistema retorna HTTP 200
- **AND** `items` contiene como máximo 10 alertas
- **AND** `offset` salta las primeras 5 alertas
- **AND** `total` refleja el cantidad total de alertas en la tabla

#### Scenario: Tabla sin alertas

- **WHEN** la tabla `alerts` está vacía
- **THEN** el sistema retorna HTTP 200
- **AND** `items` es un array vacío
- **AND** `total` es 0

#### Scenario: Límites fuera de rango

- **WHEN** el operador envía `limit` con valor 0 o negativo
- **THEN** el sistema utiliza el valor por defecto (5)

- **WHEN** el operador envía `limit` con valor mayor a 100
- **THEN** el sistema limita el valor a 50

#### Scenario: Sin token de autenticación

- **WHEN** se consulta el endpoint sin header `Authorization` válido
- **THEN** el sistema retorna HTTP 401

#### Scenario: Error de conexión a la base de datos

- **WHEN** la conexión a PostgreSQL falla o la tabla no es accesible
- **THEN** el sistema retorna HTTP 500
- **AND** el cuerpo incluye un mensaje descriptivo en español

### Requirement: Campos retornados por alertas (SHALL)

Cada objeto de alerta en `items` DEBE contener exclusivamente los campos: `id`, `timestamp`, `severity`, `category`, `source_host`, `source_ip`, `target_host`, `event_count`, `description`, `risk_score`, `risk_level`. NO DEBE retornar campos como `raw_log`, `status`, `assigned_to`, `notes`, `resolved_at`, `threat_reputation` ni `threat_intel`.

#### Scenario: Alerta con campos completos en la base de datos

- **WHEN** una alerta en la tabla tiene todos los campos poblados
- **THEN** la respuesta incluye solo los campos especificados
- **AND** los campos excluidos no aparecen en el JSON de respuesta

### Requirement: Lectura del archivo de log de alertas (SHALL)

El endpoint `GET /api/alerts/log` DEBE leer las últimas 50 líneas del archivo de log cuya ruta se define en la variable de entorno `ALERTS_LOG_PATH`. DEBE requerir autenticación JWT válida.

#### Scenario: Archivo de log existe y tiene contenido

- **WHEN** el operador autenticado consulta `GET /api/alerts/log`
- **AND** el archivo en `ALERTS_LOG_PATH` existe y tiene al menos 1 línea
- **THEN** el sistema retorna HTTP 200
- **AND** la respuesta contiene `lineas` (array de strings)
- **AND** `lineas` contiene las últimas 50 líneas del archivo (o menos si el archivo tiene menos de 50 líneas)

#### Scenario: Archivo de log no existe

- **WHEN** el operador consulta `GET /api/alerts/log`
- **AND** el archivo en `ALERTS_LOG_PATH` no existe
- **THEN** el sistema retorna HTTP 200
- **AND** `lineas` es un array vacío
- **AND** NO se retorna error 500

#### Scenario: Archivo de log vacío

- **WHEN** el archivo en `ALERTS_LOG_PATH` existe pero está vacío
- **THEN** el sistema retorna HTTP 200
- **AND** `lineas` es un array vacío

#### Scenario: Sin token de autenticación

- **WHEN** se consulta el endpoint sin header `Authorization` válido
- **THEN** el sistema retorna HTTP 401

#### Scenario: Error de permisos al leer el archivo

- **WHEN** el backend no tiene permisos de lectura sobre el archivo de log
- **THEN** el sistema retorna HTTP 200
- **AND** `lineas` es un array vacío
- **AND** se registra un warning en los logs del servidor

### Requirement: Ruta del log configurable (MUST)

La ruta del archivo de log DEBE estar definida exclusivamente en la variable de entorno `ALERTS_LOG_PATH`, con un valor por defecto razonable. NO DEBE contener rutas hardcodeadas en el código del endpoint.

#### Scenario: Variable de entorno configurada

- **WHEN** `ALERTS_LOG_PATH` está definida en el entorno
- **THEN** el endpoint lee el archivo en esa ruta exacta

#### Scenario: Variable de entorno no configurada

- **WHEN** `ALERTS_LOG_PATH` no está definida
- **THEN** el endpoint utiliza la ruta por defecto definida en `Settings`

### Requirement: Manejo de errores en español (SHALL)

Todo endpoint de esta capacidad DEBE capturar sus excepciones de forma explícita y responder con un mensaje de error redactado en español. NO DEBE dejarse propagar una excepción sin capturar.

#### Scenario: Error inesperado durante la consulta

- **WHEN** ocurre un error no previsto al procesar la consulta o la lectura
- **THEN** el sistema retorna un error HTTP con un mensaje en español
- **AND** no expone una traza de excepción sin procesar al cliente
