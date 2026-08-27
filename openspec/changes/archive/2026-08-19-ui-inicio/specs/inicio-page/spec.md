## ADDED Requirements

### Requirement: Página de presentación del sistema SIEM
La página de Inicio SHALL mostrar una presentación profesional del sistema SIEM Dashboard con nombre, descripción breve y CTA para ir al dashboard.

#### Scenario: Página carga correctamente
- **WHEN** el usuario navega a `/dashboard/inicio` (o es redirigido desde `/`)
- **THEN** se muestra una página con el nombre del sistema, una descripción breve y un botón "Ir al Dashboard" que enlaza a `/dashboard/dashboard`

#### Scenario: Página es la primera vista después del login
- **WHEN** el usuario completa el login exitosamente
- **THEN** es redirigido a `/dashboard/inicio` y la página de presentación se muestra completamente

### Requirement: Indicador de estado general del sistema
La página SHALL mostrar un indicador visual del estado general del sistema (operativo/caído) basado en la disponibilidad de los contenedores Docker.

#### Scenario: Sistema operativo
- **WHEN** el endpoint `GET /api/status/containers` responde con al menos un contenedor en estado "running"
- **THEN** se muestra un indicador verde con texto "Sistema operativo"

#### Scenario: Sistema caído
- **WHEN** el endpoint `GET /api/status/containers` responde con 0 contenedores en estado "running"
- **THEN** se muestra un indicador rojo con texto "Sistema caído"

#### Scenario: Error al verificar estado
- **WHEN** el endpoint `GET /api/status/containers` falla o no responde
- **THEN** se muestra un indicador amarillo con texto "No se pudo verificar el estado"

#### Scenario: Carga inicial del indicador
- **WHEN** la página se carga por primera vez
- **THEN** se muestra un spinner pequeño mientras se obtiene el estado inicial del sistema

### Requirement: Polling de estado del sistema
La página SHALL consultar el estado del sistema periódicamente usando el hook `usePolling` con el intervalo configurado en `INTERVALOS_POLLING.DASHBOARD` (30 segundos).

#### Scenario: Actualización periódica del indicador
- **WHEN** el indicador de estado está visible
- **THEN** el estado se actualiza automáticamente cada 30 segundos sin recarga de página

#### Scenario: Estado cambia durante la sesión
- **WHEN** el sistema pasa de operativo a caído (o viceversa) entre dos ciclos de polling
- **THEN** el indicador visual cambia al siguiente ciclo de polling sin intervención del usuario

### Requirement: Listado de tecnologías del stack
La página SHALL mostrar un grid de cards con las 7 tecnologías que componen el sistema SIEM, cada una con ícono, nombre y descripción breve.

#### Scenario: Todas las tecnologías se muestran
- **WHEN** la página de Inicio carga completamente
- **THEN** se muestran 7 cards, cada una con: ícono de lucide-react, nombre de la tecnología (Wazuh, n8n, Elasticsearch, Fail2ban, Prometheus, PostgreSQL, Syslog-ng) y una descripción de una línea

#### Scenario: Grid responsivo
- **WHEN** la página se visualiza en diferentes tamaños de pantalla
- **THEN** el grid muestra 1 columna en móvil, 2 en tablet y 3-4 en desktop

### Requirement: Botón de acceso al dashboard
La página SHALL incluir un botón prominentemente ubicado que permita navegar directamente a la sección Dashboard.

#### Scenario: Navegación al dashboard
- **WHEN** el usuario hace clic en el botón "Ir al Dashboard"
- **THEN** es navegado a la ruta `/dashboard/dashboard`

#### Scenario: Botón visible sin scroll
- **WHEN** la página carga
- **THEN** el botón "Ir al Dashboard" es visible en el viewport sin necesidad de hacer scroll
