# Migración de ReactFlow a Three.js

## Resumen

Se ha migrado exitosamente el componente de mapas de ReactFlow a Three.js para proporcionar una experiencia 3D más inmersiva y moderna.

## Cambios Realizados

### 1. Nuevo Componente ThreeJSMap

- **Archivo**: `src/components/maps/ThreeJSMap.jsx`
- **Tecnologías**: Three.js + React Three Fiber + React Three Drei
- **Características**:
  - Visualización 3D de equipos y áreas
  - Interacciones de arrastrar y soltar
  - Controles de cámara intuitivos
  - Iluminación y sombras realistas
  - Animaciones suaves

### 2. Nodos de Equipo 3D

- **Forma**: Cilindros con indicadores de estado
- **Colores**: 
  - Verde: Activo
  - Amarillo: Mantenimiento
  - Rojo: Inactivo
  - Azul: Por defecto
- **Interacciones**:
  - Click para seleccionar
  - Arrastrar para mover
  - Hover para feedback visual
  - Etiquetas HTML flotantes

### 3. Nodos de Área 3D

- **Forma**: Planos semitransparentes
- **Características**:
  - Visualización de equipos dentro del área
  - Contador de equipos
  - Bordes definidos
  - Creación interactiva

### 4. Controles de Cámara

- **Rotación**: Click izquierdo + arrastrar
- **Zoom**: Rueda del mouse
- **Pan**: Click derecho + arrastrar
- **Límites**: Ángulo y distancia controlados
- **Damping**: Movimiento suave

### 5. Interfaz de Usuario

- **Panel de Estado**: Información en tiempo real
- **Panel de Ayuda**: Instrucciones de uso
- **Controles**: Botones para crear áreas y pantalla completa
- **Modales**: Creación de áreas con validación
- **Loading**: Indicador de carga

## Instalación de Dependencias

```bash
npm install three @react-three/fiber @react-three/drei
```

## Uso

### Importación

```jsx
import ThreeJSMap from '../components/maps/ThreeJSMap';
```

### Props

```jsx
<ThreeJSMap
  equipos={equipos}
  onEquipoSelect={handleEquipoSelect}
  selectedEquipo={selectedEquipo}
  onEquipoMove={handleEquipoMove}
  onEquipoMoveEnd={handleEquipoMoveEnd}
  onEquipoRemove={handleEquipoRemove}
  areas={areas}
  onAreasChange={handleAreasChange}
  isCreatingArea={isCreatingArea}
  onAreaCreated={handleAreaCreated}
/>
```

## Características Técnicas

### Rendimiento

- **Optimización**: Uso de `useMemo` para cálculos costosos
- **Animaciones**: `useFrame` para animaciones suaves
- **Memoria**: Limpieza adecuada de referencias

### Coordenadas

- **Conversión 2D → 3D**: Centrado en origen (0,0,0)
- **Escala**: Factor de conversión 1:1
- **Precisión**: Redondeo a enteros para coordenadas

### Interacciones

- **Eventos**: Manejo de pointer events
- **Raycasting**: Detección de intersecciones 3D
- **Feedback**: Estados visuales claros

## Ventajas sobre ReactFlow

1. **Experiencia 3D**: Visualización más inmersiva
2. **Rendimiento**: Mejor para escenas complejas
3. **Flexibilidad**: Mayor control sobre la visualización
4. **Modernidad**: Tecnología más actual
5. **Escalabilidad**: Mejor para mapas grandes

## Compatibilidad

- **Navegadores**: Chrome, Firefox, Safari, Edge (WebGL 2.0)
- **Dispositivos**: Desktop y tablet (móvil limitado)
- **React**: 18+
- **Three.js**: 0.150+

## Próximos Pasos

1. **Optimizaciones**: LOD (Level of Detail) para equipos
2. **Animaciones**: Transiciones más elaboradas
3. **Efectos**: Partículas y efectos visuales
4. **VR/AR**: Soporte para dispositivos inmersivos
5. **Colaboración**: Sincronización en tiempo real

## Troubleshooting

### Problemas Comunes

1. **WebGL no soportado**: Verificar compatibilidad del navegador
2. **Rendimiento lento**: Reducir número de equipos o calidad
3. **Controles no responden**: Verificar eventos del mouse
4. **Coordenadas incorrectas**: Verificar conversión 2D/3D

### Debug

```jsx
// Habilitar debug de Three.js
<Canvas gl={{ antialias: true, alpha: true }}>
  <axesHelper args={[5]} />
  <gridHelper args={[100, 100]} />
</Canvas>
```

## Conclusión

La migración a Three.js proporciona una experiencia de usuario significativamente mejorada con capacidades 3D nativas, mejor rendimiento y mayor flexibilidad para futuras mejoras.
