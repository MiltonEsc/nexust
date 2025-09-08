import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Stage, Layer, Rect, Circle, Text, Group, Line } from 'react-konva';
import { 
  MapPinIcon, 
  ComputerDesktopIcon, 
  PrinterIcon, 
  PhoneIcon, 
  BuildingOfficeIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const OfficeMapKonva = ({ 
  equipos, 
  onEquipoSelect, 
  selectedEquipo, 
  selectedArea,
  onAreaSelect, 
  onEquipoMove, 
  onEquipoRemove, 
  newlyPlacedEquipo, 
  draggedEquipo, 
  isDraggingFromCard,
  areas = [],
  onAreasChange,
  isCreatingArea = false,
  onAreaCreated
}) => {
  const stageRef = useRef(null);
  const [stageSize, setStageSize] = useState({ width: 1000, height: 500 });
  const [stageScale, setStageScale] = useState(0.8);
  const [stagePosition, setStagePosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [localDraggedEquipo, setLocalDraggedEquipo] = useState(null);
  const [contextMenu, setContextMenu] = useState({ show: false, x: 0, y: 0, equipo: null });
  const [areaCreation, setAreaCreation] = useState({ isCreating: false, startX: 0, startY: 0, currentX: 0, currentY: 0 });
  const [animatingEquipos, setAnimatingEquipos] = useState(new Set());

  // Usar áreas dinámicas o áreas por defecto
  const officeAreas = areas.length > 0 ? areas : [
    {
      id: 'reception',
      name: 'Recepción',
      x: 50,
      y: 50,
      width: 200,
      height: 100,
      color: '#E5E7EB',
      bgColor: '#E5E7EB',
      borderColor: '#9CA3AF',
      capacity: null,
      responsible: '',
      isCustom: false
    },
    {
      id: 'open-space',
      name: 'Área Abierta',
      x: 300,
      y: 50,
      width: 400,
      height: 200,
      color: '#F3F4F6',
      bgColor: '#F3F4F6',
      borderColor: '#9CA3AF',
      capacity: null,
      responsible: '',
      isCustom: false
    },
    {
      id: 'meeting-room-1',
      name: 'Sala de Reuniones 1',
      x: 50,
      y: 200,
      width: 150,
      height: 120,
      color: '#DBEAFE',
      bgColor: '#DBEAFE',
      borderColor: '#3B82F6',
      capacity: null,
      responsible: '',
      isCustom: false
    },
    {
      id: 'meeting-room-2',
      name: 'Sala de Reuniones 2',
      x: 250,
      y: 200,
      width: 150,
      height: 120,
      color: '#DBEAFE',
      bgColor: '#DBEAFE',
      borderColor: '#3B82F6',
      capacity: null,
      responsible: '',
      isCustom: false
    },
    {
      id: 'server-room',
      name: 'Sala de Servidores',
      x: 50,
      y: 350,
      width: 200,
      height: 100,
      color: '#FEF3C7',
      bgColor: '#FEF3C7',
      borderColor: '#F59E0B',
      capacity: null,
      responsible: '',
      isCustom: false
    },
    {
      id: 'storage',
      name: 'Almacén',
      x: 300,
      y: 350,
      width: 200,
      height: 100,
      color: '#F3E8FF',
      bgColor: '#F3E8FF',
      borderColor: '#8B5CF6',
      capacity: null,
      responsible: '',
      isCustom: false
    },
    {
      id: 'break-room',
      name: 'Sala de Descanso',
      x: 550,
      y: 200,
      width: 150,
      height: 120,
      color: '#ECFDF5',
      bgColor: '#ECFDF5',
      borderColor: '#10B981',
      capacity: null,
      responsible: '',
      isCustom: false
    }
  ];

  // Iconos por tipo de equipo
  const getEquipoIcon = (tipo) => {
    switch (tipo?.toLowerCase()) {
      case 'computador':
      case 'laptop':
        return ComputerDesktopIcon;
      case 'impresora':
        return PrinterIcon;
      case 'telefono':
        return PhoneIcon;
      case 'servidor':
        return BuildingOfficeIcon;
      default:
        return MapPinIcon;
    }
  };

  // Colores por estado
  const getEquipoColor = (estado) => {
    switch (estado?.toLowerCase()) {
      case 'activo':
        return '#10B981';
      case 'mantenimiento':
        return '#F59E0B';
      case 'dañado':
        return '#EF4444';
      case 'inactivo':
        return '#6B7280';
      default:
        return '#3B82F6';
    }
  };

  // Centrar el mapa automáticamente
  const centerMap = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;

    // Calcular el centro del contenido (áreas y equipos)
    const areas = officeAreas;
    const equiposConUbicacion = equipos.filter(equipo => 
      equipo.x_coordinate && 
      equipo.y_coordinate && 
      equipo.x_coordinate !== 0 && 
      equipo.y_coordinate !== 0
    );

    if (areas.length === 0 && equiposConUbicacion.length === 0) {
      // Si no hay contenido, centrar en el medio del stage
      setStagePosition({
        x: (stageSize.width - 800) / 2,
        y: (stageSize.height - 600) / 2
      });
      return;
    }

    // Calcular bounds del contenido
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    // Incluir áreas
    areas.forEach(area => {
      minX = Math.min(minX, area.x);
      minY = Math.min(minY, area.y);
      maxX = Math.max(maxX, area.x + area.width);
      maxY = Math.max(maxY, area.y + area.height);
    });

    // Incluir equipos
    equiposConUbicacion.forEach(equipo => {
      minX = Math.min(minX, equipo.x_coordinate - 20);
      minY = Math.min(minY, equipo.y_coordinate - 20);
      maxX = Math.max(maxX, equipo.x_coordinate + 20);
      maxY = Math.max(maxY, equipo.y_coordinate + 20);
    });

    // Calcular el centro del contenido
    const contentCenterX = (minX + maxX) / 2;
    const contentCenterY = (minY + maxY) / 2;

    // Centrar en el stage
    const stageCenterX = stageSize.width / 2;
    const stageCenterY = stageSize.height / 2;

    setStagePosition({
      x: stageCenterX - contentCenterX * stageScale,
      y: stageCenterY - contentCenterY * stageScale
    });
  }, [officeAreas, equipos, stageSize, stageScale]);

  // Manejar redimensionamiento del stage
  const handleResize = useCallback(() => {
    const container = stageRef.current?.container();
    if (container) {
      const rect = container.getBoundingClientRect();
      // Asegurar que el stage no exceda el contenedor
      const maxWidth = Math.min(rect.width, 1200);
      const maxHeight = Math.min(rect.height, 500);
      setStageSize({ width: maxWidth, height: maxHeight });
    }
  }, []);

  // Efecto para redimensionamiento
  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  // Efecto para centrar el mapa cuando se carga
  useEffect(() => {
    const timer = setTimeout(() => {
      centerMap();
    }, 100); // Pequeño delay para asegurar que el stage esté renderizado
    
    return () => clearTimeout(timer);
  }, [centerMap]);

  // Manejar wheel para zoom
  const handleWheel = useCallback((e) => {
    e.evt.preventDefault();
    
    const scaleBy = 1.05; // Reducir el factor de zoom para mayor suavidad
    const stage = e.target.getStage();
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };
    
    const newScale = Math.max(0.1, Math.min(3, e.evt.deltaY > 0 ? oldScale * scaleBy : oldScale / scaleBy));
    
    setStageScale(newScale);
    setStagePosition({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
  }, []);

  // Manejar drag del stage (pan)
  const handleStageDragStart = useCallback((e) => {
    setIsDragging(true);
    setDragStart({ x: e.evt.clientX, y: e.evt.clientY });
  }, []);

  const handleStageDragEnd = useCallback((e) => {
    setIsDragging(false);
    setStagePosition({ x: e.target.x(), y: e.target.y() });
  }, []);

  // Manejar click en equipo
  const handleEquipoClick = useCallback((equipo) => {
    onEquipoSelect(equipo);
  }, [onEquipoSelect]);

  // Manejar doble click en equipo
  const handleEquipoDoubleClick = useCallback((equipo) => {
    onEquipoSelect(equipo);
  }, [onEquipoSelect]);

  // Manejar drag de equipo
  const handleEquipoDragStart = useCallback((equipo) => {
    setLocalDraggedEquipo(equipo);
  }, []);

  const handleEquipoDragMove = useCallback((e) => {
    // Actualizar posición en tiempo real para mejor feedback visual
    const newX = Math.round(e.target.x());
    const newY = Math.round(e.target.y());
    
    // Actualizar el equipo localmente para feedback inmediato
    const updatedEquipo = {
      ...localDraggedEquipo,
      x_coordinate: newX,
      y_coordinate: newY
    };
    
    // Actualizar el estado local inmediatamente
    if (localDraggedEquipo) {
      // Esto se manejará en el dragEnd para evitar demasiadas actualizaciones
    }
  }, [localDraggedEquipo]);

  const handleEquipoDragEnd = useCallback((equipo, e) => {
    const newX = Math.round(e.target.x());
    const newY = Math.round(e.target.y());
    
    const updatedEquipo = {
      ...equipo,
      x_coordinate: newX,
      y_coordinate: newY
    };
    
    onEquipoMove(updatedEquipo);
    setLocalDraggedEquipo(null);
  }, [onEquipoMove]);

  // Manejar click derecho en equipo
  const handleEquipoRightClick = useCallback((equipo, e) => {
    e.evt.preventDefault();
    setContextMenu({
      show: true,
      x: e.evt.clientX,
      y: e.evt.clientY,
      equipo: equipo
    });
  }, []);

  // Cerrar menú contextual
  const closeContextMenu = useCallback(() => {
    setContextMenu({ show: false, x: 0, y: 0, equipo: null });
  }, []);

  // Manejar eliminación desde menú contextual
  const handleRemoveFromContext = useCallback(() => {
    if (contextMenu.equipo) {
      onEquipoRemove(contextMenu.equipo);
      closeContextMenu();
    }
  }, [contextMenu.equipo, onEquipoRemove, closeContextMenu]);

  // Manejar click en área
  const handleAreaClick = useCallback((area) => {
    onAreaSelect(area);
  }, [onAreaSelect]);

  // Manejar creación de área
  const handleAreaCreationStart = useCallback((e) => {
    if (!isCreatingArea) return;
    
    const pos = e.target.getStage().getPointerPosition();
    setAreaCreation({
      isCreating: true,
      startX: pos.x,
      startY: pos.y,
      currentX: pos.x,
      currentY: pos.y
    });
  }, [isCreatingArea]);

  const handleAreaCreationMove = useCallback((e) => {
    if (!areaCreation.isCreating) return;
    
    const pos = e.target.getStage().getPointerPosition();
    setAreaCreation(prev => ({
      ...prev,
      currentX: pos.x,
      currentY: pos.y
    }));
  }, [areaCreation.isCreating]);

  const handleAreaCreationEnd = useCallback(() => {
    if (!areaCreation.isCreating) return;
    
    const width = Math.abs(areaCreation.currentX - areaCreation.startX);
    const height = Math.abs(areaCreation.currentY - areaCreation.startY);
    
    if (width > 20 && height > 20) {
      const newArea = {
        id: `area_${Date.now()}`,
        name: 'Nueva Área',
        x: Math.min(areaCreation.startX, areaCreation.currentX),
        y: Math.min(areaCreation.startY, areaCreation.currentY),
        width: width,
        height: height,
        color: '#3B82F6',
        bgColor: '#DBEAFE',
        borderColor: '#3B82F6',
        capacity: null,
        responsible: '',
        isCustom: true
      };
      
      if (onAreaCreated) {
        onAreaCreated(newArea);
      }
    }
    
    setAreaCreation({ isCreating: false, startX: 0, startY: 0, currentX: 0, currentY: 0 });
  }, [areaCreation, onAreaCreated]);

  // Calcular equipos en área
  const getEquiposEnArea = useCallback((area) => {
    return equipos.filter(equipo => 
      equipo.x_coordinate && 
      equipo.y_coordinate && 
      equipo.x_coordinate !== 0 && 
      equipo.y_coordinate !== 0 &&
      equipo.x_coordinate >= area.x && 
      equipo.x_coordinate <= area.x + area.width &&
      equipo.y_coordinate >= area.y && 
      equipo.y_coordinate <= area.y + area.height
    ).length;
  }, [equipos]);

  // Efecto para animar equipos recién colocados
  useEffect(() => {
    if (newlyPlacedEquipo) {
      setAnimatingEquipos(prev => new Set([...prev, newlyPlacedEquipo.id]));
      
      // Remover de animación después de 1 segundo
      const timer = setTimeout(() => {
        setAnimatingEquipos(prev => {
          const newSet = new Set(prev);
          newSet.delete(newlyPlacedEquipo.id);
          return newSet;
        });
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [newlyPlacedEquipo]);

  // Efecto para cerrar menú contextual al hacer click fuera
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu.show) {
        closeContextMenu();
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [contextMenu.show, closeContextMenu]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Stage de Konva */}
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        scaleX={stageScale}
        scaleY={stageScale}
        x={stagePosition.x}
        y={stagePosition.y}
        draggable={!isCreatingArea}
        onWheel={handleWheel}
        onDragStart={handleStageDragStart}
        onDragEnd={handleStageDragEnd}
        onMouseDown={isCreatingArea ? handleAreaCreationStart : undefined}
        onMouseMove={isCreatingArea ? handleAreaCreationMove : undefined}
        onMouseUp={isCreatingArea ? handleAreaCreationEnd : undefined}
        className="cursor-grab active:cursor-grabbing"
        listening={true}
        perfectDrawEnabled={false}
        hitGraphEnabled={false}
        style={{ maxWidth: '100%', maxHeight: '100%' }}
      >
        <Layer>
          {/* Grid optimizado */}
          <Group>
            {Array.from({ length: Math.ceil(stageSize.width / 25) }, (_, i) => (
              <Line
                key={`v-${i}`}
                points={[i * 25, 0, i * 25, stageSize.height]}
                stroke="#E5E7EB"
                strokeWidth={0.5}
                listening={false}
              />
            ))}
            {Array.from({ length: Math.ceil(stageSize.height / 25) }, (_, i) => (
              <Line
                key={`h-${i}`}
                points={[0, i * 25, stageSize.width, i * 25]}
                stroke="#E5E7EB"
                strokeWidth={0.5}
                listening={false}
              />
            ))}
          </Group>

          {/* Áreas */}
          {officeAreas.map((area) => {
            const equiposEnArea = getEquiposEnArea(area);
            const isOvercrowded = area.capacity && equiposEnArea > area.capacity;
            const capacityPercentage = area.capacity ? (equiposEnArea / area.capacity) * 100 : 0;
            const isSelected = selectedArea?.id === area.id;

            return (
              <Group key={area.id}>
                {/* Área principal */}
                <Rect
                  x={area.x}
                  y={area.y}
                  width={area.width}
                  height={area.height}
                  fill={isOvercrowded ? '#FEE2E2' : area.bgColor}
                  stroke={isOvercrowded ? '#EF4444' : area.borderColor}
                  strokeWidth={isSelected ? 3 : 2}
                  cornerRadius={8}
                  shadowColor="rgba(0, 0, 0, 0.1)"
                  shadowBlur={4}
                  shadowOffset={{ x: 2, y: 2 }}
                  onClick={() => handleAreaClick(area)}
                />

                {/* Nombre del área */}
                <Text
                  x={area.x + area.width / 2}
                  y={area.y + area.height / 2}
                  text={area.name}
                  fontSize={14}
                  fontFamily="Arial"
                  fontStyle="bold"
                  fill="#1F2937"
                  align="center"
                  verticalAlign="middle"
                  offsetX={area.name.length * 3.5}
                  offsetY={7}
                />

                {/* Contador de equipos */}
                {equiposEnArea > 0 && (
                  <Circle
                    x={area.x + area.width - 15}
                    y={area.y + area.height - 15}
                    radius={12}
                    fill={isOvercrowded ? '#EF4444' : (isSelected ? '#3B82F6' : '#6B7280')}
                    stroke="#FFFFFF"
                    strokeWidth={2}
                  />
                )}

                {/* Número de equipos */}
                {equiposEnArea > 0 && (
                  <Text
                    x={area.x + area.width - 15}
                    y={area.y + area.height - 15}
                    text={equiposEnArea.toString()}
                    fontSize={10}
                    fontFamily="Arial"
                    fontStyle="bold"
                    fill="#FFFFFF"
                    align="center"
                    verticalAlign="middle"
                    offsetX={equiposEnArea.toString().length * 2.5}
                    offsetY={3.5}
                  />
                )}

                {/* Barra de capacidad */}
                {area.capacity && (
                  <Group>
                    {/* Fondo de la barra */}
                    <Rect
                      x={area.x + 10}
                      y={area.y + area.height - 25}
                      width={area.width - 20}
                      height={4}
                      fill="rgba(0, 0, 0, 0.1)"
                      cornerRadius={2}
                    />
                    {/* Barra de progreso */}
                    <Rect
                      x={area.x + 10}
                      y={area.y + area.height - 25}
                      width={(area.width - 20) * Math.min(capacityPercentage, 100) / 100}
                      height={4}
                      fill={isOvercrowded ? '#EF4444' : (capacityPercentage > 80 ? '#F59E0B' : '#10B981')}
                      cornerRadius={2}
                    />
                  </Group>
                )}

                {/* Indicador de sobrepoblación */}
                {isOvercrowded && (
                  <Text
                    x={area.x + area.width - 30}
                    y={area.y + 15}
                    text="⚠"
                    fontSize={16}
                    fontFamily="Arial"
                    fontStyle="bold"
                    fill="#EF4444"
                    align="center"
                    verticalAlign="middle"
                    offsetX={8}
                    offsetY={8}
                  />
                )}
              </Group>
            );
          })}

          {/* Equipos */}
          {equipos
            .filter(equipo => 
              equipo.x_coordinate && 
              equipo.y_coordinate && 
              equipo.x_coordinate !== 0 && 
              equipo.y_coordinate !== 0
            )
            .map((equipo) => {
              const isSelected = selectedEquipo?.id === equipo.id;
              const isDragged = localDraggedEquipo?.id === equipo.id;
              const isAnimating = animatingEquipos.has(equipo.id);
              const color = getEquipoColor(equipo.estado);

              return (
                <Group key={equipo.id}>
                  {/* Equipo principal */}
                  <Circle
                    x={equipo.x_coordinate}
                    y={equipo.y_coordinate}
                    radius={isAnimating ? 22 : 18}
                    fill={color}
                    stroke={isSelected ? '#1F2937' : '#FFFFFF'}
                    strokeWidth={isSelected ? 3 : 2}
                    shadowColor="rgba(0, 0, 0, 0.2)"
                    shadowBlur={isSelected ? 6 : (isAnimating ? 8 : 3)}
                    shadowOffset={{ x: 1, y: 1 }}
                    draggable
                    onDragStart={() => handleEquipoDragStart(equipo)}
                    onDragMove={handleEquipoDragMove}
                    onDragEnd={(e) => handleEquipoDragEnd(equipo, e)}
                    onClick={() => handleEquipoClick(equipo)}
                    onDblClick={() => handleEquipoDoubleClick(equipo)}
                    onContextMenu={(e) => handleEquipoRightClick(equipo, e)}
                    scaleX={isAnimating ? 1.2 : 1}
                    scaleY={isAnimating ? 1.2 : 1}
                    perfectDrawEnabled={false}
                    hitGraphEnabled={true}
                  />

                  {/* Efecto de pulso para equipos animados */}
                  {isAnimating && (
                    <Circle
                      x={equipo.x_coordinate}
                      y={equipo.y_coordinate}
                      radius={25}
                      stroke={color}
                      strokeWidth={2}
                      opacity={0.6}
                      scaleX={1.5}
                      scaleY={1.5}
                    />
                  )}

                  {/* Icono del equipo */}
                  <Text
                    x={equipo.x_coordinate}
                    y={equipo.y_coordinate}
                    text="💻" // Usar emoji por simplicidad, se puede mejorar con iconos SVG
                    fontSize={isAnimating ? 14 : 12}
                    align="center"
                    verticalAlign="middle"
                    offsetX={6}
                    offsetY={6}
                    scaleX={isAnimating ? 1.2 : 1}
                    scaleY={isAnimating ? 1.2 : 1}
                  />

                  {/* Etiqueta del equipo - solo si está seleccionado o animando */}
                  {(isSelected || isAnimating) && (
                    <>
                      <Rect
                        x={equipo.x_coordinate - 30}
                        y={equipo.y_coordinate - 35}
                        width={60}
                        height={16}
                        fill="rgba(0, 0, 0, 0.8)"
                        cornerRadius={8}
                        opacity={0.9}
                        listening={false}
                      />
                      <Text
                        x={equipo.x_coordinate}
                        y={equipo.y_coordinate - 27}
                        text={`${equipo.marca} ${equipo.modelo}`}
                        fontSize={10}
                        fontFamily="Arial"
                        fontStyle="bold"
                        fill="#FFFFFF"
                        align="center"
                        verticalAlign="middle"
                        offsetX={30}
                        offsetY={5}
                        listening={false}
                      />
                    </>
                  )}

                  {/* Indicador de estado */}
                  <Circle
                    x={equipo.x_coordinate + 12}
                    y={equipo.y_coordinate + 12}
                    radius={isAnimating ? 5 : 4}
                    fill={color}
                    stroke="#FFFFFF"
                    strokeWidth={1}
                    scaleX={isAnimating ? 1.2 : 1}
                    scaleY={isAnimating ? 1.2 : 1}
                  />
                </Group>
              );
            })}

          {/* Previsualización de creación de área */}
          {areaCreation.isCreating && (
            <Group>
              <Rect
                x={Math.min(areaCreation.startX, areaCreation.currentX)}
                y={Math.min(areaCreation.startY, areaCreation.currentY)}
                width={Math.abs(areaCreation.currentX - areaCreation.startX)}
                height={Math.abs(areaCreation.currentY - areaCreation.startY)}
                fill="rgba(59, 130, 246, 0.3)"
                stroke="#3B82F6"
                strokeWidth={2}
                cornerRadius={8}
                dash={[5, 5]}
              />
              <Text
                x={(areaCreation.startX + areaCreation.currentX) / 2}
                y={(areaCreation.startY + areaCreation.currentY) / 2}
                text="Nueva Área"
                fontSize={12}
                fontFamily="Arial"
                fontStyle="bold"
                fill="#1F2937"
                align="center"
                verticalAlign="middle"
                offsetX={35}
                offsetY={6}
              />
            </Group>
          )}
        </Layer>
      </Stage>

      {/* Menú contextual */}
      {contextMenu.show && (
        <div
          className="fixed bg-white rounded-lg shadow-lg border z-50 py-2 min-w-[150px]"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
        >
          <button
            onClick={handleRemoveFromContext}
            className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 flex items-center gap-2"
          >
            <ExclamationTriangleIcon className="h-4 w-4" />
            Eliminar del mapa
          </button>
        </div>
      )}

      {/* Controles del mapa */}
      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border p-4 z-10">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Controles del Mapa
          </h3>
          <button
            onClick={centerMap}
            className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Centrar mapa"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
        </div>
        <div className="text-sm text-gray-700 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <span><strong>Arrastrar:</strong> Mover equipos</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span><strong>Pan:</strong> Arrastrar espacio vacío</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-purple-500"></div>
            <span><strong>Zoom:</strong> Rueda del mouse</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <span><strong>Clic:</strong> Seleccionar equipo</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
            <span><strong>Doble clic:</strong> Ver detalles</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-pink-500"></div>
            <span><strong>Clic derecho:</strong> Menú contextual</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
            <span><strong>Crear área:</strong> Arrastrar en modo área</span>
          </div>
          <div className="pt-2 border-t border-gray-200">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Zoom: {Math.round(stageScale * 100)}%</span>
              <button
                onClick={() => setStageScale(1)}
                className="text-blue-600 hover:text-blue-800"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Información del área seleccionada */}
      {selectedArea && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-white p-3 rounded-lg shadow-lg border">
          <h4 className="font-semibold text-gray-900">{selectedArea.name}</h4>
          <p className="text-sm text-gray-600">
            Equipos: {getEquiposEnArea(selectedArea)}
            {selectedArea.capacity && ` / ${selectedArea.capacity}`}
          </p>
        </div>
      )}
    </div>
  );
};

export default OfficeMapKonva;
