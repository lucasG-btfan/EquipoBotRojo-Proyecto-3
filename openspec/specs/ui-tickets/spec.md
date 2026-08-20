## Purpose

Define el comportamiento observable de la sección "Tickets" del panel SIEM: cómo el operador consulta, pagina, filtra y lee en detalle los tickets de seguridad que genera automáticamente el sistema, sobre los datos paginados que entrega el backend.

## Requirements

### Requirement: Listado paginado de tickets

La sección MUST mostrar los tickets de la tabla `security_tickets` obtenidos desde `GET /api/tickets`, paginados con el contrato offset/limit del proyecto y con un tamaño de página no mayor a 50 filas. Cada fila MUST mostrar el número de ticket, el título, el estado, la prioridad, la categoría, la IP de origen, el puntaje de amenaza y la fecha de creación.

#### Scenario: Carga inicial del listado

- **WHEN** el operador navega a `/dashboard/tickets`
- **THEN** el sistema consulta `GET /api/tickets` con el `limit` configurado y `offset=0`
- **AND** muestra las filas recibidas con número, título, estado, prioridad, categoría, IP de origen, puntaje y fecha de creación

#### Scenario: Navegación entre páginas

- **WHEN** el operador avanza o retrocede de página
- **THEN** el sistema vuelve a consultar `GET /api/tickets` con el nuevo `offset` y el mismo `limit`
- **AND** el indicador de rango refleja las filas mostradas sobre el `total` informado por el backend

#### Scenario: Refresco manual

- **WHEN** el operador acciona el control de actualización de la sección
- **THEN** el sistema vuelve a consultar `GET /api/tickets` conservando la página y el filtro de estado vigentes

### Requirement: Orden de más recientes primero

El listado MUST presentar los tickets del más reciente al más antiguo por fecha de creación. La sección MUST NOT reordenar en el cliente los items que recibe: el orden lo garantiza el backend, y la sección MUST preservarlo tal como llega.

#### Scenario: Primer ticket de la primera página

- **WHEN** el operador abre la sección sin filtros
- **THEN** el primer ticket listado es el de `created_at` más reciente de la tabla

#### Scenario: Orden preservado al paginar

- **WHEN** el operador avanza a la página siguiente
- **THEN** los tickets mostrados son anteriores en el tiempo a los de la página previa

### Requirement: Filtro por estado

El listado MUST ofrecer un filtro por estado del ticket con una opción "todos" además de los estados conocidos del sistema. Cuando se selecciona un estado concreto, el sistema MUST enviarlo al backend en el query param `estado`; cuando se selecciona "todos", el sistema MUST omitir ese parámetro. Al cambiar el filtro, la paginación MUST reiniciarse a la primera página para evitar mostrar un rango inexistente.

#### Scenario: Filtrar por un estado concreto

- **WHEN** el operador selecciona el estado "Abiertos"
- **THEN** el sistema consulta `GET /api/tickets` con `estado=open`
- **AND** solo se listan tickets con ese estado

#### Scenario: Sin filtro de estado

- **WHEN** el operador selecciona "Todos"
- **THEN** el sistema consulta `GET /api/tickets` sin el parámetro `estado`

#### Scenario: Reinicio de paginación al filtrar

- **WHEN** el operador está en una página distinta de la primera y cambia el filtro de estado
- **THEN** el sistema consulta con `offset=0`
- **AND** el listado muestra la primera página del resultado filtrado

#### Scenario: Filtro sin resultados

- **WHEN** el filtro aplicado no coincide con ningún ticket
- **THEN** el sistema muestra un mensaje en español que indica que no hay tickets para el filtro aplicado
- **AND** el control de filtro sigue disponible para volver a "Todos"

### Requirement: Filtro por prioridad

El listado MUST ofrecer un filtro por prioridad del ticket con una opción "todas" además de las prioridades conocidas del sistema. Cuando se selecciona una prioridad concreta, el sistema MUST enviarla al backend en el query param `prioridad`; cuando se selecciona "todas", el sistema MUST omitir ese parámetro. Al cambiar el filtro, la paginación MUST reiniciarse a la primera página. El filtro por prioridad MUST poder combinarse con el filtro por estado, aplicándose ambos simultáneamente sobre el listado completo (no solo sobre la página actual).

#### Scenario: Filtrar por una prioridad concreta

- **WHEN** el operador selecciona la prioridad "Crítica"
- **THEN** el sistema consulta `GET /api/tickets` con `prioridad=critical`
- **AND** solo se listan tickets con esa prioridad

#### Scenario: Sin filtro de prioridad

- **WHEN** el operador selecciona "Todas"
- **THEN** el sistema consulta `GET /api/tickets` sin el parámetro `prioridad`

#### Scenario: Reinicio de paginación al filtrar por prioridad

- **WHEN** el operador está en una página distinta de la primera y cambia el filtro de prioridad
- **THEN** el sistema consulta con `offset=0`
- **AND** el listado muestra la primera página del resultado filtrado

#### Scenario: Combinación de filtros de estado y prioridad

- **WHEN** el operador tiene un estado y una prioridad seleccionados simultáneamente
- **THEN** el sistema consulta `GET /api/tickets` con ambos parámetros (`estado` y `prioridad`) a la vez
- **AND** solo se listan tickets que cumplen ambas condiciones

#### Scenario: Filtro de prioridad sin resultados

- **WHEN** el filtro de prioridad aplicado no coincide con ningún ticket
- **THEN** el sistema muestra un mensaje en español que indica que no hay tickets para el filtro aplicado

### Requirement: Presentación de estado y prioridad

El estado y la prioridad de cada ticket MUST distinguirse visualmente mediante etiquetas de color, no solo como texto plano. Como el esquema de la base de datos define ambos campos como texto libre, la sección MUST renderizar cualquier valor recibido: un valor no reconocido MUST mostrarse con su texto tal cual y una presentación neutra, sin romper la fila ni ocultar el ticket.

#### Scenario: Estado conocido

- **WHEN** un ticket llega con un estado conocido por el sistema
- **THEN** se muestra su etiqueta traducida al español con el color asociado a ese estado

#### Scenario: Estado desconocido

- **WHEN** un ticket llega con un estado que el sistema no tiene mapeado
- **THEN** se muestra el valor recibido tal cual con una presentación neutra
- **AND** la fila se renderiza completa como cualquier otra

#### Scenario: Prioridad ausente

- **WHEN** un ticket no tiene prioridad asignada
- **THEN** la celda de prioridad muestra un guion en lugar de un valor vacío

### Requirement: Detalle de un ticket

Cada fila MUST permitir consultar los campos que no entran en la tabla: descripción completa, responsable asignado, fecha de última actualización y referencia a la alerta que originó el ticket. El detalle MUST poder abrirse y cerrarse sin abandonar la página ni perder la posición de paginación.

#### Scenario: Abrir el detalle

- **WHEN** el operador acciona el control de detalle de una fila
- **THEN** se muestra la descripción completa del ticket junto con responsable, fecha de actualización y referencia de alerta
- **AND** el resto del listado permanece visible

#### Scenario: Cerrar el detalle

- **WHEN** el operador vuelve a accionar el control de detalle de la fila abierta
- **THEN** el detalle se oculta y el listado conserva la misma página

#### Scenario: Campos de detalle vacíos

- **WHEN** el ticket no tiene descripción, responsable o referencia de alerta
- **THEN** el detalle indica explícitamente la ausencia de ese dato en español, sin mostrar `null` ni un espacio en blanco

### Requirement: Formato de valores

Las fechas MUST mostrarse en formato local legible en español, nunca como cadena ISO cruda. Todo campo nulo o ausente MUST mostrarse como un guion o un texto explícito en español, nunca como `null`, `undefined` o vacío.

#### Scenario: Fecha de creación

- **WHEN** un ticket tiene fecha de creación
- **THEN** se muestra en formato local con día, mes, año y hora

#### Scenario: Campo nulo

- **WHEN** un ticket no tiene título, categoría, IP de origen o puntaje de amenaza
- **THEN** la celda correspondiente muestra un guion

### Requirement: Estados de carga, vacío y error

La sección MUST informar al operador en qué estado está la consulta. Durante la carga inicial MUST mostrar un indicador de progreso; con un resultado vacío MUST mostrar un mensaje en español; ante un fallo de la consulta MUST mostrar el mensaje de error en español que provee el backend, sin dejar la tabla en un estado ambiguo.

#### Scenario: Carga inicial en curso

- **WHEN** la primera consulta a `GET /api/tickets` todavía no respondió
- **THEN** se muestra un indicador de carga en lugar de las filas

#### Scenario: Sin tickets en el sistema

- **WHEN** el backend responde con `items` vacío y sin filtro aplicado
- **THEN** se muestra un mensaje en español indicando que no hay tickets para mostrar

#### Scenario: Error de conexión

- **WHEN** la consulta a `GET /api/tickets` falla
- **THEN** se muestra un mensaje de error en español dentro de la sección
- **AND** el operador puede reintentar con el control de actualización sin recargar la página

### Requirement: Acceso protegido a la sección

La sección MUST ser accesible solo con una sesión válida. Toda consulta al backend MUST viajar con el token de sesión; si el backend rechaza la sesión, el sistema MUST llevar al operador al inicio de sesión en lugar de mostrar un listado vacío o un error genérico.

#### Scenario: Operador sin sesión

- **WHEN** alguien navega a `/dashboard/tickets` sin sesión activa
- **THEN** el sistema lo redirige a la pantalla de inicio de sesión

#### Scenario: Sesión expirada durante la consulta

- **WHEN** `GET /api/tickets` responde `401`
- **THEN** el sistema descarta la sesión y lleva al operador a la pantalla de inicio de sesión

### Requirement: Sección de solo lectura

La sección MUST NOT ofrecer ninguna acción que modifique un ticket ni que actúe sobre el stack: no crea, no edita, no cierra ni reasigna tickets. Los tickets los genera el sistema automático de detección.

#### Scenario: Ausencia de acciones de escritura

- **WHEN** el operador recorre el listado y el detalle de un ticket
- **THEN** no se le ofrece ningún control que modifique el ticket ni que envíe datos al backend
