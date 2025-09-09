import React, { useRef, useEffect, useState } from 'react';
import { MapPinIcon, ComputerDesktopIcon, PrinterIcon, PhoneIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';
import { generateUniqueAreaId } from '../../utils/idGenerator';

const OfficeMap = ({ 
  equipos, 
  onEquipoSelect, 
  selectedEquipo, 
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
  const canvasRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [selectedArea, setSelectedArea] = useState(null);
  const [isDraggingEquipo, setIsDraggingEquipo] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragPreview, setDragPreview] = useState({ x: 0, y: 0, equipo: null });
  const [localDraggedEquipo, setLocalDraggedEquipo] = useState(null);
  const [clickTimeout, setClickTimeout] = useState(null);
  const [contextMenu, setContextMenu] = useState({ show: false, x: 0, y: 0, equipo: null });
  const [areaCreation, setAreaCreation] = useState({ isCreating: false, startX: 0, startY: 0, currentX: 0, currentY: 0 });
  const [editingArea, setEditingArea] = useState(null);

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
      default:
        return MapPinIcon;
    }
  };

  // Colores por estado
  const getEquipoColor = (estado) => {
    switch (estado?.toLowerCase()) {
      case 'activo':
        return '#10B981'; // green
      case 'mantenimiento':
        return '#F59E0B'; // yellow
      case 'dañado':
        return '#EF4444'; // red
      case 'inactivo':
        return '#6B7280'; // gray
      default:
        return '#3B82F6'; // blue
    }
  };

  // Dibujar el mapa de oficina
  const drawMap = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    // Limpiar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Aplicar zoom y pan
    ctx.save();
    ctx.translate(panOffset.x, panOffset.y);
    ctx.scale(zoom, zoom);

    // Dibujar grid
    if (showGrid) {
      drawGrid(ctx, canvas.width, canvas.height);
    }

    // Dibujar áreas de la oficina
    officeAreas.forEach(area => {
      drawArea(ctx, area);
    });

    // Debug: verificar equipos duplicados
    const equiposConUbicacion = equipos.filter(equipo => 
      equipo.x_coordinate && equipo.y_coordinate && equipo.x_coordinate !== 0 && equipo.y_coordinate !== 0
    );
    console.log('Total equipos:', equipos.length);
    console.log('Equipos con ubicación:', equiposConUbicacion.length);
    
    // Dibujar equipos (solo los que tienen ubicación válida)
    equiposConUbicacion.forEach((equipo) => {
      // No dibujar el equipo si está siendo arrastrado (se dibuja en la previsualización)
      if (!(isDraggingEquipo && localDraggedEquipo?.id === equipo.id)) {
        drawEquipo(ctx, equipo);
      }
    });

    // Dibujar previsualización del arrastre
    if (isDraggingEquipo && localDraggedEquipo) {
      drawDragPreview(ctx, dragPreview.x, dragPreview.y, localDraggedEquipo);
    }

    // Dibujar previsualización de creación de área
    if (areaCreation.isCreating) {
      drawAreaPreview(ctx, areaCreation);
    }

    ctx.restore();
  };

  // Dibujar grid
  const drawGrid = (ctx, width, height) => {
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);

    const gridSize = 50;
    const startX = (panOffset.x % gridSize) - gridSize;
    const startY = (panOffset.y % gridSize) - gridSize;

    for (let x = startX; x < width / zoom; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height / zoom);
      ctx.stroke();
    }

    for (let y = startY; y < height / zoom; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width / zoom, y);
      ctx.stroke();
    }

    ctx.setLineDash([]);
  };

  // Dibujar un área de la oficina
  const drawArea = (ctx, area) => {
    const isSelected = selectedArea?.id === area.id;
    
    // Sombra del área
    ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;
    
    // Fondo del área con gradiente
    const gradient = ctx.createLinearGradient(area.x, area.y, area.x, area.y + area.height);
    gradient.addColorStop(0, lightenColor(area.color, 5));
    gradient.addColorStop(1, area.color);
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(area.x, area.y, area.width, area.height, 8);
    ctx.fill();

    // Resetear sombra
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Borde del área mejorado
    ctx.strokeStyle = isSelected ? '#3B82F6' : area.borderColor;
    ctx.lineWidth = isSelected ? 3 : 2;
    ctx.beginPath();
    ctx.roundRect(area.x, area.y, area.width, area.height, 8);
    ctx.stroke();

    // Efecto de brillo interno si está seleccionada
    if (isSelected) {
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(area.x + 1, area.y + 1, area.width - 2, area.height - 2, 6);
      ctx.stroke();
    }

    // Nombre del área con mejor tipografía
    ctx.fillStyle = isSelected ? '#1F2937' : '#374151';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(area.name, area.x + area.width / 2, area.y + area.height / 2);

    // Contador de equipos en el área con mejor diseño
    const equiposEnArea = equipos.filter(equipo => 
      equipo.x_coordinate && 
      equipo.y_coordinate && 
      equipo.x_coordinate !== 0 && 
      equipo.y_coordinate !== 0 &&
      equipo.x_coordinate >= area.x && 
      equipo.x_coordinate <= area.x + area.width &&
      equipo.y_coordinate >= area.y && 
      equipo.y_coordinate <= area.y + area.height
    ).length;

    // Verificar sobrepoblación
    const isOvercrowded = area.capacity && equiposEnArea > area.capacity;
    const capacityPercentage = area.capacity ? (equiposEnArea / area.capacity) * 100 : 0;

    if (equiposEnArea > 0) {
      const badgeX = area.x + area.width - 15;
      const badgeY = area.y + area.height - 15;
      const badgeRadius = 12;
      
      // Fondo del badge con color según sobrepoblación
      ctx.fillStyle = isOvercrowded ? '#EF4444' : (isSelected ? '#3B82F6' : '#6B7280');
      ctx.beginPath();
      ctx.arc(badgeX, badgeY, badgeRadius, 0, 2 * Math.PI);
      ctx.fill();
      
      // Borde del badge
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Texto del badge
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(equiposEnArea.toString(), badgeX, badgeY);
    }

    // Mostrar barra de capacidad si está definida
    if (area.capacity) {
      const barWidth = area.width - 20;
      const barHeight = 4;
      const barX = area.x + 10;
      const barY = area.y + area.height - 25;
      
      // Fondo de la barra
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(barX, barY, barWidth, barHeight);
      
      // Barra de progreso
      const progressWidth = (barWidth * Math.min(capacityPercentage, 100)) / 100;
      ctx.fillStyle = isOvercrowded ? '#EF4444' : (capacityPercentage > 80 ? '#F59E0B' : '#10B981');
      ctx.fillRect(barX, barY, progressWidth, barHeight);
    }

    // Indicador de sobrepoblación
    if (isOvercrowded) {
      const warningX = area.x + area.width - 30;
      const warningY = area.y + 15;
      
      // Icono de advertencia
      ctx.fillStyle = '#EF4444';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚠', warningX, warningY);
    }
  };

  // Dibujar previsualización de creación de área
  const drawAreaPreview = (ctx, areaCreation) => {
    const x = Math.min(areaCreation.startX, areaCreation.currentX);
    const y = Math.min(areaCreation.startY, areaCreation.currentY);
    const width = Math.abs(areaCreation.currentX - areaCreation.startX);
    const height = Math.abs(areaCreation.currentY - areaCreation.startY);

    if (width < 5 || height < 5) return;

    // Fondo semitransparente
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#3B82F6';
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 8);
    ctx.fill();

    // Borde punteado
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 8);
    ctx.stroke();
    ctx.setLineDash([]);

    // Texto de previsualización
    ctx.fillStyle = '#1F2937';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Nueva Área', x + width / 2, y + height / 2);

    ctx.globalAlpha = 1;
  };

  // Dibujar previsualización del arrastre
  const drawDragPreview = (ctx, x, y, equipo) => {
    const radius = 18;
    const color = getEquipoColor(equipo.estado);

    // Sombra de la previsualización
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 6;

    // Círculo con gradiente
    ctx.globalAlpha = 0.8;
    const gradient = ctx.createRadialGradient(x - 3, y - 3, 0, x, y, radius);
    gradient.addColorStop(0, lightenColor(color, 20));
    gradient.addColorStop(0.7, color);
    gradient.addColorStop(1, darkenColor(color, 10));
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fill();

    // Resetear sombra
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Borde punteado animado
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    const dashOffset = (Date.now() * 0.01) % 10;
    ctx.setLineDash([5, 5]);
    ctx.lineDashOffset = -dashOffset;
    ctx.stroke();
    ctx.setLineDash([]);

    // Icono
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(equipo.tipo?.charAt(0)?.toUpperCase() || '?', x, y);

    // Etiqueta mejorada
    const labelText = equipo.marca || 'Sin marca';
    const labelWidth = ctx.measureText(labelText).width + 12;
    const labelHeight = 16;
    const labelX = x - labelWidth / 2;
    const labelY = y + radius + 8;

    // Fondo de etiqueta con bordes redondeados
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.beginPath();
    ctx.roundRect(labelX, labelY, labelWidth, labelHeight, 8);
    ctx.fill();

    // Texto de etiqueta
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(labelText, x, labelY + 11);

    // Resetear transparencia
    ctx.globalAlpha = 1;
  };

  // Dibujar un equipo
  const drawEquipo = (ctx, equipo) => {
    // No dibujar si está siendo arrastrado (se maneja en drawDragPreview)
    if (isDraggingEquipo && localDraggedEquipo?.id === equipo.id) {
      return;
    }

    let x = equipo.x_coordinate;
    let y = equipo.y_coordinate;
    let radius = 18; // Aumentado para mejor visibilidad
    const color = getEquipoColor(equipo.estado);
    const isSelected = selectedEquipo?.id === equipo.id;
    const isNewlyPlaced = newlyPlacedEquipo?.id === equipo.id;

    // Efecto de rebote para equipos recién colocados
    if (isNewlyPlaced) {
      const bounceScale = 1 + Math.sin(Date.now() * 0.01) * 0.3;
      radius = radius * bounceScale;
    }

    // Sombra mejorada
    if (isSelected) {
      ctx.shadowColor = 'rgba(59, 130, 246, 0.4)';
      ctx.shadowBlur = 15;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 4;
    } else {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2;
    }

    // Círculo de fondo con gradiente mejorado
    const gradient = ctx.createRadialGradient(x - 3, y - 3, 0, x, y, radius);
    gradient.addColorStop(0, lightenColor(color, 10));
    gradient.addColorStop(0.7, color);
    gradient.addColorStop(1, darkenColor(color, 10));
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fill();

    // Borde con efecto de profundidad mejorado
    ctx.strokeStyle = isSelected ? '#3B82F6' : '#FFFFFF';
    ctx.lineWidth = isSelected ? 3 : 1.5;
    ctx.stroke();

    // Efecto de brillo interno
    if (isSelected) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, radius - 3, 0, 2 * Math.PI);
      ctx.stroke();
    }

    // Resetear sombra
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Icono mejorado
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(equipo.tipo?.charAt(0)?.toUpperCase() || '?', x, y);

    // Etiqueta mejorada con fondo redondeado
    const labelText = equipo.marca || 'Sin marca';
    const labelWidth = ctx.measureText(labelText).width + 12;
    const labelHeight = 16;
    const labelX = x - labelWidth / 2;
    const labelY = y + radius + 8;

    // Fondo de etiqueta con bordes redondeados
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.beginPath();
    ctx.roundRect(labelX, labelY, labelWidth, labelHeight, 8);
    ctx.fill();

    // Texto de etiqueta
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(labelText, x, labelY + 11);

    // Indicador de estado (punto pequeño)
    if (equipo.estado) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x + radius - 4, y - radius + 4, 4, 0, 2 * Math.PI);
      ctx.fill();
      
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  };

  // Funciones auxiliares para colores
  const lightenColor = (color, percent) => {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  };

  const darkenColor = (color, percent) => {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) - amt;
    const G = (num >> 8 & 0x00FF) - amt;
    const B = (num & 0x0000FF) - amt;
    return "#" + (0x1000000 + (R > 255 ? 255 : R < 0 ? 0 : R) * 0x10000 +
      (G > 255 ? 255 : G < 0 ? 0 : G) * 0x100 +
      (B > 255 ? 255 : B < 0 ? 0 : B)).toString(16).slice(1);
  };

  // Manejar clics en el canvas
  const handleCanvasClick = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left - panOffset.x) / zoom;
    const y = (event.clientY - rect.top - panOffset.y) / zoom;

    // Buscar área clickeada
    const clickedArea = officeAreas.find(area => 
      x >= area.x && x <= area.x + area.width &&
      y >= area.y && y <= area.y + area.height
    );

    if (clickedArea) {
      setSelectedArea(clickedArea);
      onAreaSelect(clickedArea);
      return;
    }

    // Buscar equipo clickeado
    const clickedEquipo = equipos.find(equipo => {
      if (!equipo.x_coordinate || !equipo.y_coordinate || equipo.x_coordinate === 0 || equipo.y_coordinate === 0) return false;
      const dx = x - equipo.x_coordinate;
      const dy = y - equipo.y_coordinate;
      return Math.sqrt(dx * dx + dy * dy) <= 15;
    });

    if (clickedEquipo) {
      // Clic simple - solo seleccionar
      console.log('Equipo clickeado:', clickedEquipo);
      console.log('Coordenadas del equipo:', clickedEquipo.x_coordinate, clickedEquipo.y_coordinate);
      onEquipoSelect(clickedEquipo);
    } else {
      console.log('No se clickeó ningún equipo');
      onEquipoSelect(null);
    }
  };

  // Manejar doble clic
  const handleCanvasDoubleClick = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left - panOffset.x) / zoom;
    const y = (event.clientY - rect.top - panOffset.y) / zoom;

    // Buscar equipo clickeado
    const clickedEquipo = equipos.find(equipo => {
      if (!equipo.x_coordinate || !equipo.y_coordinate || equipo.x_coordinate === 0 || equipo.y_coordinate === 0) return false;
      const dx = x - equipo.x_coordinate;
      const dy = y - equipo.y_coordinate;
      return Math.sqrt(dx * dx + dy * dy) <= 15;
    });

    if (clickedEquipo) {
      // Limpiar timeout de clic simple
      if (clickTimeout) {
        clearTimeout(clickTimeout);
        setClickTimeout(null);
      }
      // Doble clic - abrir modal
      console.log('Doble clic en equipo:', clickedEquipo);
      onEquipoSelect(clickedEquipo);
    }
  };

  // Manejar clic derecho
  const handleCanvasRightClick = (event) => {
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left - panOffset.x) / zoom;
    const y = (event.clientY - rect.top - panOffset.y) / zoom;

    // Buscar equipo clickeado
    const clickedEquipo = equipos.find(equipo => {
      if (!equipo.x_coordinate || !equipo.y_coordinate || equipo.x_coordinate === 0 || equipo.y_coordinate === 0) return false;
      const dx = x - equipo.x_coordinate;
      const dy = y - equipo.y_coordinate;
      return Math.sqrt(dx * dx + dy * dy) <= 15;
    });

    if (clickedEquipo) {
      // Mostrar menú contextual
      setContextMenu({
        show: true,
        x: event.clientX,
        y: event.clientY,
        equipo: clickedEquipo
      });
    } else {
      // Ocultar menú contextual si se clickea en espacio vacío
      setContextMenu({ show: false, x: 0, y: 0, equipo: null });
    }
  };

  // Cerrar menú contextual
  const closeContextMenu = () => {
    setContextMenu({ show: false, x: 0, y: 0, equipo: null });
  };

  // Manejar eliminación desde menú contextual
  const handleRemoveFromContext = () => {
    if (contextMenu.equipo && onEquipoRemove) {
      onEquipoRemove(contextMenu.equipo);
      closeContextMenu();
    }
  };

  // Manejar arrastre
  const handleMouseDown = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left - panOffset.x) / zoom;
    const y = (event.clientY - rect.top - panOffset.y) / zoom;

    // Si estamos en modo de creación de área
    if (isCreatingArea) {
      setAreaCreation({
        isCreating: true,
        startX: x,
        startY: y,
        currentX: x,
        currentY: y
      });
      return;
    }

    // Buscar equipo clickeado para arrastrar
    const clickedEquipo = equipos.find(equipo => {
      if (!equipo.x_coordinate || !equipo.y_coordinate || equipo.x_coordinate === 0 || equipo.y_coordinate === 0) return false;
      const dx = x - equipo.x_coordinate;
      const dy = y - equipo.y_coordinate;
      return Math.sqrt(dx * dx + dy * dy) <= 15;
    });

    if (clickedEquipo) {
      setIsDraggingEquipo(true);
      setLocalDraggedEquipo(clickedEquipo);
      setDragStart({
        x: event.clientX - panOffset.x,
        y: event.clientY - panOffset.y
      });
      setDragOffset({ x: 0, y: 0 });
    } else {
      setIsDragging(true);
      setDragStart({
        x: event.clientX - panOffset.x,
        y: event.clientY - panOffset.y
      });
    }
  };

  const handleMouseMove = (event) => {
    if (isDraggingEquipo && localDraggedEquipo) {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = (event.clientX - rect.left - panOffset.x) / zoom;
      const mouseY = (event.clientY - rect.top - panOffset.y) / zoom;

      // Calcular el offset desde la posición original
      const offsetX = mouseX - localDraggedEquipo.x_coordinate;
      const offsetY = mouseY - localDraggedEquipo.y_coordinate;

      setDragOffset({ x: offsetX, y: offsetY });
      
      // Actualizar previsualización
      setDragPreview({ 
        x: mouseX, 
        y: mouseY, 
        equipo: localDraggedEquipo 
      });
    } else if (isDragging) {
      setPanOffset({
        x: event.clientX - dragStart.x,
        y: event.clientY - dragStart.y
      });
    } else if (areaCreation.isCreating) {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = (event.clientX - rect.left - panOffset.x) / zoom;
      const mouseY = (event.clientY - rect.top - panOffset.y) / zoom;

      setAreaCreation(prev => ({
        ...prev,
        currentX: mouseX,
        currentY: mouseY
      }));
    }
  };

  const handleMouseUp = () => {
    if (isDraggingEquipo && localDraggedEquipo && onEquipoMove) {
      // Calcular la nueva posición final
      const newX = localDraggedEquipo.x_coordinate + dragOffset.x;
      const newY = localDraggedEquipo.y_coordinate + dragOffset.y;

      // Snap to grid si está habilitado
      let finalX = newX;
      let finalY = newY;
      
      if (snapToGrid) {
        const gridSize = 25;
        finalX = Math.round(newX / gridSize) * gridSize;
        finalY = Math.round(newY / gridSize) * gridSize;
      } else {
        finalX = Math.round(newX);
        finalY = Math.round(newY);
      }

      // Crear el equipo actualizado con la nueva posición
      const updatedEquipo = {
        ...localDraggedEquipo,
        x_coordinate: finalX,
        y_coordinate: finalY
      };

      // Guardar la nueva posición del equipo en la base de datos
      onEquipoMove(updatedEquipo);
    } else if (areaCreation.isCreating) {
      // Finalizar creación de área
      const width = Math.abs(areaCreation.currentX - areaCreation.startX);
      const height = Math.abs(areaCreation.currentY - areaCreation.startY);
      
      if (width > 20 && height > 20) { // Mínimo tamaño para crear área
        const newArea = {
          id: generateUniqueAreaId(),
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
    }
    
    setIsDragging(false);
    setIsDraggingEquipo(false);
    setLocalDraggedEquipo(null);
    setDragOffset({ x: 0, y: 0 });
    setDragPreview({ x: 0, y: 0, equipo: null });
  };

  // Redimensionar canvas
  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    drawMap();
  };

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (clickTimeout) {
        clearTimeout(clickTimeout);
      }
    };
  }, []);

  // Agregar event listener no pasivo para wheel
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheelNonPassive = (event) => {
      event.preventDefault();
      event.stopPropagation();
      const delta = event.deltaY > 0 ? 0.9 : 1.1;
      setZoom(prev => Math.max(0.5, Math.min(3, prev * delta)));
    };

    canvas.addEventListener('wheel', handleWheelNonPassive, { passive: false });

    return () => {
      canvas.removeEventListener('wheel', handleWheelNonPassive);
    };
  }, []);

  useEffect(() => {
    drawMap();
  }, [equipos, selectedEquipo, selectedArea, panOffset, zoom, showGrid, localDraggedEquipo, newlyPlacedEquipo, dragPreview, isDraggingEquipo]);

  // Cerrar menú contextual al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (contextMenu.show) {
        closeContextMenu();
      }
    };

    if (contextMenu.show) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu.show]);


  return (
    <div className="relative w-full h-full bg-gray-50">
      {/* Controles mejorados */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 p-2 flex gap-2">
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              showGrid 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            title="Mostrar/ocultar cuadrícula"
          >
            <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Grid
          </button>
          <button
            onClick={() => setSnapToGrid(!snapToGrid)}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              snapToGrid 
                ? 'bg-green-600 text-white shadow-md' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            title="Alinear a cuadrícula"
          >
            <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Snap
          </button>
          <button
            onClick={() => {
              setPanOffset({ x: 0, y: 0 });
              setZoom(1);
            }}
            className="px-3 py-2 rounded-md text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all duration-200"
            title="Resetear vista"
          >
            <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reset
          </button>
        </div>
      </div>

      {/* Zoom controls mejorados */}
      <div className="absolute top-4 right-4 z-10">
        <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 p-2 flex flex-col gap-1">
          <button
            onClick={() => setZoom(prev => Math.min(3, prev * 1.2))}
            className="w-8 h-8 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all duration-200 flex items-center justify-center"
            title="Acercar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
          <div className="px-2 py-1 text-xs text-center text-gray-500 font-medium">
            {Math.round(zoom * 100)}%
          </div>
          <button
            onClick={() => setZoom(prev => Math.max(0.5, prev * 0.8))}
            className="w-8 h-8 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all duration-200 flex items-center justify-center"
            title="Alejar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className={`w-full h-full ${isDraggingEquipo ? 'cursor-grabbing' : 'cursor-grab'}`}
        onClick={handleCanvasClick}
        onDoubleClick={handleCanvasDoubleClick}
        onContextMenu={handleCanvasRightClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ touchAction: 'none' }}
      />

      {/* Leyenda mejorada */}
      <div className="absolute bottom-4 left-4 z-10 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          Estados de Equipos
        </h3>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full bg-green-500 shadow-sm border border-white"></div>
            <span className="text-sm text-gray-700 font-medium">Activo</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full bg-yellow-500 shadow-sm border border-white"></div>
            <span className="text-sm text-gray-700 font-medium">Mantenimiento</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full bg-red-500 shadow-sm border border-white"></div>
            <span className="text-sm text-gray-700 font-medium">Dañado</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full bg-gray-500 shadow-sm border border-white"></div>
            <span className="text-sm text-gray-700 font-medium">Inactivo</span>
          </div>
        </div>
      </div>

      {/* Instrucciones mejoradas */}
      <div className="absolute bottom-4 right-4 z-10 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 p-4 max-w-sm">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Controles del Mapa
        </h3>
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
            <div className="w-2 h-2 rounded-full bg-orange-500"></div>
            <span><strong>Snap:</strong> Alinear a grid</span>
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
        </div>
      </div>

      {/* Información del área seleccionada */}
      {selectedArea && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-white p-3 rounded-lg shadow-lg border">
          <div className="flex items-center gap-2">
            <BuildingOfficeIcon className="h-5 w-5 text-blue-600" />
            <span className="font-medium text-gray-900">{selectedArea.name}</span>
          </div>
        </div>
      )}

      {/* Indicador de arrastre mejorado */}
      {isDraggingEquipo && localDraggedEquipo && (
        <div className="absolute top-4 right-1/2 transform translate-x-1/2 z-10 bg-blue-600 text-white p-4 rounded-xl shadow-xl border border-blue-500">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full bg-white animate-pulse"></div>
            <div className="flex flex-col">
              <span className="font-semibold text-sm">
                Arrastrando Equipo
              </span>
              <span className="text-xs text-blue-100">
                {localDraggedEquipo.marca} {localDraggedEquipo.modelo}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Menú contextual mejorado */}
      {contextMenu.show && (
        <div
          className="fixed z-50 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl shadow-xl py-2 min-w-[180px]"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
        >
          <div className="px-4 py-3 text-sm text-gray-800 border-b border-gray-100 bg-gray-50/50">
            <div className="font-semibold">{contextMenu.equipo?.marca}</div>
            <div className="text-xs text-gray-500">{contextMenu.equipo?.modelo}</div>
          </div>
          <button
            onClick={handleRemoveFromContext}
            className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span className="font-medium">Eliminar del mapa</span>
          </button>
        </div>
      )}

      {/* Debug info */}
      {selectedEquipo && (
        <div className="absolute top-20 left-4 z-10 bg-yellow-200 text-black p-2 rounded text-xs">
          Selected: {selectedEquipo.marca} {selectedEquipo.modelo}
        </div>
      )}

      {/* Indicador de drop zone mejorado */}
      {isDraggingFromCard && (
        <div className="absolute inset-0 z-5 bg-blue-50/80 backdrop-blur-sm border-2 border-dashed border-blue-400 flex items-center justify-center">
          <div className="bg-white/95 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border-2 border-blue-400 animate-pulse">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center shadow-lg">
                <MapPinIcon className="h-10 w-10 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Suelta el equipo aquí
              </h3>
              <p className="text-sm text-gray-600 mb-2">
                {draggedEquipo?.marca} {draggedEquipo?.modelo}
              </p>
              <div className="w-12 h-1 bg-blue-400 rounded-full mx-auto"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfficeMap;
