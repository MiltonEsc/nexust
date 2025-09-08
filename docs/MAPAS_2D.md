# Sistema de Mapas 2D

## Descripción
Sistema de visualización de ubicaciones físicas de equipos usando canvas 2D con funcionalidades de zoom, pan y edición de coordenadas.

## Características

### 🗺️ Visualización
- **Canvas 2D**: Renderizado en tiempo real de equipos en el mapa
- **Grid**: Cuadrícula opcional para facilitar el posicionamiento
- **Zoom**: Control de zoom con rueda del mouse (0.5x - 3x)
- **Pan**: Arrastrar para mover el mapa
- **Leyenda**: Colores por estado del equipo

### 🎯 Interacción
- **Clic en equipo**: Selecciona y muestra detalles
- **Edición de coordenadas**: Modal para ajustar posición X,Y
- **Colocación**: Botón para colocar equipos sin ubicación

### 🎨 Representación Visual
- **Círculos de colores**: 
  - 🟢 Verde: Activo
  - 🟡 Amarillo: Mantenimiento
  - 🔴 Rojo: Dañado
  - ⚫ Gris: Inactivo
- **Iconos**: Letra inicial del tipo de equipo
- **Etiquetas**: Marca del equipo debajo del círculo

## Estructura de Archivos

```
src/
├── components/
│   ├── maps/
│   │   └── Map2D.jsx              # Componente principal del mapa
│   └── modals/
│       └── EquipoLocationModal.jsx # Modal para editar coordenadas
├── pages/
│   └── MapasPage.jsx              # Página principal de mapas
└── App.jsx                        # Ruta /mapas agregada
```

## Base de Datos

### Campos Agregados
```sql
ALTER TABLE "public"."equipos" 
ADD COLUMN "x_coordinate" integer DEFAULT 0,
ADD COLUMN "y_coordinate" integer DEFAULT 0;
```

### Uso de Coordenadas
- **X, Y**: Posición en píxeles en el canvas
- **Valores por defecto**: 0, 0 (sin ubicación)
- **Rango**: Enteros positivos (recomendado: 0-1000)

## Funcionalidades

### 1. Visualización del Mapa
- Renderizado automático de equipos con coordenadas
- Grid opcional para referencia
- Controles de zoom y pan
- Leyenda de estados

### 2. Gestión de Ubicaciones
- Modal para editar coordenadas X, Y
- Botón para colocar equipos sin ubicación
- Actualización en tiempo real

### 3. Interacción
- Clic en equipo para seleccionar
- Arrastrar para mover el mapa
- Zoom con rueda del mouse
- Reset para volver a vista inicial

## Uso

### Para el Usuario
1. **Ver mapa**: Navegar a `/mapas`
2. **Colocar equipo**: Hacer clic en "Colocar en mapa" en equipos sin ubicación
3. **Editar ubicación**: Hacer clic en un equipo en el mapa
4. **Mover mapa**: Arrastrar con el mouse
5. **Zoom**: Usar rueda del mouse o botones +/-

### Para el Desarrollador
```jsx
// Usar el componente Map2D
<Map2D 
  equipos={equipos}
  onEquipoSelect={handleEquipoSelect}
  selectedEquipo={selectedEquipo}
/>

// Equipos deben tener x_coordinate y y_coordinate
const equipos = [
  {
    id: 1,
    marca: "Dell",
    modelo: "OptiPlex",
    tipo: "Computador",
    estado: "Activo",
    x_coordinate: 100,
    y_coordinate: 150
  }
];
```

## Próximas Mejoras

### Funcionalidades Planificadas
- [ ] **Arrastrar equipos**: Mover equipos directamente en el mapa
- [ ] **Zonas**: Agrupar equipos por áreas/zonas
- [ ] **Rutas**: Conectar equipos con líneas
- [ ] **Filtros**: Por tipo, estado, responsable
- [ ] **Exportar**: Imagen del mapa
- [ ] **Plantillas**: Mapear oficinas/edificios
- [ ] **Búsqueda**: Encontrar equipos por nombre/serial
- [ ] **Historial**: Ver cambios de ubicación

### Mejoras Técnicas
- [ ] **Performance**: Virtualización para muchos equipos
- [ ] **Responsive**: Mejor adaptación móvil
- [ ] **Accesibilidad**: Navegación por teclado
- [ ] **PWA**: Funcionar offline
- [ ] **Colaboración**: Edición simultánea

## Troubleshooting

### Problemas Comunes
1. **Equipos no aparecen**: Verificar que tengan x_coordinate y y_coordinate
2. **Canvas no se renderiza**: Verificar que el contenedor tenga altura definida
3. **Zoom no funciona**: Verificar que el canvas tenga el evento onWheel

### Debug
```javascript
// Verificar coordenadas de equipos
console.log(equipos.map(e => ({ 
  id: e.id, 
  x: e.x_coordinate, 
  y: e.y_coordinate 
})));

// Verificar dimensiones del canvas
const canvas = canvasRef.current;
console.log('Canvas size:', canvas.width, canvas.height);
```
