import React, { useRef, useEffect, useState } from 'react';
import { MapPinIcon, ComputerDesktopIcon, PrinterIcon, PhoneIcon } from '@heroicons/react/24/outline';

const Map2D = ({ equipos, onEquipoSelect, selectedEquipo }) => {
  const canvasRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);

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

  // Dibujar el mapa
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

    // Dibujar equipos
    equipos.forEach((equipo) => {
      if (equipo.x_coordinate !== null && equipo.y_coordinate !== null) {
        drawEquipo(ctx, equipo);
      }
    });

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

  // Dibujar un equipo
  const drawEquipo = (ctx, equipo) => {
    const x = equipo.x_coordinate;
    const y = equipo.y_coordinate;
    const radius = 20;
    const color = getEquipoColor(equipo.estado);
    const IconComponent = getEquipoIcon(equipo.tipo);

    // Círculo de fondo
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fill();

    // Borde
    ctx.strokeStyle = selectedEquipo?.id === equipo.id ? '#1F2937' : '#FFFFFF';
    ctx.lineWidth = selectedEquipo?.id === equipo.id ? 3 : 2;
    ctx.stroke();

    // Icono (simplificado como texto)
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(equipo.tipo?.charAt(0)?.toUpperCase() || '?', x, y);

    // Etiqueta
    ctx.fillStyle = '#1F2937';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(equipo.marca || 'Sin marca', x, y + radius + 15);
  };

  // Manejar clics en el canvas
  const handleCanvasClick = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left - panOffset.x) / zoom;
    const y = (event.clientY - rect.top - panOffset.y) / zoom;

    // Buscar equipo clickeado
    const clickedEquipo = equipos.find(equipo => {
      if (equipo.x_coordinate === null || equipo.y_coordinate === null) return false;
      const dx = x - equipo.x_coordinate;
      const dy = y - equipo.y_coordinate;
      return Math.sqrt(dx * dx + dy * dy) <= 20;
    });

    if (clickedEquipo) {
      onEquipoSelect(clickedEquipo);
    } else {
      onEquipoSelect(null);
    }
  };

  // Manejar arrastre
  const handleMouseDown = (event) => {
    setIsDragging(true);
    setDragStart({
      x: event.clientX - panOffset.x,
      y: event.clientY - panOffset.y
    });
  };

  const handleMouseMove = (event) => {
    if (!isDragging) return;

    setPanOffset({
      x: event.clientX - dragStart.x,
      y: event.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Manejar zoom con rueda del mouse
  const handleWheel = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const delta = event.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.5, Math.min(3, prev * delta)));
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
    return () => window.removeEventListener('resize', resizeCanvas);
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

    // Agregar el event listener con la opción passive: false
    canvas.addEventListener('wheel', handleWheelNonPassive, { passive: false });

    return () => {
      canvas.removeEventListener('wheel', handleWheelNonPassive);
    };
  }, []);

  useEffect(() => {
    drawMap();
  }, [equipos, selectedEquipo, panOffset, zoom, showGrid]);

  return (
    <div className="relative w-full h-full bg-gray-50">
      {/* Controles */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <button
          onClick={() => setShowGrid(!showGrid)}
          className={`px-3 py-2 rounded-md text-sm font-medium ${
            showGrid 
              ? 'bg-blue-600 text-white' 
              : 'bg-white text-gray-700 border border-gray-300'
          }`}
        >
          Grid
        </button>
        <button
          onClick={() => {
            setPanOffset({ x: 0, y: 0 });
            setZoom(1);
          }}
          className="px-3 py-2 rounded-md text-sm font-medium bg-white text-gray-700 border border-gray-300"
        >
          Reset
        </button>
      </div>

      {/* Zoom controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-1">
        <button
          onClick={() => setZoom(prev => Math.min(3, prev * 1.2))}
          className="w-8 h-8 rounded-md bg-white text-gray-700 border border-gray-300 flex items-center justify-center"
        >
          +
        </button>
        <button
          onClick={() => setZoom(prev => Math.max(0.5, prev * 0.8))}
          className="w-8 h-8 rounded-md bg-white text-gray-700 border border-gray-300 flex items-center justify-center"
        >
          -
        </button>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ touchAction: 'none' }} // Agregar esto para prevenir scroll en móviles
      />

      {/* Leyenda */}
      <div className="absolute bottom-4 left-4 z-10 bg-white p-4 rounded-lg shadow-lg border">
        <h3 className="font-medium text-gray-900 mb-2">Estados</h3>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-sm text-gray-600">Activo</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-sm text-gray-600">Mantenimiento</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-sm text-gray-600">Dañado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-500"></div>
            <span className="text-sm text-gray-600">Inactivo</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Map2D;
