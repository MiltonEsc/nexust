# Sistema de Capas Integrado

## Descripción

Se ha implementado un sistema de capas funcional que se integra con el mapa HTML/CSS existente, reemplazando el sistema anterior que no funcionaba correctamente. El nuevo sistema permite gestionar múltiples capas de manera independiente con controles avanzados sin cambiar la funcionalidad del mapa principal.

## Características Principales

### 1. Sistema de Capas Jerárquico
- **Fondo**: Capa base del mapa
- **Grid**: Líneas de cuadrícula para alineación
- **Áreas**: Zonas y espacios del mapa
- **Equipos**: Dispositivos y activos
- **Interfaz**: Elementos de UI y controles

### 2. Controles de Capa
- **Visibilidad**: Mostrar/ocultar capas individualmente
- **Bloqueo**: Bloquear/desbloquear capas para edición
- **Opacidad**: Ajustar transparencia (0-100%)
- **Reordenamiento**: Cambiar el orden de las capas (z-index)
- **Drag & Drop**: Reordenar capas arrastrando

### 3. Gestión Avanzada
- **Crear capas personalizadas**: Agregar nuevas capas según necesidades
- **Eliminar capas**: Remover capas personalizadas
- **Información detallada**: Ver estadísticas de cada capa
- **Configuración avanzada**: Acceso a controles adicionales

## Componentes

### Map2D.jsx (Modificado)
El mapa principal se mantiene igual pero ahora incluye el sistema de capas integrado.

**Características:**
- Mapa HTML/CSS original sin cambios
- Sistema de capas integrado
- Controles de visibilidad y opacidad por capa
- Z-index automático basado en capas
- Panel de gestión de capas

### LayerManager.jsx
Componente de gestión de capas con interfaz completa.

**Funcionalidades:**
- Lista visual de todas las capas
- Controles de visibilidad y bloqueo
- Ajuste de opacidad con slider
- Reordenamiento por drag & drop
- Creación y eliminación de capas
- Información estadística

## Uso

### Acceder al Sistema de Capas
En el componente Map2D, hacer clic en la pestaña "Capas" en el panel lateral derecho.

### Gestionar Capas
1. **Mostrar/Ocultar**: Click en el icono de ojo
2. **Bloquear/Desbloquear**: Click en el icono de candado
3. **Ajustar Opacidad**: Usar el slider de opacidad
4. **Reordenar**: Arrastrar capas hacia arriba/abajo
5. **Crear Nueva**: Click en el botón "+"
6. **Eliminar**: Click en el icono de basura (solo capas personalizadas)

### Configuración Avanzada
Activar el modo avanzado para acceder a:
- Controles de opacidad detallados
- Información de elementos por capa
- Fecha de última modificación
- Estadísticas del sistema

## Ventajas del Nuevo Sistema

### 1. Integración Perfecta
- Mantiene toda la funcionalidad existente
- No requiere cambios en el mapa principal
- Sistema de capas transparente

### 2. Flexibilidad
- Capas independientes y configurables
- Sistema de z-index automático
- Controles granulares

### 3. Usabilidad
- Interfaz intuitiva
- Drag & drop para reordenamiento
- Feedback visual inmediato

### 4. Escalabilidad
- Fácil agregar nuevas capas
- Sistema extensible
- Compatible con funcionalidades existentes

## Integración

El sistema se integra perfectamente con:
- Base de datos existente (Supabase)
- Sistema de equipos actual
- Gestión de áreas
- Autenticación y permisos

## Próximas Mejoras

1. **Capas por Defecto**: Plantillas predefinidas
2. **Exportación**: Guardar configuraciones de capas
3. **Animaciones**: Transiciones entre estados
4. **Colaboración**: Sincronización en tiempo real
5. **Temas**: Estilos visuales personalizables

## Solución de Problemas

### Capa No Visible
- Verificar que la capa esté marcada como visible
- Comprobar que la opacidad no sea 0
- Asegurar que no esté bloqueada

### Elementos No Se Mueven
- Verificar que la capa no esté bloqueada
- Comprobar que el elemento esté seleccionado
- Asegurar que el modo de edición esté activo

### Rendimiento Lento
- Reducir opacidad de capas no esenciales
- Ocultar capas innecesarias
- Verificar número de elementos por capa

## Conclusión

El nuevo sistema de capas integrado proporciona una base sólida y funcional para la gestión de mapas 2D, resolviendo los problemas del sistema anterior y ofreciendo características avanzadas para una mejor experiencia de usuario, manteniendo toda la funcionalidad existente del mapa.
