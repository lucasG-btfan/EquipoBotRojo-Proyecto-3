## Purpose

Define el comportamiento observable de la sección "Prometheus" del panel SIEM: cómo el operador consulta el estado de las 3 alertas de detección del sistema, con qué semántica visual se distingue una alerta disparada de una pendiente o inactiva, y cómo la vista se mantiene actualizada mientras permanece abierta.

## ADDED Requirements

### Requirement: Las tres alertas siempre visibles

La sección MUST mostrar siempre una tarjeta por cada una de las 3 alertas del sistema (`IpBaneadaDetectada`, `Fail2banCaido`, `AtaqueMasivo`), en ese orden fijo, sin importar cuáles devuelva Prometheus. Cada tarjeta MUST mostrar el nombre de la alerta y su descripción en español tal como los entrega el backend. La sección MUST NOT ocultar una alerta por estar inactiva ni por no estar configurada: la ausencia de una alerta es en sí misma información de diagnóstico para el operador.

#### Scenario: Las tres alertas presentes en Prometheus

- **WHEN** el operador navega a `/dashboard/prometheus` y el backend responde con las 3 alertas
- **THEN** se muestran 3 tarjetas, cada una con el nombre y la descripción de su alerta

#### Scenario: Alerta no configurada en Prometheus

- **WHEN** el backend informa una alerta con estado `no_configurada`
- **THEN** su tarjeta se muestra igualmente, indicando en español que la alerta no está configurada en Prometheus
- **AND** la tarjeta se distingue visualmente de una alerta inactiva

#### Scenario: Alerta desconocida en la respuesta

- **WHEN** el backend devuelve una alerta cuyo nombre no es ninguno de los 3 esperados
- **THEN** la sección la muestra igualmente con el nombre recibido, después de las 3 conocidas, sin romper la vista

### Requirement: Semántica de color por estado

El estado de cada alerta MUST comunicarse con un color semántico además del texto, nunca solo como texto plano: disparada (`firing`) en rojo, pendiente (`pending`) en amarillo, inactiva (`inactive`) en verde, y cualquier otro valor —incluido `no_configurada`— con una presentación neutra. El texto del estado MUST mostrarse en español. Un estado que el sistema no tiene mapeado MUST renderizarse con su valor tal cual y presentación neutra, sin ocultar la tarjeta.

#### Scenario: Alerta disparada

- **WHEN** una alerta llega con estado `firing`
- **THEN** su tarjeta muestra el estado en español con la variante roja de peligro

#### Scenario: Alerta pendiente

- **WHEN** una alerta llega con estado `pending`
- **THEN** su tarjeta muestra el estado en español con la variante amarilla de advertencia

#### Scenario: Alerta inactiva

- **WHEN** una alerta llega con estado `inactive`
- **THEN** su tarjeta muestra el estado en español con la variante verde de éxito

#### Scenario: Estado no reconocido

- **WHEN** una alerta llega con un estado que el sistema no tiene mapeado
- **THEN** se muestra el valor recibido tal cual con presentación neutra

### Requirement: Valor actual de la métrica asociada

Cuando el backend provee una métrica asociada a una alerta, la tarjeta MUST mostrar su valor actual junto al estado. Para las alertas relacionadas con Fail2ban, el valor proviene del bloque `fail2ban` de la respuesta (`banned_ips` para la alerta de IP baneada, `up` para la alerta de Fail2ban caído). Para una alerta sin métrica asociada, o cuando la métrica llega nula, la tarjeta MUST indicarlo explícitamente en español o con un guion, y MUST NOT mostrar `null`, `undefined` ni un espacio en blanco.

#### Scenario: Métrica disponible

- **WHEN** el backend informa `fail2ban.banned_ips` con un valor numérico
- **THEN** la tarjeta de la alerta de IP baneada muestra ese valor como su valor actual

#### Scenario: Métrica de disponibilidad

- **WHEN** el backend informa `fail2ban.up`
- **THEN** la tarjeta de la alerta de Fail2ban caído muestra ese valor traducido a una lectura legible en español, no como número crudo sin contexto

#### Scenario: Métrica nula

- **WHEN** el backend informa una métrica como `null`
- **THEN** la tarjeta muestra un guion o un texto en español que indica que el valor no está disponible

#### Scenario: Alerta sin métrica asociada

- **WHEN** la alerta no tiene ninguna métrica asociada en la respuesta del backend
- **THEN** la tarjeta omite el valor actual o lo muestra como no disponible, sin inventar un número

### Requirement: Tiempo en estado disparado

Cuando una alerta está disparada, la tarjeta MUST informar hace cuánto lo está. Como el backend no entrega el instante de activación, la sección MUST medir el tiempo desde la primera lectura en la que observó esa alerta en estado `firing` dentro de la sesión de la vista, y MUST indicar al operador que se trata de tiempo observado y no del inicio real de la alerta. El contador MUST reiniciarse cuando la alerta deja de estar disparada y vuelve a dispararse.

#### Scenario: Alerta recién observada como disparada

- **WHEN** una alerta pasa a estado `firing` en una lectura
- **THEN** la tarjeta comienza a mostrar el tiempo transcurrido desde esa lectura, aclarando que es tiempo observado

#### Scenario: Alerta que sigue disparada

- **WHEN** sucesivas lecturas mantienen la alerta en `firing`
- **THEN** el tiempo mostrado crece de forma monótona sin reiniciarse

#### Scenario: Alerta que se apaga

- **WHEN** una alerta disparada pasa a `inactive` o `pending`
- **THEN** la tarjeta deja de mostrar el tiempo activo

#### Scenario: Alerta que vuelve a dispararse

- **WHEN** una alerta que se había apagado vuelve a estado `firing`
- **THEN** el tiempo mostrado se cuenta desde esta nueva activación observada, no desde la anterior

#### Scenario: Alerta no disparada

- **WHEN** una alerta está en `inactive`, `pending` o `no_configurada`
- **THEN** la tarjeta no muestra ningún tiempo activo

### Requirement: Actualización periódica y manual

La sección MUST refrescar el estado de las alertas de forma periódica mientras permanece abierta, consultando `GET /api/prometheus/alerts` cada 30 segundos. El intervalo MUST provenir de la constante de polling compartida del proyecto y MUST NOT estar escrito dentro del componente. La sección MUST ofrecer además un control de refresco manual, y MUST mostrar la marca temporal de la última actualización en formato local legible en español, nunca como cadena ISO cruda. El refresco periódico MUST NOT hacer parpadear la vista con el indicador de carga inicial.

#### Scenario: Refresco periódico

- **WHEN** el operador permanece en la sección
- **THEN** el sistema vuelve a consultar `GET /api/prometheus/alerts` cada 30 segundos
- **AND** las tarjetas reflejan el nuevo estado sin recargar la página

#### Scenario: Refresco manual

- **WHEN** el operador acciona el control de actualización
- **THEN** el sistema consulta `GET /api/prometheus/alerts` de inmediato

#### Scenario: Marca de última actualización

- **WHEN** la consulta responde correctamente
- **THEN** la sección muestra la fecha y hora de la última actualización en formato local

#### Scenario: Salida de la sección

- **WHEN** el operador navega fuera de `/dashboard/prometheus`
- **THEN** el sistema deja de consultar el endpoint

### Requirement: Estados de carga y error

La sección MUST informar en qué estado está la consulta. Durante la carga inicial MUST mostrar un indicador de progreso en lugar de las tarjetas. Ante un fallo MUST mostrar el mensaje de error en español que provee el backend —diferenciando la indisponibilidad de Prometheus del timeout y de una respuesta inesperada— y MUST permitir reintentar sin recargar la página. La sección MUST NOT quedar en un estado ambiguo ni mostrar tarjetas con datos obsoletos como si fueran actuales.

#### Scenario: Carga inicial en curso

- **WHEN** la primera consulta a `GET /api/prometheus/alerts` todavía no respondió
- **THEN** se muestra un indicador de carga en lugar de las tarjetas

#### Scenario: Prometheus no accesible

- **WHEN** `GET /api/prometheus/alerts` responde con error de conexión, timeout o respuesta inesperada
- **THEN** se muestra el mensaje de error en español dentro de la sección
- **AND** el operador puede reintentar con el control de actualización

#### Scenario: Recuperación tras un error

- **WHEN** una consulta posterior vuelve a responder correctamente
- **THEN** el mensaje de error desaparece y se muestran las tarjetas actualizadas

### Requirement: Acceso protegido a la sección

La sección MUST ser accesible solo con una sesión válida, y MUST alcanzarse desde la entrada "Prometheus" de la navegación lateral en la ruta `/dashboard/prometheus`. Toda consulta al backend MUST viajar con el token de sesión; si el backend rechaza la sesión, el sistema MUST llevar al operador al inicio de sesión en lugar de mostrar tarjetas vacías o un error genérico.

#### Scenario: Operador sin sesión

- **WHEN** alguien navega a `/dashboard/prometheus` sin sesión activa
- **THEN** el sistema lo redirige a la pantalla de inicio de sesión

#### Scenario: Sesión expirada durante la consulta

- **WHEN** `GET /api/prometheus/alerts` responde `401`
- **THEN** el sistema descarta la sesión y lleva al operador a la pantalla de inicio de sesión

#### Scenario: Navegación desde el menú lateral

- **WHEN** el operador acciona la entrada "Prometheus" del menú lateral con sesión activa
- **THEN** se muestra la sección con las tarjetas de alertas, no un contenido de marcador de posición

### Requirement: Sección de solo lectura

La sección MUST NOT ofrecer ninguna acción que modifique el estado de Prometheus ni del stack: no silencia, no reconoce, no crea ni edita alertas. La única acción disponible sobre el backend MUST ser volver a leer el estado.

#### Scenario: Ausencia de acciones de escritura

- **WHEN** el operador recorre las tarjetas de la sección
- **THEN** no se le ofrece ningún control que modifique una alerta ni que envíe datos al backend
