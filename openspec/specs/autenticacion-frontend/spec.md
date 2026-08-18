# Spec delta: autenticacion-frontend (CH03)

## Purpose

Define el comportamiento de la sesión del dashboard SIEM en el navegador: cómo el operador inicia sesión con usuario y contraseña, cómo se persiste y se usa el token de sesión, cómo se cierra la sesión y bajo qué condiciones el acceso a las secciones del dashboard queda bloqueado.

## ADDED Requirements

### Requirement: Pantalla de acceso

El sistema DEBE presentar en la ruta `/login` un formulario con los campos usuario y contraseña, y un control de envío. El campo de contraseña DEBE ocultar el texto ingresado. El formulario DEBE poder enviarse tanto con el control de envío como con la tecla Enter. Los textos visibles DEBEN estar en español.

#### Scenario: Formulario visible sin sesión activa
- **WHEN** una persona sin sesión activa navega a `/login`
- **THEN** se muestra el formulario con los campos usuario y contraseña
- **AND** la contraseña se muestra enmascarada

#### Scenario: Envío con campos vacíos
- **WHEN** la persona intenta enviar el formulario con usuario o contraseña vacíos
- **THEN** el sistema NO envía la petición al backend
- **AND** informa en español que ambos campos son obligatorios

#### Scenario: Acceso a /login con sesión activa
- **WHEN** una persona con sesión activa navega a `/login`
- **THEN** el sistema la redirige a `/dashboard/inicio` sin mostrar el formulario

### Requirement: Autenticación contra el backend

El sistema DEBE delegar la validación de credenciales exclusivamente en el backend, enviando usuario y contraseña a `POST /api/auth/login`. El frontend NO DEBE comparar credenciales localmente ni contener credenciales embebidas.

#### Scenario: Credenciales válidas
- **WHEN** la persona envía credenciales que el backend acepta
- **THEN** el sistema recibe el token de acceso emitido por el backend
- **AND** deja la sesión activa
- **AND** redirige a `/dashboard/inicio`

#### Scenario: Credenciales inválidas
- **WHEN** el backend responde que las credenciales son inválidas
- **THEN** el sistema muestra un mensaje de error en español en la misma pantalla de login
- **AND** la sesión permanece inactiva
- **AND** la persona permanece en `/login` sin que la página se recargue

#### Scenario: Backend inalcanzable
- **WHEN** la petición de login falla por error de red o de servidor
- **THEN** el sistema muestra un mensaje de error en español distinguible de "credenciales inválidas"
- **AND** la sesión permanece inactiva

#### Scenario: Petición en curso
- **WHEN** la petición de login está en curso
- **THEN** el control de envío queda deshabilitado y se indica visualmente el estado de carga
- **AND** no se emite una segunda petición de login simultánea

### Requirement: Confidencialidad de las credenciales

El sistema NO DEBE persistir la contraseña ingresada ni registrarla en consola, almacenamiento local, URL o cualquier otro medio observable. La contraseña SOLO puede existir en el estado del formulario durante la sesión de la pantalla y en el cuerpo de la petición de login.

#### Scenario: Tras un login exitoso
- **WHEN** el login finaliza con éxito
- **THEN** el único dato de sesión persistido es el token emitido por el backend
- **AND** no queda rastro persistido del usuario ni de la contraseña ingresados

### Requirement: Persistencia de la sesión

El sistema DEBE persistir el token de sesión en el almacenamiento local del navegador bajo una única clave conocida, y NO DEBE usar cookies para este fin. Al cargar la aplicación, el sistema DEBE recuperar el token persistido antes del primer renderizado del árbol de rutas.

#### Scenario: Recarga de página con sesión activa
- **WHEN** la persona recarga el navegador teniendo un token persistido
- **THEN** la sesión sigue activa
- **AND** la sección del dashboard solicitada se muestra sin pasar por `/login`

#### Scenario: Sin token persistido
- **WHEN** la aplicación carga y no hay token persistido
- **THEN** la sesión se considera inactiva

### Requirement: Uso del token en las peticiones al backend

El sistema DEBE adjuntar el token de sesión como credencial de portador en toda petición al backend mientras la sesión esté activa.

#### Scenario: Petición autenticada
- **WHEN** la aplicación consulta cualquier endpoint del backend con sesión activa
- **THEN** la petición incluye el token de sesión como credencial de portador

#### Scenario: Token rechazado por el backend
- **WHEN** una petición a un endpoint protegido es rechazada por token inválido o expirado
- **THEN** el sistema descarta el token persistido
- **AND** lleva a la persona a `/login`

### Requirement: Protección de las rutas del dashboard

El sistema DEBE impedir el acceso a cualquier sección bajo `/dashboard` sin sesión activa, redirigiendo a `/login` y reemplazando la entrada en el historial de navegación.

#### Scenario: Acceso directo sin sesión
- **WHEN** una persona sin sesión activa navega directamente a una URL bajo `/dashboard`
- **THEN** el sistema la redirige a `/login`
- **AND** no se renderiza contenido de la sección protegida

#### Scenario: Acceso con sesión activa
- **WHEN** una persona con sesión activa navega a una sección bajo `/dashboard`
- **THEN** la sección se renderiza normalmente

### Requirement: Cierre de sesión

El sistema DEBE ofrecer, dentro del área protegida, una acción de cierre de sesión que elimine el token persistido, deje la sesión inactiva y lleve a la persona a `/login`.

#### Scenario: Cierre de sesión manual
- **WHEN** la persona ejecuta la acción de cerrar sesión
- **THEN** el token persistido se elimina
- **AND** el sistema navega a `/login`

#### Scenario: Retroceso tras cerrar sesión
- **WHEN** la persona usa el botón "atrás" del navegador después de cerrar sesión
- **THEN** no puede volver a ver contenido de una sección protegida
