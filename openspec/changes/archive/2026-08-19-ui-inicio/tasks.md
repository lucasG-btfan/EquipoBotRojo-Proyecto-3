## 1. Estructura y scaffolding

- [x] 1.1 Crear archivo `frontend/src/pages/InicioPage.tsx` con estructura básica (componente funcional vacío, exportación con nombre)
- [x] 1.2 Crear archivo `frontend/src/types/tecnologias.ts` con la interfaz `TecnologiaSIEM` (nombre, descripcion, icono) — interfaz definida inline en InicioPage.tsx

## 2. Hero section — Presentación del sistema

- [x] 2.1 Implementar la sección hero con nombre del sistema ("SIEM Dashboard"), descripción breve del proyecto y botón "Ir al Dashboard" que enlaza a `/dashboard/panel`
- [x] 2.2 Aplicar estilos de la hero section: fondo `superficie`, tipografía Inter, botón con color `primario`

## 3. Indicador de estado del sistema

- [x] 3.1 Implementar el hook de polling usando `usePolling` con `INTERVALOS_POLLING.DASHBOARD` para consultar `GET /api/status/containers` vía `apiClient`
- [x] 3.2 Definir la función `calcularSalud` que determine el estado general: verde si ≥1 contenedor "running", rojo si 0, amarillo en caso de error
- [x] 3.3 Renderizar el indicador visual inline en la hero section: dot verde/rojo/amarillo + texto descriptivo (Spinner en carga inicial)
- [x] 3.4 Crear tipo `ResultadoContenedores` en `frontend/src/types/contenedores.ts` (o reutilizar existente) para tipar la respuesta de `GET /api/status/containers`

## 4. Grid de tecnologías

- [x] 4.1 Crear el array de datos `TECNOLOGIAS` con las 7 tecnologías: Wazuh (`Shield`), n8n (`Workflow`), Elasticsearch (`Search`), Fail2ban (`Ban`), Prometheus (`Activity`), PostgreSQL (`Database`), Syslog-ng (`FileText`) — todas de lucide-react
- [x] 4.2 Implementar el grid responsivo de cards (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`) usando el componente `Card` existente
- [x] 4.3 Cada card muestra: ícono de lucide-react, nombre de la tecnología y descripción de una línea

## 5. Integración y verificación

- [x] 5.1 Modificar `App.tsx`: reemplazar import de `Placeholder` por `InicioPage` en la ruta `/dashboard/inicio`
- [x] 5.2 Verificar que la página carga sin errores de TypeScript (`npm run build` o verificación manual en el navegador)
- [x] 5.3 Verificar que el indicador de salud se actualiza con polling (abrir consola, observar requests cada 30 s)
- [x] 5.4 Verificar que el grid de tecnologías se adapta a diferentes tamaños de pantalla
- [x] 5.5 Verificar que el botón "Ir al Dashboard" navega correctamente a `/dashboard/panel`
