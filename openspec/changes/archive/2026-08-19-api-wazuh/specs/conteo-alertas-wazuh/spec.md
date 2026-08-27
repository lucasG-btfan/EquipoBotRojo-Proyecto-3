## Purpose

Define el comportamiento del backend al exponer la cantidad de alertas nativas de Wazuh (FIM, integridad, rootcheck) del stack SIEM: qué se cuenta, con qué forma de respuesta, qué autenticación se exige y cómo degrada el sistema cuando Wazuh no está disponible o rechaza las credenciales.

## ADDED Requirements

### Requirement: Conteo de alertas nativas de Wazuh

El sistema DEBE exponer `GET /api/wazuh/alerts/count`, que retorna la cantidad total de alertas generadas nativamente por Wazuh. La respuesta DEBE incluir el total como número entero y un mensaje en español que identifique el origen de esas alertas, de forma que el operador pueda distinguirlas de las alertas que llegan al dashboard por el pipeline de n8n. El endpoint DEBE requerir un token de sesión válido.

#### Scenario: Wazuh reporta alertas existentes

- **WHEN** el operador autenticado consulta `GET /api/wazuh/alerts/count` y Wazuh responde con alertas registradas
- **THEN** el sistema retorna `200` con `total` y `mensaje`
- **AND** `total` es un entero mayor o igual a cero que refleja la cantidad reportada por Wazuh
- **AND** `mensaje` indica en español que se trata de alertas nativas de Wazuh

#### Scenario: Wazuh sin alertas registradas

- **WHEN** Wazuh responde correctamente pero no tiene ninguna alerta registrada
- **THEN** el sistema retorna `200` con `total` en `0`
- **AND** NO retorna error

#### Scenario: Petición sin token

- **WHEN** se consulta el endpoint sin token de sesión válido
- **THEN** el sistema rechaza la petición y no consulta a Wazuh

### Requirement: Consulta de solo lectura y sin transferencia innecesaria

La consulta del conteo DEBE ser de solo lectura sobre Wazuh: NO DEBE crear, modificar ni eliminar alertas, agentes, reglas ni configuración. Además, la consulta DEBE obtener el total sin descargar el detalle completo de las alertas, para que el costo de la consulta no crezca con el volumen acumulado del stack.

#### Scenario: Consultas repetidas por polling

- **WHEN** el frontend consulta el endpoint de forma repetida por polling
- **THEN** el estado de Wazuh permanece sin cambios producto de la consulta
- **AND** cada respuesta refleja el conteo vigente al momento de consultar, sin caché

#### Scenario: Stack con gran volumen de alertas acumuladas

- **WHEN** Wazuh tiene una cantidad muy elevada de alertas registradas
- **THEN** el sistema obtiene el total sin transferir el detalle de todas las alertas
- **AND** el tiempo de respuesta no se degrada proporcionalmente al volumen acumulado

### Requirement: Configuración de la conexión con Wazuh por entorno

La URL del servicio de Wazuh, el usuario, la contraseña y la política de verificación del certificado TLS DEBEN provenir de variables de entorno y NO DEBEN estar embebidos en el código. El sistema DEBE poder operar contra un Wazuh con certificado autofirmado sin requerir cambios de código. Las credenciales NO DEBEN aparecer en las respuestas del endpoint ni en los mensajes de error devueltos al cliente.

#### Scenario: Wazuh con certificado autofirmado

- **WHEN** el entorno indica que no se verifica el certificado TLS y Wazuh presenta un certificado autofirmado
- **THEN** el sistema completa la consulta y retorna el conteo
- **AND** NO falla por validación de certificado

#### Scenario: Verificación de certificado activada y certificado inválido

- **WHEN** el entorno indica que sí se verifica el certificado TLS y Wazuh presenta un certificado no confiable
- **THEN** el sistema retorna `503`
- **AND** el cuerpo incluye un mensaje en español que indica un problema de certificado TLS con Wazuh

#### Scenario: Credenciales no filtradas

- **WHEN** cualquier consulta al endpoint termina en éxito o en error
- **THEN** ni la respuesta ni el mensaje de error contienen la contraseña de Wazuh

### Requirement: Degradación ante Wazuh no disponible

Cuando no se puede obtener el conteo de alertas, el sistema DEBE retornar `503` con un mensaje descriptivo en español que permita distinguir la causa. NO DEBE retornar `200` con datos vacíos o inventados, ni propagar una excepción sin capturar.

#### Scenario: Wazuh inalcanzable

- **WHEN** no se puede establecer conexión con el servicio de Wazuh
- **THEN** el sistema retorna `503`
- **AND** el cuerpo incluye un mensaje en español que indica que no se pudo conectar con Wazuh e identifica la URL configurada

#### Scenario: Credenciales inválidas

- **WHEN** Wazuh rechaza las credenciales configuradas
- **THEN** el sistema retorna `503`
- **AND** el cuerpo incluye un mensaje en español que indica que las credenciales de Wazuh fueron rechazadas
- **AND** el mensaje NO incluye la contraseña

#### Scenario: Wazuh tarda más de lo aceptable

- **WHEN** la consulta a Wazuh supera el tiempo máximo de espera definido
- **THEN** el sistema corta la espera y retorna `503`
- **AND** NO deja la petición colgada indefinidamente

#### Scenario: Respuesta de Wazuh no interpretable

- **WHEN** Wazuh responde con un cuerpo cuyo formato no permite extraer el total de alertas
- **THEN** el sistema retorna `503`
- **AND** el cuerpo incluye un mensaje en español que indica que no se pudo interpretar la respuesta de Wazuh

#### Scenario: Wazuh responde con error del servidor

- **WHEN** Wazuh responde con un código de error distinto de credenciales inválidas
- **THEN** el sistema retorna `503`
- **AND** el cuerpo incluye un mensaje en español que menciona el código con el que respondió Wazuh
