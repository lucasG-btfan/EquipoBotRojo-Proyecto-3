## ADDED Requirements

### Requirement: Visor de alerts.log con polling

El componente `LogViewer` MUST mostrar las últimas 50 líneas del archivo `alerts.log` obtenidas desde `GET /api/alerts/log`. MUST actualizar automáticamente cada 3 segundos usando el hook `usePolling` con la constante `INTERVALOS_POLLING.ALERTAS_LOG`. Las líneas MUST renderizarse en un contenedor scrollable con fuente monoespaciada.

#### Scenario: Carga inicial exitosa

- **WHEN** el operador navega a la sección "Logs y detección"
- **THEN** el sistema consulta `GET /api/alerts/log`
- **AND** muestra las líneas recibidas en un contenedor con `overflow-y-auto` y fuente monoespaciada

#### Scenario: Actualización periódica

- **WHEN** el log viewer está activo
- **THEN** el sistema consulta `GET /api/alerts/log` cada 3 segundos
- **AND** las líneas se actualizan sin recargar la página
- **AND** no se muestra spinner de carga en cada refresco (solo en la carga inicial)

#### Scenario: Auto-scroll al fondo

- **WHEN** el operador está al fondo del contenedor de scroll (dentro de 50px del final)
- **AND** llegan nuevas líneas
- **THEN** el contenedor hace scroll automático al final

#### Scenario: Preservación de posición del scroll

- **WHEN** el operador scrolleó hacia arriba para revisar líneas anteriores
- **AND** llegan nuevas líneas
- **THEN** la posición del scroll se mantiene donde el operador la dejó

#### Scenario: Error de conexión

- **WHEN** la consulta a `GET /api/alerts/log` falla
- **THEN** el componente muestra un mensaje de error en español debajo del título
- **AND** el polling continúa intentando reconectar

#### Scenario: Archivo de log vacío

- **WHEN** el endpoint retorna un array vacío de líneas
- **THEN** el componente muestra el mensaje "No hay líneas de log disponibles."

### Requirement: Botones de ejecución de workflows

La sección MUST exponer dos botones: "Ejecutar workflow principal" (`POST /api/workflows/main/run`) y "Ejecutar métricas Prometheus" (`POST /api/workflows/metrics/run`). Cada botón MUST tener estado de carga independiente y feedback de éxito/error.

#### Scenario: Ejecución exitosa del workflow principal

- **WHEN** el operador hace click en "Ejecutar workflow principal"
- **THEN** el sistema envía `POST /api/workflows/main/run`
- **AND** el botón muestra un spinner y se deshabilita durante la petición
- **AND** el otro botón también se deshabilita
- **AND** al recibir respuesta exitosa, se muestra un mensaje de éxito con el `execution_id`
- **AND** el mensaje de éxito se oculta automáticamente después de 3 segundos

#### Scenario: Ejecución exitosa del workflow de métricas

- **WHEN** el operador hace click en "Ejecutar métricas Prometheus"
- **THEN** el sistema envía `POST /api/workflows/metrics/run`
- **AND** se aplican las mismas reglas de feedback que el workflow principal

#### Scenario: Error en la ejecución

- **WHEN** la petición de ejecución falla
- **THEN** se muestra un mensaje de error en español debajo de los botones
- **AND** los botones se vuelven habilitados
- **AND** el mensaje de error persiste hasta la próxima ejecución

#### Scenario: Deshabilitación durante carga

- **WHEN** cualquiera de los dos botones está en proceso de ejecución
- **THEN** ambos botones se muestran deshabilitados
- **AND** solo el botón activo muestra el spinner

### Requirement: Inyector de logs de prueba

El componente `InyectorLogs` MUST cargar el catálogo de categorías desde `GET /api/logs/inject/categorias` una vez al montar. MUST mostrar un selector con las categorías disponibles y un botón para inyectar. Las categorías con `emisor_disponible: false` MUST mostrarse deshabilitadas.

#### Scenario: Carga del catálogo

- **WHEN** el componente se monta
- **THEN** consulta `GET /api/logs/inject/categorias` una sola vez
- **AND** renderiza un `<select>` con cada categoría mostrando su `etiqueta` legible
- **AND** cada opción incluye la cantidad de logs que emitirá

#### Scenario: Categoría con emisor no disponible

- **WHEN** una categoría tiene `emisor_disponible: false`
- **THEN** la opción en el selector se muestra deshabilitada
- **AND** se indica visualmente que el emisor no está disponible

#### Scenario: Inyección exitosa

- **WHEN** el operador selecciona una categoría habilitada y hace click en "Inyectar"
- **THEN** el sistema envía `POST /api/logs/inject` con `{ "categoria": "<clave>" }`
- **AND** el botón muestra un spinner y se deshabilita durante la petición
- **AND** al recibir respuesta exitosa, se muestra un mensaje de éxito con el contenido del `mensaje`
- **AND** el mensaje se oculta automáticamente después de 3 segundos

#### Scenario: Inyección con categoría inválida

- **WHEN** el endpoint retorna error 400 (categoría inválida)
- **THEN** se muestra el mensaje de error del backend en español

#### Scenario: Botón deshabilitado sin selección

- **WHEN** no hay categoría seleccionada o la categoría seleccionada tiene `emisor_disponible: false`
- **THEN** el botón "Inyectar" se muestra deshabilitado

### Requirement: Historial de ejecuciones de workflows

El componente `HistorialWorkflows` MUST mostrar las últimas ejecuciones de workflows consultando `GET /api/workflows/runs?limit=10` con polling de 3 segundos. MUST presentar una tabla con ID, inicio, fin, estado y duración.

#### Scenario: Carga del historial

- **WHEN** el componente se monta
- **THEN** consulta `GET /api/workflows/runs?limit=10`
- **AND** renderiza una tabla con las ejecuciones recibidas

#### Scenario: Formato de estado

- **WHEN** una ejecución tiene `status` igual a `"Éxito"` o `"éxito"` o `"success"`
- **THEN** se muestra un Badge verde con texto "Éxito"
- **AND** si el estado es `"Error"` o `"error"` o `"failed"`, se muestra un Badge rojo
- **AND** para cualquier otro estado, se muestra un Badge neutro

#### Scenario: Formato de duración

- **WHEN** una ejecución tiene `duracion_segundos` con valor numérico
- **THEN** se muestra formateada: menos de 60 segundos como "Xs", 60 o más como "Xm Ys"
- **AND** si `duracion_segundos` es null, se muestra "—"

#### Scenario: Formato de timestamps

- **WHEN** una ejecución tiene `startedAt` o `stoppedAt`
- **THEN** se formatean con `toLocaleString('es-AR')` en formato día/mes/año hora:minuto:segundo
- **AND** si el valor es null, se muestra "—"

#### Scenario: Tabla vacía

- **WHEN** no hay ejecuciones registradas
- **THEN** se muestra el mensaje "No hay ejecuciones registradas."

#### Scenario: Actualización periódica

- **WHEN** el historial está visible
- **THEN** se actualiza cada 3 segundos sin mostrar spinner en cada refresco

### Requirement: Página orquestadora `LogsDeteccionPage`

El componente `LogsDeteccionPage` MUST orquestar los 4 sub-componentes en una vista coherente. MUST seguir la estructura visual de las demás páginas del dashboard (título h1, secciones con h2, grid responsive).

#### Scenario: Layout de la página

- **WHEN** el operador navega a `/dashboard/logs`
- **THEN** se muestra un título "Logs y detección"
- **AND** el visor de logs ocupa la parte superior (ancho completo)
- **AND** los botones de workflow y el inyector de logs se muestran en una fila de 2 columnas debajo del visor
- **AND** el historial de workflows ocupa la parte inferior (ancho completo)

#### Scenario: Errores parciales

- **WHEN** uno de los sub-componentes tiene error de carga
- **THEN** el error se muestra solo en la sección correspondiente
- **AND** las demás secciones funcionan normalmente

### Requirement: Routing actualizado

La ruta `/dashboard/logs` MUST renderizar `<LogsDeteccionPage />` en lugar de `<Placeholder titulo="Logs y detección" />`.

#### Scenario: Navegación a la sección

- **WHEN** el operador hace click en "Logs y detección" en el sidebar
- **THEN** se renderiza la página completa con sus 4 secciones
- **AND** no se muestra el placeholder de "En construcción"
