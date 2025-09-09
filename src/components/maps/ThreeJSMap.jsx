import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Box, Plane, Html } from '@react-three/drei';
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
import * as THREE from 'three';

// Componente para nodos de equipo en 3D
const EquipoNode3D = ({ 
  equipo, 
  position, 
  isSelected, 
  onSelect, 
  onRemove,
  isDragging = false,
  onDragStart,
  onDragEnd
}) => {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);
  const [dragPosition, setDragPosition] = useState(null);

  // Animación de hover y selección
  useFrame((state) => {
    if (meshRef.current) {
      const scale = isSelected ? 1.2 : (hovered ? 1.1 : 1);
      meshRef.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.1);
      
      if (isDragging) {
        meshRef.current.rotation.y += 0.02;
        meshRef.current.position.y = 1; // Elevar durante el arrastre
      } else {
        meshRef.current.position.y = 0.5;
      }
    }
  });

  const getIcon = (tipo) => {
    switch (tipo?.toLowerCase()) {
      case 'computadora':
      case 'laptop':
        return <ComputerDesktopIcon className="w-6 h-6" />;
      case 'impresora':
        return <PrinterIcon className="w-6 h-6" />;
      case 'telefono':
        return <PhoneIcon className="w-6 h-6" />;
      default:
        return <BuildingOfficeIcon className="w-6 h-6" />;
    }
  };

  const getColor = (estado) => {
    switch (estado?.toLowerCase()) {
      case 'activo':
        return '#10B981'; // green-500
      case 'mantenimiento':
        return '#F59E0B'; // yellow-500
      case 'inactivo':
        return '#EF4444'; // red-500
      default:
        return '#3B82F6'; // blue-500
    }
  };

  const handleClick = (e) => {
    e.stopPropagation();
    onSelect?.(equipo);
  };

  const handlePointerOver = (e) => {
    e.stopPropagation();
    setHovered(true);
  };

  const handlePointerOut = (e) => {
    e.stopPropagation();
    setHovered(false);
  };

  const handlePointerDown = (e) => {
    e.stopPropagation();
    if (onDragStart) {
      onDragStart(equipo);
    }
  };

  const handlePointerUp = (e) => {
    e.stopPropagation();
    if (onDragEnd && dragPosition) {
      onDragEnd(equipo, dragPosition);
      setDragPosition(null);
    }
  };

  const handlePointerMove = (e) => {
    if (isDragging && e.intersections.length > 0) {
      const intersection = e.intersections[0];
      const newPosition = {
        x: intersection.point.x,
        y: intersection.point.z
      };
      setDragPosition(newPosition);
    }
  };

  return (
    <group position={[position.x, 0.5, position.y]}>
      {/* Cilindro base */}
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerMove={handlePointerMove}
        castShadow
        receiveShadow
      >
        <cylinderGeometry args={[0.3, 0.3, 0.6, 8]} />
        <meshStandardMaterial 
          color={getColor(equipo.estado)}
          transparent
          opacity={isSelected ? 0.9 : 0.8}
        />
      </mesh>
      
      {/* Indicador de estado en la parte superior */}
      <mesh position={[0, 0.4, 0]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color={getColor(equipo.estado)} />
      </mesh>

      {/* Etiqueta con información del equipo */}
      <Html
        position={[0, 1, 0]}
        center
        distanceFactor={10}
        occlude
      >
        <div className={`
          px-2 py-1 rounded-md text-xs font-medium text-white shadow-lg
          ${isSelected ? 'bg-blue-600' : 'bg-gray-800'}
          ${hovered ? 'opacity-100' : 'opacity-80'}
          transition-opacity duration-200
        `}>
          <div className="flex items-center space-x-1">
            {getIcon(equipo.tipo)}
            <span className="font-bold">{equipo.marca}</span>
          </div>
          <div className="text-xs opacity-75">{equipo.modelo}</div>
        </div>
      </Html>
    </group>
  );
};

// Componente para áreas en 3D
const AreaNode3D = ({ 
  area, 
  position, 
  isSelected, 
  onSelect,
  equipos = [],
  isPreview = false 
}) => {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (meshRef.current) {
      const scale = isSelected ? 1.05 : (hovered ? 1.02 : 1);
      meshRef.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.1);
    }
  });

  const equiposInArea = equipos.filter(equipo => 
    equipo.x_coordinate >= area.x && 
    equipo.x_coordinate <= area.x + (area.width || 200) &&
    equipo.y_coordinate >= area.y && 
    equipo.y_coordinate <= area.y + (area.height || 100)
  );

  const handleClick = (e) => {
    e.stopPropagation();
    onSelect?.(area);
  };

  const handlePointerOver = (e) => {
    e.stopPropagation();
    setHovered(true);
  };

  const handlePointerOut = (e) => {
    e.stopPropagation();
    setHovered(false);
  };

  return (
    <group position={[position.x + (area.width || 200) / 2, 0, position.y + (area.height || 100) / 2]}>
      {/* Plano base del área */}
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        receiveShadow
      >
        <planeGeometry args={[area.width || 200, area.height || 100]} />
        <meshStandardMaterial 
          color={isPreview ? '#3B82F6' : '#E5E7EB'}
          transparent
          opacity={isPreview ? 0.3 : 0.6}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Borde del área */}
      <mesh position={[0, 0.01, 0]}>
        <planeGeometry args={[(area.width || 200) + 4, (area.height || 100) + 4]} />
        <meshStandardMaterial 
          color={isPreview ? '#3B82F6' : '#9CA3AF'}
          transparent
          opacity={isPreview ? 0.8 : 0.4}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Etiqueta del área */}
      <Html
        position={[0, 0.5, 0]}
        center
        distanceFactor={15}
        occlude
      >
        <div className={`
          px-3 py-2 rounded-lg text-sm font-medium shadow-lg
          ${isPreview 
            ? 'bg-blue-600 text-white border-2 border-blue-400 border-dashed' 
            : isSelected 
              ? 'bg-blue-600 text-white' 
              : 'bg-white text-gray-800 border border-gray-300'
          }
          ${hovered ? 'opacity-100' : 'opacity-90'}
          transition-opacity duration-200
        `}>
          <div className="flex items-center space-x-2">
            <MapPinIcon className="w-4 h-4" />
            <span className="font-bold">{area.name}</span>
          </div>
          <div className="text-xs opacity-75">
            {equiposInArea.length} equipos
          </div>
        </div>
      </Html>
    </group>
  );
};

// Componente principal del mapa 3D
const ThreeJSMapInner = ({
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isCreatingAreaLocal, setIsCreatingAreaLocal] = useState(false);
  const [areaStart, setAreaStart] = useState(null);
  const [areaPreview, setAreaPreview] = useState(null);
  const [newAreaData, setNewAreaData] = useState(null);
  const [showAreaNameModal, setShowAreaNameModal] = useState(false);
  const [draggedEquipo, setDraggedEquipo] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Convertir coordenadas 2D a 3D
  const equipos3D = useMemo(() => 
    equipos.map(equipo => ({
      ...equipo,
      position3D: {
        x: (equipo.x_coordinate || 0) - 400, // Centrar en el origen
        y: (equipo.y_coordinate || 0) - 300
      }
    })), [equipos]
  );

  const areas3D = useMemo(() => 
    areas.map(area => ({
      ...area,
      position3D: {
        x: (area.x || 0) - 400,
        y: (area.y || 0) - 300
      }
    })), [areas]
  );

  // Efecto para manejar el estado de carga
  useEffect(() => {
    if (equipos.length > 0 || areas.length > 0) {
      setIsLoading(false);
    }
  }, [equipos, areas]);

  // Manejar selección de equipo
  const handleEquipoSelect = useCallback((equipo) => {
    onEquipoSelect?.(equipo);
  }, [onEquipoSelect]);

  // Manejar selección de área
  const handleAreaSelect = useCallback((area) => {
    // Implementar lógica de selección de área si es necesaria
  }, []);

  // Manejar inicio de arrastre
  const handleDragStart = useCallback((equipo) => {
    setDraggedEquipo(equipo);
    setIsDragging(true);
  }, []);

  // Manejar fin de arrastre
  const handleDragEnd = useCallback((equipo, newPosition) => {
    if (equipo && newPosition) {
      const updatedEquipo = {
        ...equipo,
        x_coordinate: Math.round(newPosition.x + 400), // Convertir de vuelta a coordenadas 2D
        y_coordinate: Math.round(newPosition.y + 300)
      };
      
      onEquipoMove?.(updatedEquipo, updatedEquipo.x_coordinate, updatedEquipo.y_coordinate);
      onEquipoMoveEnd?.(updatedEquipo, updatedEquipo.x_coordinate, updatedEquipo.y_coordinate, true);
      
      toast.success(`Ubicación de ${equipo.marca} actualizada`);
    }
    
    setDraggedEquipo(null);
    setIsDragging(false);
  }, [onEquipoMove, onEquipoMoveEnd]);

  // Manejar clic en el canvas para crear área
  const handleCanvasClick = useCallback((event) => {
    if (isCreatingAreaLocal) {
      // Obtener coordenadas del clic en el canvas
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      // Convertir a coordenadas 3D (aproximado)
      const worldX = (x / rect.width) * 1000 - 500;
      const worldZ = (y / rect.height) * 1000 - 500;

      if (!areaStart) {
        setAreaStart({ x: worldX, y: worldZ });
        toast('Haz clic en la esquina opuesta para completar el área', { icon: 'ℹ️' });
      } else {
        const width = Math.abs(worldX - areaStart.x);
        const height = Math.abs(worldZ - areaStart.y);
        const finalX = Math.min(worldX, areaStart.x);
        const finalY = Math.min(worldZ, areaStart.y);
        
        if (width > 50 && height > 50) {
          const newArea = {
            x: finalX + 400, // Convertir a coordenadas 2D
            y: finalY + 300,
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
  }, [isCreatingAreaLocal, areaStart]);

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

  return (
    <div className={`relative bg-white rounded-lg shadow border ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Controles superiores */}
      {showControls && (
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-semibold text-gray-900">Editor de Mapas 3D</h3>
            <span className="text-sm text-gray-500">Powered by Three.js</span>
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

      {/* Canvas 3D */}
      <div 
        style={{ height: isFullscreen ? 'calc(100vh - 80px)' : '500px' }}
        onClick={handleCanvasClick}
        className="relative"
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75 z-10">
            <div className="flex flex-col items-center space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <div className="text-sm text-gray-600">Cargando mapa 3D...</div>
            </div>
          </div>
        )}
        <Canvas
          camera={{ position: [0, 5, 10], fov: 50 }}
          shadows
          gl={{ antialias: true }}
        >
          {/* Iluminación */}
          <ambientLight intensity={0.4} />
          <directionalLight
            position={[10, 10, 5]}
            intensity={1}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-camera-far={50}
            shadow-camera-left={-20}
            shadow-camera-right={20}
            shadow-camera-top={20}
            shadow-camera-bottom={-20}
          />
          <pointLight position={[-10, -10, -10]} intensity={0.3} />

          {/* Plano base */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
            <planeGeometry args={[1000, 1000]} />
            <meshStandardMaterial color="#F3F4F6" />
          </mesh>

          {/* Grid de referencia */}
          <gridHelper args={[1000, 50, '#E5E7EB', '#E5E7EB']} />

          {/* Áreas */}
          {areas3D.map(area => (
            <AreaNode3D
              key={`area-${area.id}`}
              area={area}
              position={area.position3D}
              isSelected={false}
              onSelect={handleAreaSelect}
              equipos={equipos}
            />
          ))}

          {/* Vista previa de área */}
          {areaPreview && (
            <AreaNode3D
              area={{
                ...areaPreview,
                name: 'Nueva Área',
                id: 'preview'
              }}
              position={{
                x: areaPreview.x - 400,
                y: areaPreview.y - 300
              }}
              isSelected={false}
              isPreview={true}
              equipos={[]}
            />
          )}

          {/* Equipos */}
          {equipos3D.map(equipo => (
            <EquipoNode3D
              key={`equipo-${equipo.id}`}
              equipo={equipo}
              position={equipo.position3D}
              isSelected={selectedEquipo && selectedEquipo.id === equipo.id}
              onSelect={handleEquipoSelect}
              onRemove={onEquipoRemove}
              isDragging={isDragging && draggedEquipo?.id === equipo.id}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            />
          ))}

          {/* Controles de cámara */}
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minPolarAngle={Math.PI / 6}
            maxPolarAngle={Math.PI / 2}
            minDistance={5}
            maxDistance={50}
            enableDamping={true}
            dampingFactor={0.05}
            screenSpacePanning={false}
          />
        </Canvas>
      </div>

      {/* Panel de información */}
      <div className="absolute top-4 left-4 bg-white bg-opacity-90 rounded-lg p-3 shadow-lg">
        <div className="text-sm space-y-1">
          <div className="font-medium text-gray-900">Estado del Mapa 3D</div>
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
          <div className="font-medium text-gray-900">Controles 3D</div>
          <div className="text-gray-600 space-y-1">
            <div>• <strong>Rotar:</strong> Click + arrastrar</div>
            <div>• <strong>Zoom:</strong> Rueda del mouse</div>
            <div>• <strong>Pan:</strong> Click derecho + arrastrar</div>
            <div>• <strong>Mover equipo:</strong> Click + arrastrar equipo</div>
            <div>• <strong>Seleccionar:</strong> Click en equipo</div>
          </div>
        </div>
      </div>

      {/* Información de estado */}
      <div className="absolute bottom-4 right-4 bg-white bg-opacity-90 px-3 py-2 rounded-lg shadow-sm border text-xs text-gray-600">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full animate-pulse ${
            isCreatingAreaLocal ? 'bg-blue-500' : 'bg-green-500'
          }`}></div>
          <span>
            {isCreatingAreaLocal 
              ? `Creando área... ${areaStart ? 'Haz clic en la esquina opuesta' : 'Haz clic en la primera esquina'}`
              : `Three.js - ${equipos.length} equipos, ${areas.length} áreas`
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
    </div>
  );
};

// Componente wrapper
const ThreeJSMap = (props) => {
  return <ThreeJSMapInner {...props} />;
};

export default ThreeJSMap;
