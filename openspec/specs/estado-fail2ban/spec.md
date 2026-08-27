# Spec: estado-fail2ban (CH11)

## Purpose

Define el comportamiento del backend al exponer el estado de la jail de Fail2ban del stack SIEM: qué jail se reporta, con qué forma de respuesta, y cómo se comporta el sistema cuando Fail2ban o el contenedor que lo aloja no responden.

## Requirements

### Requirement: Estado de la jail de Fail2ban

El sistema DEBE exponer `GET /api/fail2ban/jail`, que retorna el estado actual de la jail de Fail2ban configurada. La respuesta DEBE incluir el nombre de la jail, la cantidad de IPs actualmente baneadas y la lista de esas IPs. El nombre de la jail y el del contenedor que aloja Fail2ban DEBEN provenir de configuración por variables de entorno y NO DEBEN estar embebidos en el código del endpoint. El endpoint DEBE requerir un token de sesión válido.

#### Scenario: Jail con IPs baneadas

- **WHEN** el operador autenticado consulta `GET /api/fail2ban/jail` y Fail2ban responde con IPs baneadas
- **THEN** el sistema retorna `200` con `jail`, `baneadas` e `ips`
- **AND** `jail` es el nombre de la jail consultada
- **AND** `ips` contiene una entrada por cada IP actualmente baneada
- **AND** `baneadas` coincide con la cantidad de elementos de `ips`

#### Scenario: Jail sin IPs baneadas

- **WHEN** la jail existe y no tiene ninguna IP baneada en este momento
- **THEN** el sistema retorna `200` con `baneadas` en `0` y `ips` como lista vacía
- **AND** NO retorna error

#### Scenario: Petición sin token

- **WHEN** se consulta el endpoint sin token de sesión válido
- **THEN** el sistema rechaza la petición y no consulta a Fail2ban

### Requirement: Lectura del estado sin efectos secundarios

La consulta del estado de la jail DEBE ser de solo lectura: NO DEBE banear, desbanear, recargar ni alterar de ninguna forma la configuración o el estado de Fail2ban, ni modificar el contenedor que lo aloja.

#### Scenario: Consultas repetidas por polling

- **WHEN** el frontend consulta el endpoint de forma repetida por polling
- **THEN** el estado de la jail permanece sin cambios producto de la consulta
- **AND** cada respuesta refleja el estado vigente en el momento de consultar, sin caché

### Requirement: Degradación ante Fail2ban no disponible

Cuando no se puede obtener el estado de la jail, el sistema DEBE retornar `503` con un mensaje descriptivo en español que permita distinguir la causa. NO DEBE retornar `200` con datos vacíos ni propagar una excepción sin capturar.

#### Scenario: Contenedor de Fail2ban detenido o inexistente

- **WHEN** el contenedor que aloja Fail2ban no está en ejecución o no existe
- **THEN** el sistema retorna `503`
- **AND** el cuerpo incluye un mensaje en español que indica que Fail2ban no está disponible

#### Scenario: Demonio Docker no responde

- **WHEN** no se puede contactar al demonio Docker para consultar Fail2ban
- **THEN** el sistema retorna `503`
- **AND** el cuerpo incluye un mensaje en español que indica que no se pudo contactar al demonio Docker

#### Scenario: La jail configurada no existe

- **WHEN** Fail2ban responde que la jail configurada no existe
- **THEN** el sistema retorna `503`
- **AND** el cuerpo incluye un mensaje en español que nombra la jail consultada

#### Scenario: Fail2ban tarda más de lo aceptable

- **WHEN** la consulta a Fail2ban supera el tiempo máximo de espera definido
- **THEN** el sistema corta la espera y retorna `503`
- **AND** NO deja la petición colgada indefinidamente

### Requirement: Interpretación de la salida de Fail2ban

El sistema DEBE interpretar la salida textual de Fail2ban de forma tolerante al formato: espacios adicionales, saltos de línea y separadores entre IPs no DEBEN producir entradas vacías ni IPs mal formadas en la respuesta.

#### Scenario: Salida con espacios y separadores irregulares

- **WHEN** la salida de Fail2ban separa las IPs con espacios múltiples o líneas adicionales
- **THEN** el sistema retorna la lista de IPs sin elementos vacíos ni espacios sobrantes

#### Scenario: Salida no reconocible

- **WHEN** la salida de Fail2ban no tiene el formato esperado y no permite extraer el estado
- **THEN** el sistema retorna `503`
- **AND** el cuerpo incluye un mensaje en español que indica que no se pudo interpretar la respuesta de Fail2ban
