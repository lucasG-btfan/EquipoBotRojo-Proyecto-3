## Context

El SIEM Dashboard tiene 8 secciones navegables desde el sidebar. La sección "Inicio" (`/dashboard/inicio`) es actualmente un `Placeholder` sin contenido. Es la primera página que ve el operador después del login y debe presentar el sistema de forma profesional, mostrar el estado general de salud y proveer acceso rápido al dashboard.

El frontend ya tiene todos los componentes y hooks necesarios: `Card`, `Badge`, `Spinner`, `usePolling`, `apiClient`, constantes de polling y tokens de color. No hay dependencias nuevas.

## Goals / Non-Goals

**Goals:**

- Reemplazar el `Placeholder` de Inicio por una página de presentación profesional del sistema SIEM.
- Mostrar indicador visual de estado general del sistema (verde/rojo) usando polling a `GET /api/status/containers`.
- Listar las tecnologías integradas con íconos de lucide-react.
- Proveer botón "Ir al Dashboard" como CTA principal.
- Mantener la coherencia visual con el tema dark existente (fondo `#0f172a`, cards `#1e293b`, Inter).

**Non-Goals:**

- No se agregan endpoints nuevos al backend.
- No se implementan métricas detalladas de contenedores (eso es para CH14 Dashboard).
- No se agregan animaciones, partículas ni elementos decorativos complejos.
- No se modifica el sidebar, el layout ni el sistema de navegación.
- No se muestran alertas específicas ni logs — solo el indicador de salud general.

## Decisions

### D1: Componente único `InicioPage.tsx` en `pages/`

**Decisión**: Un solo archivo `frontend/src/pages/InicioPage.tsx` que encapsula toda la lógica y UI de la página de inicio.

**Alternativas consideradas**:
- Separar en sub-componentes (`SaludSistema`, `ListaTecnologias`, `HeroSection`): descartado porque la página es suficientemente simple como para justificar un solo archivo. Si en el futuro crece, se puede extraer.
- Usar el componente `DashboardPage` existente y agregarle contenido: descartado porque DashboardPage es un stub para CH14, y mezclar presentación con métricas haría el archivo confuso.

**Razón**: Un solo archivo es coherente con el patrón de `DashboardPage.tsx` y `LoginPage.tsx` — cada página del dashboard es un componente que se importa directamente en `App.tsx`.

### D2: Polling de salud del sistema

**Decisión**: Usar `usePolling` con `INTERVALOS_POLLING.DASHBOARD` (30 s) para consultar `GET /api/status/containers`. El健康 del sistema se define como: al menos 1 contenedor con estado "running" → verde; 0 contenedores running → rojo.

**Alternativas consideradas**:
- Consultar múltiples endpoints (containers + fail2ban + prometheus): descartado porque el endpoint de containers es el más representativo del健康 general y no queremos hacer 3 requests cada 30 s desde la página de inicio.
- Definir健康 con una lógica más compleja (ej. servicios críticos específicos): descartado para la primera versión. La lógica simple "hay contenedores corriendo" es suficiente y no acopla la página a saber qué servicios son críticos.

**Razón**: Reutiliza el hook y constantes existentes. El intervalo de 30 s es apropiado para un indicador de estado general (no necesita frecuencia alta).

### D3: Listado de tecnologías como grid de cards

**Decisión**: Grid responsivo de 3-4 columnas con una card por tecnología. Cada card muestra un ícono de lucide-react, nombre y descripción breve. Las cards usan el componente `Card` existente.

**Íconos de lucide-react para cada tecnología**:
- Wazuh: `Shield` (escudo de seguridad)
- n8n: `Workflow` (flujo de trabajo)
- Elasticsearch: `Search` (búsqueda)
- Fail2ban: `Ban` (prohibición)
- Prometheus: `Activity` (métricas/actividad)
- PostgreSQL: `Database` (base de datos)
- Syslog-ng: `FileText` (logs/texto)

**Razón**: El grid de cards es el patrón visual estándar del dashboard. lucide-react ya está instalado y tiene íconos que representan bien cada tecnología.

### D4: Modificación mínima en App.tsx

**Decisión**: Solo cambiar el import de `Placeholder` por `InicioPage` en la línea de la ruta `inicio`. El `Placeholder` se mantiene para las otras 6 secciones que aún no se implementan.

**Razón**: Mínimo diff, mínimo riesgo. El patrón de reemplazar Placeholder por la página real se repetirá en CH14-CH20.

### D5: Semáforo de salud como indicador inline

**Decisión**: Un badge/indicador inline en la hero section con:
- Verde (`exito`): "Sistema operativo" + dot verde animado
- Rojo (`peligro`): "Sistema caído" + dot rojo
- Cargando: Spinner pequeño
- Error: Texto amarillo (`advertencia`) con "No se pudo verificar"

**Razón**: El operador necesita ver el estado de un vistazo sin scrollear. Un indicador inline en la parte superior es inmediato.

## Risks / Trade-offs

- **[Riesgo] Backend caído al cargar la página** → Mitigación: el estado de error se muestra claramente con color `advertencia` y el usuario puede recargar. La página sigue siendo útil (muestra tecnologías y botón) incluso sin el indicador de salud.
- **[Riesgo] Grid de tecnologías se ve diferente en pantallas pequeñas** → Mitigación: usar Tailwind responsive (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`) para adaptarse.
- **[Trade-off] No hay métricas detalladas en Inicio** → A propósito. Las métricas detalladas van en Dashboard (CH14). La página de inicio es presentación, no operación.
