# Spec: estado-contenedores

## Purpose

Define el comportamiento del backend al exponer el estado operativo y el consumo de recursos de los contenedores del stack SIEM: qué contenedores se reportan, con qué forma de respuesta, y cómo se comporta el sistema cuando el demonio Docker no responde o responde parcialmente.

## Requirements

### Requirement: Estado de contenedores del stack

El sistema DEBE exponer `GET /api/status/containers`, que retorna el estado operativo de cada contenedor relevante del stack SIEM. La respuesta DEBE ser una lista de objetos con al menos `nombre` y `estado`. La lista de contenedores relevantes DEBE estar definida como constante del servicio y NO DEBE estar embebida en el endpoint. El endpoint DEBE requerir un token de sesión válido.

#### Scenario: Docker responde con contenedores en ejecución

- **WHEN** el operador autenticado consulta `GET /api/status/containers` y el demonio Docker responde
- **THEN** el sistema retorna `200` con una lista de contenedores
- **AND** cada elemento incluye `nombre` y `estado` (por ejemplo `running`, `exited`)

#### Scenario: Contenedor del stack ausente

- **WHEN** un contenedor de la lista de relevantes no existe en el demonio Docker
- **THEN** el sistema igualmente lo incluye en la respuesta con estado `no_encontrado`
- **AND** no interrumpe el resto de la respuesta

#### Scenario: Contenedores ajenos al stack

- **WHEN** el demonio Docker tiene contenedores que no pertenecen al stack SIEM
- **THEN** el sistema NO los incluye en la respuesta

#### Scenario: Docker no responde

- **WHEN** el demonio Docker no está disponible o la conexión falla
- **THEN** el sistema retorna `503`
- **AND** el cuerpo incluye un mensaje descriptivo en español que indica que no se pudo contactar al demonio Docker

#### Scenario: Petición sin token

- **WHEN** se consulta el endpoint sin token de sesión válido
- **THEN** el sistema rechaza la petición y no consulta a Docker

### Requirement: Consumo de recursos por contenedor

El sistema DEBE exponer `GET /api/status/resources`, que retorna el consumo de CPU y memoria de cada contenedor en ejecución. Cada elemento DEBE incluir `nombre`, el porcentaje de CPU y la memoria usada en megabytes. El endpoint DEBE requerir un token de sesión válido.

#### Scenario: Stats disponibles

- **WHEN** el operador autenticado consulta `GET /api/status/resources` y Docker entrega las estadísticas
- **THEN** el sistema retorna `200` con una lista de contenedores
- **AND** cada elemento incluye `nombre`, `cpu_porcentaje` y `ram_mb`

#### Scenario: Contenedor detenido

- **WHEN** un contenedor del stack no está en ejecución
- **THEN** el sistema NO consulta sus estadísticas
- **AND** lo omite de la respuesta de recursos

### Requirement: Tolerancia a fallos en la consulta de recursos

La consulta de recursos DEBE aplicar un timeout corto de 5 segundos y DEBE degradarse de forma parcial: si algunos contenedores no responden dentro del plazo, el sistema DEBE retornar los datos que sí obtuvo en lugar de fallar por completo.

#### Scenario: Respuesta parcial por timeout

- **WHEN** algunos contenedores no entregan sus estadísticas dentro de los 5 segundos
- **THEN** el sistema retorna `200` con los contenedores que sí respondieron
- **AND** omite los que no respondieron sin propagar el error

#### Scenario: Ningún contenedor responde

- **WHEN** el demonio Docker no está disponible para ninguna consulta de estadísticas
- **THEN** el sistema retorna `503` con un mensaje descriptivo en español

### Requirement: Configuración del acceso a Docker por entorno

El sistema DEBE determinar cómo contactar al demonio Docker exclusivamente a partir de la variable de entorno `DOCKER_HOST`, admitiendo tanto un socket Unix como un endpoint TCP. NO DEBE contener rutas de socket ni direcciones IP embebidas en el código.

#### Scenario: DOCKER_HOST apunta a un socket Unix

- **WHEN** `DOCKER_HOST` tiene la forma `unix:///ruta/al/docker.sock`
- **THEN** el sistema contacta al demonio a través de ese socket

#### Scenario: DOCKER_HOST apunta a un endpoint TCP

- **WHEN** `DOCKER_HOST` tiene la forma `tcp://host:puerto`
- **THEN** el sistema contacta al demonio por HTTP contra ese host y puerto

#### Scenario: DOCKER_HOST con formato no soportado

- **WHEN** `DOCKER_HOST` tiene un formato que el sistema no reconoce
- **THEN** el sistema responde `503` con un mensaje en español que indica que la configuración de acceso a Docker es inválida

### Requirement: Manejo de errores en español

Todo endpoint de esta capacidad DEBE capturar sus excepciones de forma explícita y responder con un mensaje de error redactado en español. NO DEBE dejarse propagar una excepción sin capturar.

#### Scenario: Error inesperado durante la consulta

- **WHEN** ocurre un error no previsto al procesar la respuesta de Docker
- **THEN** el sistema retorna un error HTTP con un mensaje en español
- **AND** no expone una traza de excepción sin procesar al cliente
