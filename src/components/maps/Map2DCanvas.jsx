import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { 
  ComputerDesktopIcon, 
  PrinterIcon, 
  PhoneIcon, 
  BuildingOfficeIcon,
  MapPinIcon,
  PlusIcon,
  EyeIcon,
  EyeSlashIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

// Componente de mapa 2D con Canvas HTML5
const Map2DCanvas = ({
  equipos = [],
  onEquipoSelect,
  selectedEquipo,
  onEquipoMove,
  onEquipoMoveEnd,
  onEquipoRemove,
  areas = [],
  onAreasChange,
  isCreatingArea = false,
  onAreaCreated,
  onError
}) => {
  const canvasRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isCreatingAreaLocal, setIsCreatingAreaLocal] = useState(false);
  const [areaStart, setAreaStart] = useState(null);
  const [areaPreview, setAreaPreview] = useState(null);
  const [newAreaData, setNewAreaData] = useState(null);
  const [showAreaNameModal, setShowAreaNameModal] = useState(false);
  const [draggedEquipo, setDraggedEquipo] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [hoveredEquipo, setHoveredEquipo] = useState(null);
  const [selectedArea, setSelectedArea] = useState(null);
  const [hoveredArea, setHoveredArea] = useState(null);
  const [isResizingArea, setIsResizingArea] = useState(false);
  const [resizeHandle, setResizeHandle] = useState(null);
  const [resizeStart, setResizeStart] = useState(null);
  const [showAreaEditModal, setShowAreaEditModal] = useState(false);
  const [editingArea, setEditingArea] = useState(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  // Configuración del canvas
  const GRID_SIZE = 20;
  const EQUIPO_SIZE = 40;
  const AREA_MIN_SIZE = 50;
  const RESIZE_HANDLE_SIZE = 8;

  // Colores y estilos
  const colors = {
    equipo: {
      activo: '#10B981',
      mantenimiento: '#F59E0B',
      inactivo: '#EF4444',
      default: '#3B82F6'
    },
    area: {
      default: '#E5E7EB',
      border: '#9CA3AF',
      preview: '#3B82F6',
      selected: '#3B82F6'
    },
    grid: '#E5E7EB',
    background: '#F9FAFB'
  };

  // Obtener icono del equipo
  const getEquipoIcon = (tipo) => {
    switch (tipo?.toLowerCase()) {
      case 'computadora':
      case 'laptop':
        return ComputerDesktopIcon;
      case 'impresora':
        return PrinterIcon;
      case 'telefono':
        return PhoneIcon;
      default:
        return BuildingOfficeIcon;
    }
  };

  // Obtener color del equipo
  const getEquipoColor = (estado) => {
    return colors.equipo[estado?.toLowerCase()] || colors.equipo.default;
  };

  // Dibujar grid
  const drawGrid = (ctx) => {
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;
    
    // Líneas verticales
    for (let x = 0; x <= canvasSize.width; x += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasSize.height);
      ctx.stroke();
    }
    
    // Líneas horizontales
    for (let y = 0; y <= canvasSize.height; y += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasSize.width, y);
      ctx.stroke();
    }
  };

  // Dibujar área
  const drawArea = (ctx, area, isPreview = false, isSelected = false, isHovered = false) => {
    const x = area.x;
    const y = area.y;
    const width = area.width || 200;
    const height = area.height || 100;

    // Fondo del área
    ctx.fillStyle = isPreview ? 'rgba(59, 130, 246, 0.1)' : 
                    isHovered ? 'rgba(59, 130, 246, 0.1)' : colors.area.default;
    ctx.fillRect(x, y, width, height);

    // Borde del área
    ctx.strokeStyle = isPreview ? colors.area.preview : 
                     isSelected ? colors.area.selected : 
                     isHovered ? '#3B82F6' : colors.area.border;
    ctx.lineWidth = isPreview ? 3 : isSelected ? 3 : 2;
    ctx.setLineDash(isPreview ? [5, 5] : []);
    ctx.strokeRect(x, y, width, height);
    ctx.setLineDash([]);

    // Texto del área
    ctx.fillStyle = '#374151';
    ctx.font = '14px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(area.name || 'Nueva Área', x + 8, y + 20);

    // Contador de equipos
    const equiposInArea = equipos.filter(equipo => 
      equipo.x_coordinate >= x && 
      equipo.x_coordinate <= x + width &&
      equipo.y_coordinate >= y && 
      equipo.y_coordinate <= y + height
    );

    ctx.fillStyle = '#6B7280';
    ctx.font = '12px Inter, sans-serif';
    ctx.fillText(`${equiposInArea.length} equipos`, x + 8, y + 40);

    // Dibujar handles de redimensionamiento si está seleccionada
    if (isSelected && !isPreview) {
      drawResizeHandles(ctx, x, y, width, height);
    }
  };

  // Dibujar handles de redimensionamiento
  const drawResizeHandles = (ctx, x, y, width, height) => {
    const handles = [
      { x: x - RESIZE_HANDLE_SIZE/2, y: y - RESIZE_HANDLE_SIZE/2, type: 'nw' },
      { x: x + width/2 - RESIZE_HANDLE_SIZE/2, y: y - RESIZE_HANDLE_SIZE/2, type: 'n' },
      { x: x + width - RESIZE_HANDLE_SIZE/2, y: y - RESIZE_HANDLE_SIZE/2, type: 'ne' },
      { x: x + width - RESIZE_HANDLE_SIZE/2, y: y + height/2 - RESIZE_HANDLE_SIZE/2, type: 'e' },
      { x: x + width - RESIZE_HANDLE_SIZE/2, y: y + height - RESIZE_HANDLE_SIZE/2, type: 'se' },
      { x: x + width/2 - RESIZE_HANDLE_SIZE/2, y: y + height - RESIZE_HANDLE_SIZE/2, type: 's' },
      { x: x - RESIZE_HANDLE_SIZE/2, y: y + height - RESIZE_HANDLE_SIZE/2, type: 'sw' },
      { x: x - RESIZE_HANDLE_SIZE/2, y: y + height/2 - RESIZE_HANDLE_SIZE/2, type: 'w' }
    ];

    handles.forEach(handle => {
      ctx.fillStyle = '#3B82F6';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.fillRect(handle.x, handle.y, RESIZE_HANDLE_SIZE, RESIZE_HANDLE_SIZE);
      ctx.strokeRect(handle.x, handle.y, RESIZE_HANDLE_SIZE, RESIZE_HANDLE_SIZE);
    });
  };

  // Dibujar equipo
  const drawEquipo = (ctx, equipo, isSelected = false, isHovered = false) => {
    const x = equipo.x_coordinate;
    const y = equipo.y_coordinate;
    const size = EQUIPO_SIZE;
    const color = getEquipoColor(equipo.estado);

    // Sombra
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    // Círculo del equipo
    ctx.fillStyle = color;
    ctx.strokeStyle = isSelected ? '#1D4ED8' : '#FFFFFF';
    ctx.lineWidth = isSelected ? 3 : 2;
    
    const scale = isHovered ? 1.1 : 1;
    const scaledSize = size * scale;
    const offsetX = (scaledSize - size) / 2;
    const offsetY = (scaledSize - size) / 2;

    ctx.beginPath();
    ctx.arc(x + size/2 - offsetX, y + size/2 - offsetY, scaledSize/2, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Icono del equipo (simulado con texto)
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const iconText = equipo.tipo?.toLowerCase() === 'computadora' ? '💻' :
                    equipo.tipo?.toLowerCase() === 'impresora' ? '🖨️' :
                    equipo.tipo?.toLowerCase() === 'telefono' ? '📞' : '🖥️';
    
    ctx.fillText(iconText, x + size/2 - offsetX, y + size/2 - offsetY);

    // Etiqueta del equipo
    if (isHovered || isSelected) {
      ctx.fillStyle = '#1F2937';
      ctx.font = '12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(equipo.marca, x + size/2 - offsetX, y + size + 15);
    }
  };

  // Dibujar vista previa del área
  const drawAreaPreview = (ctx, preview) => {
    if (!preview) return;
    
    drawArea(ctx, preview, true);
  };

  // Renderizar canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Limpiar canvas
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

    // Fondo
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

    // Dibujar grid
    drawGrid(ctx);

    // Dibujar áreas
    areas.forEach(area => {
      const isSelected = selectedArea && selectedArea.id === area.id;
      const isHovered = hoveredArea && hoveredArea.id === area.id;
      drawArea(ctx, area, false, isSelected, isHovered);
    });

    // Dibujar vista previa del área
    if (areaPreview) {
      drawAreaPreview(ctx, areaPreview);
    }

    // Dibujar equipos
    equipos.forEach(equipo => {
      if (equipo.x_coordinate && equipo.y_coordinate && 
          equipo.x_coordinate !== 0 && equipo.y_coordinate !== 0) {
        const isSelected = selectedEquipo && selectedEquipo.id === equipo.id;
        const isHovered = hoveredEquipo && hoveredEquipo.id === equipo.id;
        drawEquipo(ctx, equipo, isSelected, isHovered);
      }
    });
  }, [equipos, areas, selectedEquipo, hoveredEquipo, areaPreview, canvasSize]);

  // Efecto para renderizar cuando cambien los datos
  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Verificar si el clic está en un handle de redimensionamiento
  const getResizeHandle = (x, y, area) => {
    const handleX = area.x;
    const handleY = area.y;
    const handleWidth = area.width || 200;
    const handleHeight = area.height || 100;

    const handles = [
      { x: handleX - RESIZE_HANDLE_SIZE/2, y: handleY - RESIZE_HANDLE_SIZE/2, type: 'nw' },
      { x: handleX + handleWidth/2 - RESIZE_HANDLE_SIZE/2, y: handleY - RESIZE_HANDLE_SIZE/2, type: 'n' },
      { x: handleX + handleWidth - RESIZE_HANDLE_SIZE/2, y: handleY - RESIZE_HANDLE_SIZE/2, type: 'ne' },
      { x: handleX + handleWidth - RESIZE_HANDLE_SIZE/2, y: handleY + handleHeight/2 - RESIZE_HANDLE_SIZE/2, type: 'e' },
      { x: handleX + handleWidth - RESIZE_HANDLE_SIZE/2, y: handleY + handleHeight - RESIZE_HANDLE_SIZE/2, type: 'se' },
      { x: handleX + handleWidth/2 - RESIZE_HANDLE_SIZE/2, y: handleY + handleHeight - RESIZE_HANDLE_SIZE/2, type: 's' },
      { x: handleX - RESIZE_HANDLE_SIZE/2, y: handleY + handleHeight - RESIZE_HANDLE_SIZE/2, type: 'sw' },
      { x: handleX - RESIZE_HANDLE_SIZE/2, y: handleY + handleHeight/2 - RESIZE_HANDLE_SIZE/2, type: 'w' }
    ];

    return handles.find(handle => 
      x >= handle.x && x <= handle.x + RESIZE_HANDLE_SIZE &&
      y >= handle.y && y <= handle.y + RESIZE_HANDLE_SIZE
    );
  };

  // Manejar clic en el canvas
  const handleCanvasClick = useCallback((event) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // No procesar el clic si estamos arrastrando
    if (isDragging) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Verificar si se hizo clic en un equipo
    const clickedEquipo = equipos.find(equipo => {
      if (!equipo.x_coordinate || !equipo.y_coordinate) return false;
      
      const dx = x - equipo.x_coordinate;
      const dy = y - equipo.y_coordinate;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      return distance <= EQUIPO_SIZE / 2;
    });

    if (clickedEquipo) {
      onEquipoSelect?.(clickedEquipo);
      setSelectedArea(null); // Deseleccionar área
      return;
    }

    // Verificar si se hizo clic en un área
    const clickedArea = areas.find(area => {
      const areaX = area.x;
      const areaY = area.y;
      const areaWidth = area.width || 200;
      const areaHeight = area.height || 100;
      
      return x >= areaX && x <= areaX + areaWidth && 
             y >= areaY && y <= areaY + areaHeight;
    });

    if (clickedArea) {
      // Verificar si se hizo clic en un handle de redimensionamiento
      const resizeHandle = getResizeHandle(x, y, clickedArea);
      
      if (resizeHandle) {
        setSelectedArea(clickedArea);
        setIsResizingArea(true);
        setResizeHandle(resizeHandle.type);
        setResizeStart({ x, y, area: clickedArea });
        return;
      }

      // Seleccionar área
      setSelectedArea(clickedArea);
      return;
    }

    // Deseleccionar área si se hizo clic en espacio vacío
    setSelectedArea(null);

    // Si no se hizo clic en un equipo o área, manejar creación de área
    if (isCreatingAreaLocal) {
      if (!areaStart) {
        setAreaStart({ x, y });
        toast('Haz clic en la esquina opuesta para completar el área', { icon: 'ℹ️' });
      } else {
        const width = Math.abs(x - areaStart.x);
        const height = Math.abs(y - areaStart.y);
        const finalX = Math.min(x, areaStart.x);
        const finalY = Math.min(y, areaStart.y);
        
        if (width > AREA_MIN_SIZE && height > AREA_MIN_SIZE) {
          const newArea = {
            x: finalX,
            y: finalY,
            width,
            height,
            name: 'Nueva Área'
          };
          
          setNewAreaData(newArea);
          setShowAreaNameModal(true);
          setIsCreatingAreaLocal(false);
          setAreaStart(null);
          setAreaPreview(null);
        } else {
          toast.error('El área es muy pequeña. Intenta de nuevo con un área más grande.');
          setIsCreatingAreaLocal(false);
          setAreaStart(null);
          setAreaPreview(null);
        }
      }
    }
  }, [equipos, areas, onEquipoSelect, isCreatingAreaLocal, areaStart, isDragging]);

  // Manejar doble clic en el canvas
  const handleCanvasDoubleClick = useCallback((event) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Verificar si se hizo doble clic en un área
    const clickedArea = areas.find(area => {
      const areaX = area.x;
      const areaY = area.y;
      const areaWidth = area.width || 200;
      const areaHeight = area.height || 100;
      
      return x >= areaX && x <= areaX + areaWidth && 
             y >= areaY && y <= areaY + areaHeight;
    });

    if (clickedArea) {
      editArea(clickedArea);
    }
  }, [areas]);

  // Manejar movimiento del mouse
  const handleMouseMove = useCallback((event) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Manejar redimensionamiento de área
    if (isResizingArea && resizeStart && resizeHandle) {
      const deltaX = x - resizeStart.x;
      const deltaY = y - resizeStart.y;
      const area = resizeStart.area;
      
      let newX = area.x;
      let newY = area.y;
      let newWidth = area.width || 200;
      let newHeight = area.height || 100;

      switch (resizeHandle) {
        case 'nw':
          newX = area.x + deltaX;
          newY = area.y + deltaY;
          newWidth = (area.width || 200) - deltaX;
          newHeight = (area.height || 100) - deltaY;
          break;
        case 'n':
          newY = area.y + deltaY;
          newHeight = (area.height || 100) - deltaY;
          break;
        case 'ne':
          newY = area.y + deltaY;
          newWidth = (area.width || 200) + deltaX;
          newHeight = (area.height || 100) - deltaY;
          break;
        case 'e':
          newWidth = (area.width || 200) + deltaX;
          break;
        case 'se':
          newWidth = (area.width || 200) + deltaX;
          newHeight = (area.height || 100) + deltaY;
          break;
        case 's':
          newHeight = (area.height || 100) + deltaY;
          break;
        case 'sw':
          newX = area.x + deltaX;
          newWidth = (area.width || 200) - deltaX;
          newHeight = (area.height || 100) + deltaY;
          break;
        case 'w':
          newX = area.x + deltaX;
          newWidth = (area.width || 200) - deltaX;
          break;
      }

      // Aplicar límites mínimos
      if (newWidth < AREA_MIN_SIZE) {
        if (resizeHandle.includes('w')) {
          newX = area.x + (area.width || 200) - AREA_MIN_SIZE;
        }
        newWidth = AREA_MIN_SIZE;
      }
      if (newHeight < AREA_MIN_SIZE) {
        if (resizeHandle.includes('n')) {
          newY = area.y + (area.height || 100) - AREA_MIN_SIZE;
        }
        newHeight = AREA_MIN_SIZE;
      }

      // Actualizar área temporalmente
      const updatedArea = {
        ...area,
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight
      };

      setSelectedArea(updatedArea);
      onAreasChange?.(updatedArea);
      return;
    }

    // Solo manejar hover si no estamos arrastrando ni redimensionando
    if (!isDragging && !isResizingArea) {
      // Hover de equipos
      const hoveredEquipo = equipos.find(equipo => {
        if (!equipo.x_coordinate || !equipo.y_coordinate) return false;
        
        const dx = x - equipo.x_coordinate;
        const dy = y - equipo.y_coordinate;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        return distance <= EQUIPO_SIZE / 2;
      });

      // Hover de áreas
      const hoveredArea = areas.find(area => {
        const areaX = area.x;
        const areaY = area.y;
        const areaWidth = area.width || 200;
        const areaHeight = area.height || 100;
        
        return x >= areaX && x <= areaX + areaWidth && 
               y >= areaY && y <= areaY + areaHeight;
      });

      setHoveredEquipo(hoveredEquipo);
      setHoveredArea(hoveredArea);

      // Actualizar cursor
      let cursor = 'default';
      if (hoveredEquipo) {
        cursor = 'pointer';
      } else if (hoveredArea) {
        cursor = 'pointer';
      } else if (isCreatingAreaLocal) {
        cursor = 'crosshair';
      }
      canvas.style.cursor = cursor;
    }

    // Vista previa del área
    if (isCreatingAreaLocal && areaStart) {
      const width = Math.abs(x - areaStart.x);
      const height = Math.abs(y - areaStart.y);
      const finalX = Math.min(x, areaStart.x);
      const finalY = Math.min(y, areaStart.y);
      
      setAreaPreview({
        x: finalX,
        y: finalY,
        width,
        height,
        name: 'Nueva Área'
      });
    }
  }, [equipos, areas, isDragging, isResizingArea, resizeStart, resizeHandle, isCreatingAreaLocal, areaStart, onAreasChange]);

  // Manejar inicio de arrastre
  const handleMouseDown = useCallback((event) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Verificar si se hizo clic en un equipo
    const clickedEquipo = equipos.find(equipo => {
      if (!equipo.x_coordinate || !equipo.y_coordinate) return false;
      
      const dx = x - equipo.x_coordinate;
      const dy = y - equipo.y_coordinate;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      return distance <= EQUIPO_SIZE / 2;
    });

    if (clickedEquipo) {
      event.preventDefault(); // Prevenir selección de texto
      setDraggedEquipo(clickedEquipo);
      setIsDragging(true);
      setDragOffset({
        x: x - clickedEquipo.x_coordinate,
        y: y - clickedEquipo.y_coordinate
      });
      
      // Cambiar cursor a grabbing
      canvas.style.cursor = 'grabbing';
    }
  }, [equipos]);

  // Manejar fin de arrastre
  const handleMouseUp = useCallback(() => {
    if (isDragging && draggedEquipo) {
      setIsDragging(false);
      onEquipoMoveEnd?.(draggedEquipo, draggedEquipo.x_coordinate, draggedEquipo.y_coordinate, true);
      setDraggedEquipo(null);
      setDragOffset({ x: 0, y: 0 });
      
      // Restaurar cursor
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.style.cursor = 'default';
      }
      
      toast.success(`Ubicación de ${draggedEquipo.marca} actualizada`);
    }

    if (isResizingArea && selectedArea) {
      setIsResizingArea(false);
      setResizeHandle(null);
      setResizeStart(null);
      
      // Restaurar cursor
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.style.cursor = 'default';
      }
      
      toast.success(`Tamaño de área "${selectedArea.name}" actualizado`);
    }
  }, [isDragging, draggedEquipo, onEquipoMoveEnd, isResizingArea, selectedArea]);

  // Iniciar creación de área
  const startCreatingArea = () => {
    if (isCreatingAreaLocal) {
      setIsCreatingAreaLocal(false);
      setAreaStart(null);
      setAreaPreview(null);
      toast('Creación de área cancelada', { icon: '❌' });
    } else {
      setIsCreatingAreaLocal(true);
      setAreaStart(null);
      setAreaPreview(null);
      toast('Haz clic en dos puntos para crear un área', { icon: 'ℹ️' });
    }
  };

  // Confirmar creación de área
  const confirmAreaCreation = (areaName) => {
    if (newAreaData && areaName.trim()) {
      const newArea = {
        id: `area_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: areaName.trim(),
        x: newAreaData.x,
        y: newAreaData.y,
        width: newAreaData.width,
        height: newAreaData.height,
        color: '#E5E7EB',
        bgColor: '#F3F4F6',
        borderColor: '#9CA3AF',
        capacity: null,
        responsible: '',
        isCustom: true
      };

      onAreaCreated?.(newArea);
      setShowAreaNameModal(false);
      setNewAreaData(null);
      toast.success(`Área "${areaName}" creada`);
    }
  };

  // Cancelar creación de área
  const cancelAreaCreation = () => {
    setShowAreaNameModal(false);
    setNewAreaData(null);
    setIsCreatingAreaLocal(false);
    setAreaStart(null);
    setAreaPreview(null);
  };

  // Editar área
  const editArea = (area) => {
    setEditingArea(area);
    setShowAreaEditModal(true);
  };

  // Eliminar área
  const deleteArea = (area) => {
    if (confirm(`¿Estás seguro de que quieres eliminar el área "${area.name}"?`)) {
      const updatedAreas = areas.filter(a => a.id !== area.id);
      onAreasChange?.(updatedAreas);
      setSelectedArea(null);
      toast.success(`Área "${area.name}" eliminada`);
    }
  };

  // Guardar edición de área
  const saveAreaEdit = (updatedArea) => {
    const updatedAreas = areas.map(area => 
      area.id === updatedArea.id ? updatedArea : area
    );
    onAreasChange?.(updatedAreas);
    setSelectedArea(updatedArea);
    setShowAreaEditModal(false);
    setEditingArea(null);
    toast.success(`Área "${updatedArea.name}" actualizada`);
  };

  // Cancelar edición de área
  const cancelAreaEdit = () => {
    setShowAreaEditModal(false);
    setEditingArea(null);
  };

  // Manejar redimensionamiento del canvas
  useEffect(() => {
    const handleResize = () => {
      const container = canvasRef.current?.parentElement;
      if (container) {
        const rect = container.getBoundingClientRect();
        setCanvasSize({ width: rect.width, height: rect.height });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Manejar eventos globales de mouse para el arrastre
  useEffect(() => {
    const handleGlobalMouseMove = (event) => {
      if (isDragging && draggedEquipo) {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        const newX = x - dragOffset.x;
        const newY = y - dragOffset.y;
        
        // Actualizar posición del equipo
        const updatedEquipo = {
          ...draggedEquipo,
          x_coordinate: Math.max(0, Math.min(newX, canvasSize.width - EQUIPO_SIZE)),
          y_coordinate: Math.max(0, Math.min(newY, canvasSize.height - EQUIPO_SIZE))
        };
        
        setDraggedEquipo(updatedEquipo);
        onEquipoMove?.(updatedEquipo, updatedEquipo.x_coordinate, updatedEquipo.y_coordinate);
      }
    };

    const handleGlobalMouseUp = () => {
      if (isDragging && draggedEquipo) {
        setIsDragging(false);
        onEquipoMoveEnd?.(draggedEquipo, draggedEquipo.x_coordinate, draggedEquipo.y_coordinate, true);
        setDraggedEquipo(null);
        setDragOffset({ x: 0, y: 0 });
        
        // Restaurar cursor
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.style.cursor = 'default';
        }
        
        toast.success(`Ubicación de ${draggedEquipo.marca} actualizada`);
      }
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, draggedEquipo, dragOffset, onEquipoMove, onEquipoMoveEnd, canvasSize]);

  return (
    <div className={`relative bg-white rounded-lg shadow border ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Controles superiores */}
      {showControls && (
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-semibold text-gray-900">Editor de Mapas 2D</h3>
            <span className="text-sm text-gray-500">Powered by HTML5 Canvas</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={startCreatingArea}
              className={`flex items-center space-x-1 px-3 py-1.5 text-sm rounded-md transition-colors ${
                isCreatingAreaLocal 
                  ? 'bg-red-600 text-white hover:bg-red-700' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <PlusIcon className="w-4 h-4" />
              <span>{isCreatingAreaLocal ? 'Cancelar' : 'Crear Área'}</span>
            </button>
            
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
            >
              {isFullscreen ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
              <span>{isFullscreen ? 'Salir' : 'Pantalla Completa'}</span>
            </button>
            
            <button
              onClick={() => setShowControls(!showControls)}
              className="p-1.5 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <Cog6ToothIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Canvas 2D */}
      <div 
        style={{ height: isFullscreen ? 'calc(100vh - 80px)' : '500px' }}
        className="relative"
      >
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onDoubleClick={handleCanvasDoubleClick}
          className="w-full h-full cursor-default"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>

      {/* Panel de información */}
      <div className="absolute top-4 left-4 bg-white bg-opacity-90 rounded-lg p-3 shadow-lg">
        <div className="text-sm space-y-1">
          <div className="font-medium text-gray-900">Estado del Mapa 2D</div>
          <div className="text-gray-600">Equipos: {equipos.length}</div>
          <div className="text-gray-600">Áreas: {areas.length}</div>
          {isCreatingAreaLocal && (
            <div className="text-blue-600 font-medium">
              {areaStart ? 'Selecciona la segunda esquina' : 'Selecciona la primera esquina'}
            </div>
          )}
        </div>
      </div>

      {/* Panel de ayuda */}
      <div className="absolute top-4 right-4 bg-white bg-opacity-90 rounded-lg p-3 shadow-lg max-w-xs">
        <div className="text-sm space-y-2">
          <div className="font-medium text-gray-900">Controles 2D</div>
          <div className="text-gray-600 space-y-1">
            <div>• <strong>Seleccionar:</strong> Click en equipo/área</div>
            <div>• <strong>Mover:</strong> Click + arrastrar equipo</div>
            <div>• <strong>Redimensionar:</strong> Arrastrar handles de área</div>
            <div>• <strong>Crear área:</strong> Click en dos puntos</div>
            <div>• <strong>Editar área:</strong> Doble click en área</div>
          </div>
        </div>
      </div>

      {/* Menú contextual para área seleccionada */}
      {selectedArea && (
        <div className="absolute top-20 right-4 bg-white rounded-lg shadow-lg border p-2">
          <div className="text-sm font-medium text-gray-900 mb-2">
            {selectedArea.name}
          </div>
          <div className="space-y-1">
            <button
              onClick={() => editArea(selectedArea)}
              className="w-full text-left px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
            >
              ✏️ Editar nombre
            </button>
            <button
              onClick={() => deleteArea(selectedArea)}
              className="w-full text-left px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
            >
              🗑️ Eliminar área
            </button>
          </div>
        </div>
      )}

      {/* Información de estado */}
      <div className="absolute bottom-4 right-4 bg-white bg-opacity-90 px-3 py-2 rounded-lg shadow-sm border text-xs text-gray-600">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full animate-pulse ${
            isCreatingAreaLocal ? 'bg-blue-500' : 'bg-green-500'
          }`}></div>
          <span>
            {isCreatingAreaLocal 
              ? `Creando área... ${areaStart ? 'Haz clic en la esquina opuesta' : 'Haz clic en la primera esquina'}`
              : `Canvas 2D - ${equipos.length} equipos, ${areas.length} áreas`
            }
          </span>
        </div>
      </div>

      {/* Instrucciones flotantes cuando se está creando área */}
      {isCreatingAreaLocal && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg pointer-events-none z-10">
          <div className="text-center">
            <div className="font-medium">
              {areaStart ? 'Paso 2: Haz clic en la esquina opuesta' : 'Paso 1: Haz clic para comenzar'}
            </div>
            <div className="text-xs opacity-90 mt-1">
              Presiona Escape para cancelar
            </div>
          </div>
        </div>
      )}

      {/* Botón flotante cuando los controles están ocultos */}
      {!showControls && (
        <button
          onClick={() => setShowControls(true)}
          className="absolute top-4 right-4 p-2 bg-white bg-opacity-90 rounded-full shadow-sm hover:bg-opacity-100 transition-all"
        >
          <Cog6ToothIcon className="w-5 h-5 text-gray-600" />
        </button>
      )}

      {/* Modal de nombre de área */}
      {showAreaNameModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-[90vw]">
            <h3 className="text-lg font-semibold mb-4">Crear Nueva Área</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre del área
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ej: Sala de Servidores, Oficina Principal..."
                defaultValue="Nueva Área"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    confirmAreaCreation(e.target.value);
                  } else if (e.key === 'Escape') {
                    cancelAreaCreation();
                  }
                }}
              />
            </div>
            
            {newAreaData && (
              <div className="mb-4 p-3 bg-gray-50 rounded-md">
                <div className="text-sm text-gray-600">
                  <div>Dimensiones: {Math.round(newAreaData.width)} × {Math.round(newAreaData.height)} px</div>
                  <div>Posición: ({Math.round(newAreaData.x)}, {Math.round(newAreaData.y)})</div>
                </div>
              </div>
            )}
            
            <div className="flex justify-end space-x-2">
              <button
                onClick={cancelAreaCreation}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const input = document.querySelector('input[type="text"]');
                  confirmAreaCreation(input.value);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
              >
                Crear Área
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de edición de área */}
      {showAreaEditModal && editingArea && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-[90vw]">
            <h3 className="text-lg font-semibold mb-4">Editar Área</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del área
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  defaultValue={editingArea.name}
                  ref={(input) => input && input.focus()}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ancho (px)
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    defaultValue={editingArea.width || 200}
                    min={AREA_MIN_SIZE}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Alto (px)
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    defaultValue={editingArea.height || 100}
                    min={AREA_MIN_SIZE}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Posición X (px)
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    defaultValue={editingArea.x}
                    min={0}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Posición Y (px)
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    defaultValue={editingArea.y}
                    min={0}
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={cancelAreaEdit}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const nameInput = document.querySelector('input[type="text"]');
                  const widthInput = document.querySelector('input[type="number"]:nth-of-type(1)');
                  const heightInput = document.querySelector('input[type="number"]:nth-of-type(2)');
                  const xInput = document.querySelector('input[type="number"]:nth-of-type(3)');
                  const yInput = document.querySelector('input[type="number"]:nth-of-type(4)');
                  
                  const updatedArea = {
                    ...editingArea,
                    name: nameInput.value.trim() || 'Área sin nombre',
                    width: Math.max(AREA_MIN_SIZE, parseInt(widthInput.value) || 200),
                    height: Math.max(AREA_MIN_SIZE, parseInt(heightInput.value) || 100),
                    x: Math.max(0, parseInt(xInput.value) || 0),
                    y: Math.max(0, parseInt(yInput.value) || 0)
                  };
                  
                  saveAreaEdit(updatedArea);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Map2DCanvas;
