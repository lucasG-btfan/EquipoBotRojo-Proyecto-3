## Purpose

Define el comportamiento observable de la sección "Gestión de IPs" del panel SIEM: cómo el operador consulta las IPs bloqueadas, las desbloquea manualmente, explora los patrones de ataque acumulados y revisa las métricas del sistema, todo sobre datos paginados provenientes del backend.

## ADDED Requirements

### Requirement: Listado de IPs bloqueadas

La sección MUST mostrar las IPs de la tabla `blocked_ips` obtenidas desde `GET /api/ips/blocked`, paginadas con el contrato offset/limit del proyecto y con un tamaño de página no mayor a 50 filas. Cada fila MUST mostrar la IP, el puntaje de amenaza, el motivo, la fecha de bloqueo, la fecha de expiración y el estado activo/inactivo. El estado MUST distinguirse visualmente entre "Activa" e "Inactiva".

#### Scenario: Carga inicial del listado

- **WHEN** el operador navega a `/dashboard/ips`
- **THEN** el sistema consulta `GET /api/ips/blocked` con el `limit` configurado y `offset=0`
- **AND** muestra las filas recibidas con IP, puntaje, motivo, fecha de bloqueo, fecha de expiración y estado

#### Scenario: Navegación entre páginas

- **WHEN** el operador avanza o retrocede de página
- **THEN** el sistema vuelve a consultar `GET /api/ips/blocked` con el nuevo `offset`
- **AND** el indicador de rango refleja las filas mostradas sobre el `total` informado por el backend

#### Scenario: Valores nulos

- **WHEN** una IP no tiene `threat_score`, `reason` o `blocked_until`
- **THEN** la celda correspondiente muestra un guion en lugar de un valor vacío o `null`

#### Scenario: Listado vacío

- **WHEN** el backend responde con `items` vacío
- **THEN** se muestra un mensaje indicando que no hay IPs para mostrar

#### Scenario: Error de conexión

- **WHEN** la consulta a `GET /api/ips/blocked` falla
- **THEN** se muestra un mensaje de error en español dentro del bloque de IPs bloqueadas
- **AND** los demás bloques de la página siguen funcionando

### Requirement: Filtro por estado de las IPs bloqueadas

El listado de IPs bloqueadas MUST ofrecer un filtro por estado con tres opciones: activas, inactivas y todas. Al cambiar el filtro, la paginación MUST reiniciarse a la primera página para evitar mostrar un rango inexistente.

#### Scenario: Filtrar solo activas

- **WHEN** el operador selecciona el filtro "Activas"
- **THEN** el sistema consulta `GET /api/ips/blocked` con `activo=true`
- **AND** solo se listan IPs con estado activo

#### Scenario: Filtrar solo inactivas

- **WHEN** el operador selecciona el filtro "Inactivas"
- **THEN** el sistema consulta `GET /api/ips/blocked` con `activo=false`

#### Scenario: Sin filtro

- **WHEN** el operador selecciona "Todas"
- **THEN** el sistema consulta `GET /api/ips/blocked` sin el parámetro `activo`

#### Scenario: Reinicio de paginación al filtrar

- **WHEN** el operador está en una página distinta de la primera y cambia el filtro de estado
- **THEN** la consulta se hace con `offset=0`

### Requirement: Desbloqueo manual de una IP

Cada fila con estado activo MUST ofrecer una acción de desbloqueo que invoque `POST /api/ips/{ip}/unblock`. Por ser una acción destructiva sobre el stack real, MUST requerir una confirmación explícita del operador antes de ejecutarse. Las filas inactivas MUST NOT ofrecer la acción.

#### Scenario: Confirmación previa

- **WHEN** el operador acciona el botón de desbloqueo de una fila activa
- **THEN** la acción no se envía todavía
- **AND** se le presenta una confirmación explícita para esa IP, con opción de cancelar

#### Scenario: Desbloqueo exitoso

- **WHEN** el operador confirma el desbloqueo de una IP
- **THEN** el sistema envía `POST /api/ips/{ip}/unblock`
- **AND** la fila muestra estado de carga y su acción queda deshabilitada mientras dura la petición
- **AND** al recibir respuesta exitosa se muestra un mensaje de éxito en español
- **AND** el listado de IPs bloqueadas se vuelve a consultar para reflejar el nuevo estado

#### Scenario: Cancelación

- **WHEN** el operador cancela la confirmación
- **THEN** no se envía ninguna petición al backend
- **AND** la fila vuelve a su estado normal

#### Scenario: Error del backend al desbloquear

- **WHEN** la petición de desbloqueo falla (IP no baneada, formato inválido, timeout o error del stack)
- **THEN** se muestra el mensaje de error en español devuelto por el backend
- **AND** el listado no se altera
- **AND** la acción vuelve a estar disponible

#### Scenario: Fila inactiva

- **WHEN** una IP tiene estado inactivo
- **THEN** no se ofrece la acción de desbloqueo para esa fila

### Requirement: Listado de patrones de ataque

La sección MUST mostrar los registros de `attack_patterns` obtenidos desde `GET /api/ips/attack-patterns`, paginados con offset/limit y un tamaño de página no mayor a 50 filas. Cada fila MUST mostrar la categoría del patrón, la IP de origen, el host objetivo, la primera y la última aparición, la cantidad de ocurrencias y si la IP ya fue bloqueada.

#### Scenario: Carga inicial del listado

- **WHEN** el operador navega a `/dashboard/ips`
- **THEN** el sistema consulta `GET /api/ips/attack-patterns` con el `limit` configurado y `offset=0`
- **AND** muestra las filas recibidas ordenadas según las devuelve el backend (última aparición descendente)

#### Scenario: Indicador de bloqueo

- **WHEN** un patrón tiene `is_blocked` en verdadero
- **THEN** la fila lo indica visualmente como bloqueado
- **AND** si es falso, lo indica como no bloqueado

#### Scenario: Listado vacío

- **WHEN** el backend responde con `items` vacío
- **THEN** se muestra un mensaje indicando que no hay patrones para mostrar

#### Scenario: Error de conexión

- **WHEN** la consulta a `GET /api/ips/attack-patterns` falla
- **THEN** se muestra un mensaje de error en español dentro del bloque de patrones de ataque

### Requirement: Filtros de patrones de ataque por IP y categoría

El listado de patrones de ataque MUST ofrecer un filtro por IP de origen y un filtro por categoría. Ambos MUST enviarse al backend como parámetros de consulta (`ip` y `categoria`), MUST poder usarse en forma independiente o combinada, y MUST reiniciar la paginación a la primera página al cambiar.

#### Scenario: Filtro por IP

- **WHEN** el operador ingresa una IP de origen en el filtro
- **THEN** el sistema consulta `GET /api/ips/attack-patterns` con el parámetro `ip` y `offset=0`
- **AND** solo se listan los patrones de esa IP

#### Scenario: Filtro por categoría

- **WHEN** el operador ingresa una categoría en el filtro
- **THEN** el sistema consulta `GET /api/ips/attack-patterns` con el parámetro `categoria` y `offset=0`

#### Scenario: Filtros combinados

- **WHEN** el operador tiene cargados ambos filtros
- **THEN** ambos parámetros se envían en la misma consulta

#### Scenario: Filtro vacío

- **WHEN** el operador borra el contenido de un filtro
- **THEN** ese parámetro deja de enviarse al backend
- **AND** el listado vuelve a incluir todas las categorías o IPs según corresponda

#### Scenario: Consulta diferida mientras se escribe

- **WHEN** el operador escribe varios caracteres seguidos en un filtro de texto
- **THEN** el sistema no consulta el backend en cada pulsación
- **AND** consulta una sola vez cuando el operador deja de escribir

#### Scenario: Sin resultados para el filtro

- **WHEN** el filtro aplicado no devuelve coincidencias
- **THEN** se muestra un mensaje indicando que no hay patrones para el filtro aplicado

### Requirement: Tabla de métricas del sistema con actualización periódica

La sección MUST mostrar los registros de `system_metrics` obtenidos desde `GET /api/metrics/system`, paginados con offset/limit. Cada fila MUST mostrar la marca de tiempo, el host, el nombre de la métrica, su valor y su unidad. La tabla MUST actualizarse periódicamente mediante polling por intervalo, usando la constante global de intervalos del frontend, y MUST NOT usar WebSockets ni Server-Sent Events.

#### Scenario: Carga inicial

- **WHEN** el operador navega a `/dashboard/ips`
- **THEN** el sistema consulta `GET /api/metrics/system` con el `limit` configurado y `offset=0`
- **AND** muestra las filas con marca de tiempo, host, nombre de métrica, valor y unidad

#### Scenario: Actualización periódica

- **WHEN** la tabla de métricas está visible
- **THEN** el sistema vuelve a consultar el endpoint cada 10 segundos
- **AND** no se muestra el indicador de carga en cada refresco, solo en la carga inicial

#### Scenario: Refresco conservando la página

- **WHEN** el operador está en una página distinta de la primera y ocurre un refresco periódico
- **THEN** la consulta se hace con el `offset` actual
- **AND** la posición de paginación del operador no se pierde

#### Scenario: Métrica sin unidad o sin valor

- **WHEN** una métrica no tiene `unit` o `metric_value`
- **THEN** la celda correspondiente muestra un guion

#### Scenario: Error de conexión

- **WHEN** la consulta a `GET /api/metrics/system` falla
- **THEN** se muestra un mensaje de error en español dentro del bloque de métricas
- **AND** el polling continúa reintentando

### Requirement: Página "Gestión de IPs" y su ruta

La ruta `/dashboard/ips` MUST renderizar la página real de gestión de IPs en lugar del placeholder de sección en construcción. La página MUST presentar los tres bloques (IPs bloqueadas, patrones de ataque y métricas del sistema) con títulos identificables y MUST aislar los errores de cada bloque.

#### Scenario: Navegación desde el sidebar

- **WHEN** el operador hace click en "Gestión de IPs" en el sidebar
- **THEN** se renderiza la página con sus tres bloques
- **AND** no se muestra el placeholder de "En construcción"

#### Scenario: Aislamiento de errores

- **WHEN** uno de los tres bloques falla al cargar
- **THEN** el error se muestra solo en ese bloque
- **AND** los otros dos siguen mostrando sus datos

#### Scenario: Acceso sin sesión

- **WHEN** un visitante sin JWT válido intenta acceder a `/dashboard/ips`
- **THEN** es redirigido al login, igual que el resto del área protegida
