# Integración con draw.io

## Descripción
Sistema de mapas 2D mejorado que utiliza draw.io (diagrams.net) como editor de mapas integrado, reemplazando la implementación anterior basada en canvas y Konva.js.

## Características

### 🎨 Editor Profesional
- **draw.io integrado**: Editor completo de diagramas dentro de la aplicación
- **Interfaz familiar**: Misma experiencia que draw.io web
- **Herramientas avanzadas**: Formas, texto, colores, estilos profesionales
- **Exportación**: PNG, SVG, PDF, XML
- **Importación**: Archivos .drawio, .xml, imágenes

### 🔄 Sincronización Automática
- **Tiempo real**: Cambios se sincronizan automáticamente con la base de datos
- **Bidireccional**: Datos fluyen entre draw.io y la aplicación
- **Auto-save**: Guardado automático cada 30 segundos
- **Indicadores de estado**: Visualización del estado de sincronización

### 🏢 Gestión de Equipos
- **Posicionamiento visual**: Arrastrar y soltar equipos en el mapa
- **Colores por estado**: Verde (activo), amarillo (mantenimiento), rojo (dañado), gris (inactivo)
- **Formas por tipo**: Rectángulos (computadores), elipses (impresoras), rombos (teléfonos)
- **Información detallada**: Marca, modelo, serial, estado

### 🏗️ Plantillas de Oficina
- **Áreas predefinidas**: Recepción, área abierta, salas de reuniones, sala de servidores
- **Personalización**: Crear y editar áreas según necesidades
- **Colores temáticos**: Cada área con su color distintivo
- **Capacidad**: Gestión de límites de equipos por área

## Estructura de Archivos

```
src/
├── components/
│   └── maps/
│       ├── DrawIOMap.jsx          # Componente principal con iframe
│       └── DrawIOSync.jsx         # Hook de sincronización
├── pages/
│   └── MapasPage.jsx              # Página actualizada
└── docs/
    └── DRAWIO_INTEGRATION.md      # Esta documentación
```

## Componentes

### DrawIOMap.jsx
Componente principal que integra draw.io mediante iframe:

```jsx
<DrawIOMap 
  equipos={equipos}
  onEquipoSelect={handleEquipoSelect}
  selectedEquipo={selectedEquipo}
  onEquipoMove={handleEquipoMove}
  onEquipoRemove={handleEquipoRemove}
  areas={officeAreas}
  onAreasChange={handleAreasChange}
  isCreatingArea={isCreatingArea}
  onAreaCreated={handleAreaCreated}
/>
```

**Props:**
- `equipos`: Array de equipos con coordenadas
- `onEquipoSelect`: Callback cuando se selecciona un equipo
- `selectedEquipo`: Equipo actualmente seleccionado
- `onEquipoMove`: Callback cuando se mueve un equipo
- `onEquipoRemove`: Callback cuando se elimina un equipo
- `areas`: Array de áreas de oficina
- `onAreasChange`: Callback cuando cambian las áreas
- `isCreatingArea`: Estado de creación de área
- `onAreaCreated`: Callback cuando se crea un área

### DrawIOSync.jsx
Hook personalizado para sincronización de datos:

```jsx
const drawIOSync = DrawIOSync({
  equipos,
  onEquiposChange: setEquipos,
  areas: officeAreas,
  onAreasChange: setOfficeAreas,
  activeCompany
});
```

**Funciones disponibles:**
- `syncEquiposToDatabase()`: Sincroniza equipos con BD
- `syncAreasToDatabase()`: Sincroniza áreas con BD
- `exportToDrawIO()`: Exporta datos a formato draw.io
- `importFromDrawIO()`: Importa datos desde draw.io
- `createOfficeTemplate()`: Crea plantilla de oficina

## Funcionalidades

### 1. Visualización del Mapa
- Editor draw.io completo embebido
- Zoom, pan, herramientas de dibujo
- Grid opcional para alineación
- Controles de pantalla completa

### 2. Gestión de Equipos
- Arrastrar equipos en el mapa
- Colores automáticos por estado
- Formas automáticas por tipo
- Información en tiempo real

### 3. Sincronización
- Actualización automática en BD
- Indicadores de estado visual
- Manejo de errores robusto
- Auto-save periódico

### 4. Exportación/Importación
- Exportar a PNG, SVG, PDF
- Importar archivos .drawio
- Plantillas predefinidas
- Backup automático

## Uso

### Para el Usuario
1. **Acceder**: Navegar a `/mapas`
2. **Editar**: Usar herramientas de draw.io
3. **Mover equipos**: Arrastrar en el mapa
4. **Exportar**: Usar botón de exportación
5. **Sincronizar**: Los cambios se guardan automáticamente

### Para el Desarrollador
```jsx
// Usar el componente DrawIOMap
<DrawIOMap 
  equipos={equipos}
  onEquipoSelect={handleEquipoSelect}
  selectedEquipo={selectedEquipo}
  onEquipoMove={handleEquipoMove}
  onEquipoRemove={handleEquipoRemove}
  areas={officeAreas}
  onAreasChange={handleAreasChange}
  isCreatingArea={isCreatingArea}
  onAreaCreated={handleAreaCreated}
/>

// Usar el hook de sincronización
const drawIOSync = DrawIOSync({
  equipos,
  onEquiposChange: setEquipos,
  areas: officeAreas,
  onAreasChange: setOfficeAreas,
  activeCompany
});
```

## Ventajas sobre la Implementación Anterior

### ✅ Mejoras
- **Editor profesional**: Herramientas avanzadas de draw.io
- **Mejor UX**: Interfaz familiar y potente
- **Más opciones**: Exportación a múltiples formatos
- **Colaboración**: Posibilidad de trabajo en equipo
- **Plantillas**: Biblioteca de formas y plantillas
- **Escalabilidad**: Manejo de mapas complejos

### 🔄 Migración
- **Datos preservados**: Coordenadas existentes se mantienen
- **Funcionalidad completa**: Todas las características anteriores
- **Mejora gradual**: Se puede usar junto con la implementación anterior
- **Rollback**: Fácil volver a la implementación anterior si es necesario

## Configuración

### Variables de Entorno
```env
# No se requieren variables adicionales
# draw.io se carga desde su CDN oficial
```

### Dependencias
```json
{
  "react": "^18.0.0",
  "react-hot-toast": "^2.4.0"
}
```

## Troubleshooting

### Problemas Comunes
1. **draw.io no carga**: Verificar conexión a internet
2. **Sincronización falla**: Verificar permisos de base de datos
3. **Equipos no aparecen**: Verificar coordenadas en BD
4. **Errores de CORS**: draw.io maneja esto automáticamente

### Debug
```javascript
// Verificar estado de sincronización
console.log('Sync status:', drawIOSync.syncStatus);
console.log('Last sync:', drawIOSync.lastSync);

// Verificar datos de equipos
console.log('Equipos:', equipos.map(e => ({
  id: e.id,
  x: e.x_coordinate,
  y: e.y_coordinate
})));
```

## Próximas Mejoras

### Funcionalidades Planificadas
- [ ] **Colaboración en tiempo real**: Múltiples usuarios editando
- [ ] **Plantillas personalizadas**: Crear plantillas específicas
- [ ] **Integración con CAD**: Importar planos arquitectónicos
- [ ] **Análisis espacial**: Métricas de distribución
- [ ] **Notificaciones**: Alertas de cambios importantes
- [ ] **Historial**: Versiones anteriores del mapa
- [ ] **API REST**: Endpoints para integración externa

### Mejoras Técnicas
- [ ] **Offline mode**: Funcionar sin conexión
- [ ] **Performance**: Optimización para mapas grandes
- [ ] **Caching**: Cache inteligente de datos
- [ ] **Testing**: Suite de pruebas automatizadas
- [ ] **Documentation**: Documentación interactiva
