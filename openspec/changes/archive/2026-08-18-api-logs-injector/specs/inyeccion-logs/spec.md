# Spec delta: inyeccion-logs (CH07)

## Purpose

Define el comportamiento del backend al inyectar logs sintéticos de prueba en el stack SIEM: qué categorías existen y qué logs emite cada una, cómo se valida la categoría pedida, qué responde el endpoint, y cómo se comporta el sistema cuando el mecanismo de emisión no está disponible.

## ADDED Requirements

### Requirement: Catálogo cerrado de categorías de inyección

El sistema DEBE exponer exactamente diez categorías de inyección: `root_login`, `ssh_failed`, `access_denied`, `port_scan`, `iptables_drop`, `sudo_usage`, `kernel_oops`, `service_restart`, `paquete_completo` y `log_legitimo`. El catálogo DEBE estar definido del lado del servidor y NO DEBE poder ampliarse ni alterarse desde la petición. Cada categoría DEBE tener una cantidad fija y conocida de logs a emitir, un host de origen lógico y un mensaje predefinido.

#### Scenario: Cantidades por categoría

- **WHEN** se inyecta una categoría individual
- **THEN** el sistema emite la cantidad de logs definida para esa categoría: `root_login` 2, `ssh_failed` 12, `access_denied` 7, `port_scan` 2, `iptables_drop` 6, `sudo_usage` 2, `kernel_oops` 1, `service_restart` 2, `log_legitimo` 1

#### Scenario: Paquete completo

- **WHEN** se inyecta la categoría `paquete_completo`
- **THEN** el sistema emite la combinación de todas las categorías individuales
- **AND** la cantidad total reportada es la suma de las cantidades individuales

#### Scenario: Consulta del catálogo

- **WHEN** el operador autenticado consulta el endpoint de catálogo de categorías
- **THEN** el sistema retorna `200` con la lista de categorías disponibles
- **AND** cada elemento incluye la clave de la categoría, una etiqueta legible en español y la cantidad de logs que emite
- **AND** el frontend puede construir su selector sin conocer el catálogo de antemano

### Requirement: Inyección de logs por categoría

El sistema DEBE exponer `POST /api/logs/inject`, que recibe un cuerpo `{ "categoria": "<clave>" }` y emite los logs de esa categoría dentro del stack. Los logs DEBEN emitirse hacia el colector syslog del stack usando el mecanismo estándar de syslog, de modo que atraviesen la misma cadena de detección que un log real. La respuesta DEBE ser `200` con un mensaje en español que indique la cantidad de logs inyectados y la categoría.

#### Scenario: Inyección exitosa de una categoría individual

- **WHEN** el operador autenticado envía `POST /api/logs/inject` con `{ "categoria": "root_login" }` y el mecanismo de emisión está disponible
- **THEN** el sistema emite 2 logs correspondientes a esa categoría
- **AND** retorna `200` con un mensaje en español que reporta la cantidad inyectada y la categoría

#### Scenario: Inyección exitosa del paquete completo

- **WHEN** el operador autenticado envía `POST /api/logs/inject` con `{ "categoria": "paquete_completo" }`
- **THEN** el sistema emite todos los logs de todas las categorías individuales
- **AND** retorna `200` reportando la cantidad total inyectada

#### Scenario: Los logs emitidos llegan al colector del stack

- **WHEN** una inyección se completa correctamente
- **THEN** los logs quedan disponibles para la cadena normal de detección del stack, sin requerir ninguna acción adicional del operador

### Requirement: Rechazo de categorías inválidas

El sistema DEBE rechazar cualquier categoría que no pertenezca al catálogo, sin emitir ningún log. El rechazo DEBE devolver `400` con un mensaje de error en español.

#### Scenario: Categoría desconocida

- **WHEN** el operador autenticado envía `POST /api/logs/inject` con una categoría que no está en el catálogo
- **THEN** el sistema retorna `400`
- **AND** el cuerpo incluye un mensaje en español que indica que la categoría es inválida y enumera las categorías válidas
- **AND** no se emite ningún log

#### Scenario: Cuerpo ausente o mal formado

- **WHEN** la petición no incluye el campo `categoria` o el cuerpo no es válido
- **THEN** el sistema rechaza la petición con un error de validación
- **AND** no se emite ningún log

### Requirement: Los comandos emitidos no se construyen a partir de entrada del cliente

El contenido de cada log, su etiqueta, su prioridad syslog y el destino de emisión DEBEN provenir exclusivamente de constantes del servidor o de variables de entorno. El sistema NO DEBE interpolar ningún valor recibido del cliente dentro del comando ejecutado, ni ejecutar el comando a través de un shell.

#### Scenario: Intento de inyección de comando

- **WHEN** el cliente envía en `categoria` un valor que contiene metacaracteres de shell o texto arbitrario
- **THEN** el sistema lo trata únicamente como una clave de catálogo desconocida y retorna `400`
- **AND** no se ejecuta ningún comando derivado de ese valor

### Requirement: Cada categoría emite desde su host de origen

Cada categoría DEBE emitir sus logs desde el host de origen que le corresponde: `web-server` para `root_login`, `ssh_failed`, `access_denied` y `log_legitimo`; `firewall` para `port_scan` e `iptables_drop`; `db-server` para `sudo_usage`, `kernel_oops` y `service_restart`. El log emitido DEBE llevar ese host como origen en su cabecera, de modo que la alerta resultante quede registrada con el `source_host` correcto.

#### Scenario: Origen de un log de web-server

- **WHEN** se inyecta la categoría `ssh_failed`
- **THEN** los logs emitidos identifican `web-server` como host de origen

#### Scenario: Origen de un log de firewall

- **WHEN** se inyecta la categoría `port_scan`
- **THEN** los logs emitidos identifican `firewall` como host de origen

#### Scenario: Paquete completo abarca los tres orígenes

- **WHEN** se inyecta la categoría `paquete_completo`
- **THEN** los logs emitidos provienen de los tres hosts de origen según la categoría a la que pertenece cada uno

### Requirement: Los hosts emisores son una precondición, no algo que el sistema provisione

El sistema NO DEBE crear, arrancar, modificar ni eliminar ningún contenedor. Los hosts emisores son preparados por el operador antes de usar el inyector. Antes de emitir, el sistema DEBE verificar que los emisores requeridos por la categoría estén disponibles: que existan, estén en ejecución, compartan entorno de red con el colector syslog y sean capaces de emitir en el formato requerido.

#### Scenario: Emisores disponibles

- **WHEN** el operador preparó los emisores requeridos y solicita una inyección
- **THEN** el sistema los usa tal como están y la inyección se completa correctamente
- **AND** el sistema no altera de ninguna forma esos contenedores

#### Scenario: Verificación previa a cualquier emisión

- **WHEN** una categoría requiere varios hosts emisores y uno de ellos no está disponible
- **THEN** el sistema falla antes de emitir el primer log
- **AND** no se emite ningún log parcial desde los emisores que sí estaban disponibles

### Requirement: Diagnóstico accionable ante emisor no disponible

Cuando un emisor requerido no está disponible, el sistema DEBE retornar `503` con un mensaje en español que identifique el emisor faltante, distinga la causa concreta e incluya el comando literal que el operador debe ejecutar para resolverla. Un mensaje genérico no satisface este requisito.

#### Scenario: Emisor inexistente o detenido

- **WHEN** el host emisor requerido no existe o no está en ejecución
- **THEN** el sistema retorna `503`
- **AND** el mensaje nombra el emisor faltante e incluye el comando para crearlo, en la red del stack y con el hostname correcto

#### Scenario: Emisor sin capacidad de emisión

- **WHEN** el host emisor existe y corre, pero no dispone de la herramienta de emisión con el formato requerido
- **THEN** el sistema retorna `503`
- **AND** el mensaje distingue esta causa de la de emisor inexistente e incluye el comando para instalar la herramienta

#### Scenario: Emisor fuera de la red del colector

- **WHEN** el host emisor existe y corre, pero no comparte entorno de red con el colector syslog
- **THEN** el sistema retorna `503` antes de emitir
- **AND** el mensaje incluye el comando para conectarlo a la red correcta
- **AND** el sistema no emite logs que se perderían silenciosamente

#### Scenario: Disponibilidad reportada en el catálogo

- **WHEN** el operador autenticado consulta el catálogo de categorías
- **THEN** cada categoría informa si su host emisor está disponible
- **AND** el frontend puede advertirlo antes de que el operador intente inyectar

### Requirement: Comportamiento ante demonio de contenedores no disponible

Si el demonio de contenedores no responde, el sistema DEBE retornar `503` con un mensaje descriptivo en español, en lugar de fallar con un error genérico.

#### Scenario: Demonio de contenedores caído

- **WHEN** el operador solicita una inyección y el demonio de contenedores no responde
- **THEN** el sistema retorna `503`
- **AND** el cuerpo incluye un mensaje en español que indica que no se pudo contactar al demonio

#### Scenario: Fallo parcial durante una inyección múltiple

- **WHEN** una categoría requiere varios logs y la emisión falla a mitad de camino
- **THEN** el sistema retorna `503`
- **AND** el mensaje en español informa cuántos logs alcanzaron a emitirse antes del fallo

### Requirement: Endpoints protegidos por sesión

Ambos endpoints de inyección DEBEN requerir un token de sesión válido, igual que el resto de las rutas del backend salvo `/api/auth/login`.

#### Scenario: Petición sin token

- **WHEN** se llama a `POST /api/logs/inject` sin token de sesión válido
- **THEN** el sistema rechaza la petición
- **AND** no se emite ningún log

#### Scenario: Consulta de catálogo sin token

- **WHEN** se consulta el catálogo de categorías sin token de sesión válido
- **THEN** el sistema rechaza la petición

### Requirement: Configuración del emisor por variables de entorno

El host del colector syslog y su puerto DEBEN ser configurables por variables de entorno, con valores por defecto funcionales para el stack actual. NO DEBEN quedar hardcodeados en el código del endpoint ni del servicio. El entorno de red que se usa para verificar los emisores DEBE resolverse dinámicamente a partir del colector syslog, nunca por un nombre fijo.

#### Scenario: Configuración por defecto

- **WHEN** no se definen las variables de entorno correspondientes
- **THEN** el sistema usa los valores por defecto del stack y la inyección funciona sin configuración adicional

#### Scenario: Configuración sobreescrita

- **WHEN** se define otro contenedor emisor o otro destino syslog por variable de entorno
- **THEN** el sistema usa esos valores sin requerir cambios de código
