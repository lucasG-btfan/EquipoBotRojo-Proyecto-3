# Consulta de tickets de seguridad

## Purpose

Define el comportamiento del endpoint de consulta paginada de tickets de seguridad: cómo se filtra, ordena y pagina la información de la tabla `security_tickets`, y qué formato de respuesta se espera.

## Requirements

### Requirement: Consulta paginada de tickets

El sistema DEBE exponer `GET /api/tickets` que retorna una lista paginada de tickets de seguridad ordenada por fecha de creación descendente (más recientes primero). La respuesta DEBE seguir el formato estándar de paginación: `{ "items": [...], "total": N, "limit": N, "offset": N }`.

#### Scenario: Consulta básica sin filtros

- **WHEN** el operador autenticado envía `GET /api/tickets?limit=15&offset=0`
- **THEN** el sistema retorna `200` con los primeros 15 tickets ordenados por `created_at` DESC
- **AND** el campo `total` indica la cantidad total de tickets en la tabla

#### Scenario: Paginación con offset

- **WHEN** el operador autenticado envía `GET /api/tickets?limit=5&offset=10`
- **THEN** el sistema retorna los items 11 a 15
- **AND** el campo `total` se mantiene igual al de la consulta sin offset

### Requirement: Filtro opcional por estado

El sistema DEBE permitir filtrar tickets por su campo `status` mediante el query param `estado`. Cuando se provee `estado`, el conteo total DEBE reflejar solo los tickets que coinciden con ese estado.

#### Scenario: Filtro por estado específico

- **WHEN** el operador autenticado envía `GET /api/tickets?estado=open`
- **THEN** el sistema retorna solo tickets con `status = "open"`
- **AND** el campo `total` indica la cantidad de tickets con ese estado

#### Scenario: Sin resultados para el estado pedido

- **WHEN** el operador autenticado envía `GET /api/tickets?estado=nonexistent`
- **THEN** el sistema retorna `200` con `items` vacío y `total: 0`

### Requirement: Formato de cada ticket

Cada item de la respuesta DEBE contener los campos: `id`, `ticket_number`, `title`, `description`, `status`, `priority`, `category`, `source_ip`, `threat_score`, `assigned_to`, `created_at`, `updated_at`, `alert_reference`.

### Requirement: Autenticación requerida

Todas las peticiones a `GET /api/tickets` DEBEN incluir un token de sesión válido en el header `Authorization: Bearer {token}`.

#### Scenario: Petición sin token

- **WHEN** se llama a `GET /api/tickets` sin header de autorización
- **THEN** el sistema rechaza la petición con `401`

### Requirement: Límites de paginación

Los parámetros `limit` y `offset` DEBEN ser enteros no negativos. `limit` DEBE estar entre 1 y 100. Valores fuera de rango DEBEN ser rechazados con error de validación.

#### Scenario: Límite fuera de rango

- **WHEN** el operador envía `limit=0` o `limit=200`
- **THEN** el sistema rechaza la petición con error de validación

### Requirement: Manejo de errores

Ante errores inesperados, el sistema DEBE retornar `500` con un mensaje descriptivo en español.

#### Scenario: Error de conexión a la base de datos

- **WHEN** la base de datos no está disponible
- **THEN** el sistema retorna `500` con un mensaje en español que indica el error
