## Purpose

Define el comportamiento observable de la sección "Wazuh" del panel SIEM: cómo el operador consulta el total de alertas nativas de Wazuh (FIM, integridad de archivos) como card principal, cómo se diferencia de las alertas procesadas por el pipeline de n8n, y cómo la vista se mantiene actualizada por polling mientras permanece abierta, con estados de carga y error en español y acceso protegido por sesión.

## ADDED Requirements

### Requirement: Contador de alertas nativas como card principal

La sección MUST mostrar el total de alertas nativas de Wazuh como elemento principal de la vista: una card con el número en tamaño grande y legible, acompañado del mensaje de origen en español que provee el backend. El número MUST formatearse con separador de miles según el formato local (`es-AR`) y MUST NOT mostrarse nunca como `null`, `undefined` ni vacío. Un total de cero MUST presentarse como valor válido, sin tratamiento de error.

#### Scenario: Conteo disponible

- **WHEN** el operador navega a `/dashboard/wazuh` con sesión activa y el backend responde con `total` y `mensaje`
- **THEN** la card muestra el total en grande, formateado con separador de miles local
- **AND** el mensaje del backend aparece como subtítulo de la card

#### Scenario: Cero alertas nativas

- **WHEN** el backend responde con `total` igual a `0`
- **THEN** la vista muestra `0` como valor válido
- **AND** NO muestra un estado de error ni omite el número

#### Scenario: Conteo elevado

- **WHEN** el backend responde con un total de cuatro o más cifras
- **THEN** el número se muestra con separador de miles (por ejemplo `1.234`), no como cifra cruda

### Requirement: Diferenciación frente a las alertas de n8n

La vista MUST incluir una nota aclaratoria permanente que indique en español que las alertas de seguridad procesadas por el pipeline de n8n NO se muestran en esta sección y que se consultan en las secciones Dashboard y Tickets. La nota MUST permanecer visible tanto con datos cargados como ante un error de consulta, para que el operador no confunda la ausencia de alertas nativas con la ausencia de alertas en el sistema.

#### Scenario: Nota visible con datos

- **WHEN** el contador muestra un total cargado correctamente
- **THEN** la nota sobre las alertas de n8n es visible en la misma vista

#### Scenario: Nota visible ante error

- **WHEN** la consulta al backend falla y se muestra el mensaje de error
- **THEN** la nota sobre las alertas de n8n sigue siendo visible

### Requirement: Actualización periódica y manual

La sección MUST refrescar el conteo periódicamente mientras permanece abierta, consultando `GET /api/wazuh/alerts/count` cada 10 segundos. El intervalo MUST provenir de la constante compartida de polling del proyecto y MUST NOT estar escrito dentro del componente. La sección MUST ofrecer además un control de refresco manual. El refresco periódico MUST NOT hacer parpadear la vista con el indicador de carga inicial. Al salir de la sección, el sistema MUST dejar de consultar el endpoint.

#### Scenario: Refresco periódico

- **WHEN** el operador permanece en la sección
- **THEN** el sistema vuelve a consultar `GET /api/wazuh/alerts/count` cada 10 segundos
- **AND** el contador refleja el nuevo valor sin recargar la página ni parpadear

#### Scenario: Refresco manual

- **WHEN** el operador acciona el control de actualización
- **THEN** el sistema consulta `GET /api/wazuh/alerts/count` de inmediato

#### Scenario: Salida de la sección

- **WHEN** el operador navega fuera de `/dashboard/wazuh`
- **THEN** el sistema deja de consultar el endpoint

### Requirement: Estados de carga y error

Durante la carga inicial la sección MUST mostrar un indicador de progreso en lugar del número. Ante un fallo sin dato previo, MUST mostrar el mensaje de error en español que provee el backend junto con un control para reintentar sin recargar la página. Ante un fallo con dato previo, MUST mantener visible el último total conocido indicando de forma explícita que la última consulta falló — MUST NOT presentar un dato desactualizado como si fuera actual. Cuando una consulta posterior tiene éxito, el mensaje de error MUST desaparecer y el contador MUST actualizarse.

#### Scenario: Carga inicial en curso

- **WHEN** la primera consulta a `GET /api/wazuh/alerts/count` todavía no respondió
- **THEN** se muestra un indicador de carga en lugar del número

#### Scenario: Wazuh no disponible sin dato previo

- **WHEN** la consulta falla y no hay ningún total conocido en la sesión de la vista
- **THEN** se muestra el mensaje de error en español dentro de la sección
- **AND** el operador puede reintentar sin recargar la página

#### Scenario: Fallo con dato previo visible

- **WHEN** una consulta falla después de haberse cargado un total correctamente
- **THEN** el último total conocido permanece visible
- **AND** se indica en español que la última consulta falló

#### Scenario: Recuperación tras un error

- **WHEN** una consulta posterior vuelve a responder correctamente
- **THEN** el mensaje de error desaparece y el contador muestra el valor actualizado

### Requirement: Acceso protegido a la sección

La sección MUST ser accesible solo con una sesión válida, y MUST alcanzarse desde la entrada "Wazuh" de la navegación lateral en la ruta `/dashboard/wazuh`. Toda consulta al backend MUST viajar con el token de sesión; si el backend rechaza la sesión, el sistema MUST llevar al operador al inicio de sesión en lugar de mostrar la vista vacía o un error genérico.

#### Scenario: Operador sin sesión

- **WHEN** alguien navega a `/dashboard/wazuh` sin sesión activa
- **THEN** el sistema lo redirige a la pantalla de inicio de sesión

#### Scenario: Sesión expirada durante la consulta

- **WHEN** `GET /api/wazuh/alerts/count` responde `401`
- **THEN** el sistema descarta la sesión y lleva al operador a la pantalla de inicio de sesión

#### Scenario: Navegación desde el menú lateral

- **WHEN** el operador acciona la entrada "Wazuh" del menú lateral con sesión activa
- **THEN** se muestra la sección con el contador real, no un contenido de marcador de posición

### Requirement: Sección de solo lectura

La sección MUST NOT ofrecer ninguna acción que modifique el estado de Wazuh ni del stack: no reconoce, no silencia, no crea ni elimina alertas ni agentes. La única acción disponible sobre el backend MUST ser volver a leer el conteo.

#### Scenario: Ausencia de acciones de escritura

- **WHEN** el operador recorre la sección
- **THEN** no se le ofrece ningún control que modifique Wazuh ni que envíe datos de escritura al backend
