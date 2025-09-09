import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  Panel,
  BackgroundVariant,
  ReactFlowProvider,
} from '@xyflow/react';
import { NodeResizer } from '@reactflow/node-resizer';
import '@xyflow/react/dist/style.css';
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

// Componente personalizado para nodos de equipo
const EquipoNode = ({ data, selected }) => {
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
        return 'bg-green-100 border-green-500 text-green-800';
      case 'mantenimiento':
        return 'bg-yellow-100 border-yellow-500 text-yellow-800';
      case 'inactivo':
        return 'bg-red-100 border-red-500 text-red-800';
      default:
        return 'bg-blue-100 border-blue-500 text-blue-800';
    }
  };

  return (
    <div className={`px-4 py-2 shadow-md rounded-md border-2 min-w-[120px] ${getColor(data.estado)} ${
      selected ? 'ring-2 ring-blue-500' : ''
    }`}>
      <div className="flex items-center space-x-2">
        {getIcon(data.tipo)}
        <div className="flex-1">
          <div className="font-bold text-sm">{data.marca}</div>
          <div className="text-xs opacity-75">{data.modelo}</div>
          <div className="text-xs opacity-60">{data.serial}</div>
        </div>
      </div>
    </div>
  );
};

// Componente personalizado para nodos de área
const AreaNode = ({ data, selected }) => {
  const isPreview = data.isPreview;
  
  if (isPreview) {
    return (
      <div className="px-4 py-2 shadow-md rounded-lg border-2 min-w-[200px] min-h-[100px] bg-blue-50 border-blue-400 border-dashed">
        <div className="flex items-center space-x-2 mb-2">
          <MapPinIcon className="w-5 h-5 text-blue-600" />
          <div className="font-bold text-sm text-blue-800">{data.name}</div>
        </div>
        <div className="text-xs text-blue-600">
          Vista previa
        </div>
      </div>
    );
  }
  
  return (
    <div className={`px-4 py-2 shadow-md rounded-lg border-2 min-w-[200px] min-h-[100px] bg-gray-50 border-gray-300 relative ${
      selected ? 'ring-2 ring-blue-500' : ''
    }`}>
      <div className="flex items-center space-x-2 mb-2">
        <MapPinIcon className="w-5 h-5 text-gray-600" />
        <div className="font-bold text-sm text-gray-800">{data.name}</div>
      </div>
      <div className="text-xs text-gray-600">
        {data.equiposCount || 0} equipos
      </div>
      
      {/* NodeResizer para redimensionar áreas */}
      <NodeResizer
        minWidth={100}
        minHeight={60}
        isVisible={selected}
        color="#3B82F6"
        lineStyle={{
          border: '2px solid #1E40AF',
        }}
      />
    </div>
  );
};

// Tipos de nodos personalizados
const nodeTypes = {
  equipo: EquipoNode,
  area: AreaNode,
};

// Componente interno que usa los hooks de React Flow
const ReactFlowMapInner = ({
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
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isCreatingAreaLocal, setIsCreatingAreaLocal] = useState(false);
  const [areaStart, setAreaStart] = useState(null);
  const [areaPreview, setAreaPreview] = useState(null);
  const [newAreaData, setNewAreaData] = useState(null);
  const [showAreaNameModal, setShowAreaNameModal] = useState(false);
  const reactFlowInstance = useReactFlow();

  // Manejar redimensionamiento de nodos
  const handleNodeResize = useCallback((event, node) => {
    if (node.type === 'area') {
      const areaId = node.id.replace('area-', '');
      const updatedArea = areas.find(area => area.id === areaId);
      
      if (updatedArea) {
        const updatedAreaData = {
          ...updatedArea,
          width: node.width || 200,
          height: node.height || 100
        };
        
        onAreasChange?.(updatedAreaData);
        toast.success(`Tamaño de área "${updatedArea.name}" actualizado`);
      }
    }
  }, [areas, onAreasChange]);

  // Convertir equipos a nodos
  const equiposToNodes = useCallback((equiposList) => {
    return equiposList.map(equipo => ({
      id: `equipo-${equipo.id}`,
      type: 'equipo',
      position: { 
        x: equipo.x_coordinate || 100, 
        y: equipo.y_coordinate || 100 
      },
      data: {
        ...equipo,
        onSelect: () => onEquipoSelect?.(equipo),
        onRemove: () => onEquipoRemove?.(equipo),
      },
      draggable: true,
    }));
  }, [onEquipoSelect, onEquipoRemove]);

  // Convertir áreas a nodos
  const areasToNodes = useCallback((areasList) => {
    return areasList.map(area => ({
      id: `area-${area.id}`,
      type: 'area',
      position: { x: area.x || 0, y: area.y || 0 },
      data: {
        ...area,
        equiposCount: equipos.filter(e => 
          e.x_coordinate >= area.x && 
          e.x_coordinate <= area.x + area.width &&
          e.y_coordinate >= area.y && 
          e.y_coordinate <= area.y + area.height
        ).length,
      },
      style: {
        width: area.width || 200,
        height: area.height || 100,
      },
      draggable: true,
      resizable: true,
    }));
  }, [equipos]);

  // Actualizar nodos cuando cambien los datos
  useEffect(() => {
    const equiposNodes = equiposToNodes(equipos);
    const areasNodes = areasToNodes(areas);
    
    const allNodes = [...areasNodes, ...equiposNodes];
    setNodes(allNodes);
  }, [equipos, areas, equiposToNodes, areasToNodes]);

  // Efecto separado para manejar la vista previa del área
  useEffect(() => {
    if (areaPreview) {
      const previewNode = {
        id: 'area-preview',
        type: 'area',
        position: { x: areaPreview.x, y: areaPreview.y },
        data: {
          name: 'Nueva Área',
          equiposCount: 0,
          isPreview: true
        },
        style: {
          width: areaPreview.width,
          height: areaPreview.height,
          opacity: 0.6,
          border: '3px dashed #3B82F6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)'
        },
        draggable: false,
        selectable: false,
      };

      setNodes(prevNodes => {
        // Filtrar el nodo de vista previa anterior si existe
        const nodesWithoutPreview = prevNodes.filter(node => node.id !== 'area-preview');
        return [...nodesWithoutPreview, previewNode];
      });
    } else {
      // Remover el nodo de vista previa si no hay areaPreview
      setNodes(prevNodes => prevNodes.filter(node => node.id !== 'area-preview'));
    }
  }, [areaPreview]);

  // Manejar selección de nodos
  const onNodeClick = useCallback((event, node) => {
    if (node.type === 'equipo') {
      onEquipoSelect?.(node.data);
    }
  }, [onEquipoSelect]);

  // Manejar movimiento de nodos
  const onNodeDragStop = useCallback((event, node) => {
    if (node.type === 'equipo') {
      const equipo = node.data;
      const updatedEquipo = {
        ...equipo,
        x_coordinate: node.position.x,
        y_coordinate: node.position.y,
      };
      
      onEquipoMove?.(updatedEquipo, node.position.x, node.position.y);
      onEquipoMoveEnd?.(updatedEquipo, node.position.x, node.position.y, true);
      
      toast.success(`Ubicación de ${equipo.marca} actualizada`);
    }
  }, [onEquipoMove, onEquipoMoveEnd]);

  // Manejar clic en el canvas para crear área
  const onPaneClick = useCallback((event) => {
    if (isCreatingAreaLocal) {
      const { x, y } = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      if (!areaStart) {
        setAreaStart({ x, y });
        toast.info('Haz clic en la esquina opuesta para completar el área');
      } else {
        const width = Math.abs(x - areaStart.x);
        const height = Math.abs(y - areaStart.y);
        const finalX = Math.min(x, areaStart.x);
        const finalY = Math.min(y, areaStart.y);
        
        if (width > 50 && height > 50) {
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
  }, [isCreatingAreaLocal, areaStart, reactFlowInstance]);

  // Manejar movimiento del mouse para vista previa
  const onPaneMouseMove = useCallback((event) => {
    if (isCreatingAreaLocal && areaStart) {
      const { x, y } = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const width = Math.abs(x - areaStart.x);
      const height = Math.abs(y - areaStart.y);
      const finalX = Math.min(x, areaStart.x);
      const finalY = Math.min(y, areaStart.y);

      setAreaPreview({
        x: finalX,
        y: finalY,
        width,
        height
      });
    }
  }, [isCreatingAreaLocal, areaStart, reactFlowInstance]);


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

  // Iniciar creación de área
  const startCreatingArea = () => {
    setIsCreatingAreaLocal(true);
    setAreaStart(null);
    setAreaPreview(null);
    toast.info('Haz clic en dos puntos para crear un área');
  };


  return (
    <div className={`relative bg-white rounded-lg shadow border ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Controles superiores */}
      {showControls && (
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-semibold text-gray-900">Editor de Mapas</h3>
            <span className="text-sm text-gray-500">Powered by React Flow</span>
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

      {/* React Flow */}
      <div style={{ height: isFullscreen ? 'calc(100vh - 80px)' : '500px' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onNodeDragStop={onNodeDragStop}
          onNodeResize={handleNodeResize}
          onResize={handleNodeResize}
          onPaneClick={onPaneClick}
          onPaneMouseMove={onPaneMouseMove}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-left"
        >
          <Controls />
          <MiniMap />
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        </ReactFlow>
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
              : `React Flow - ${equipos.length} equipos, ${areas.length} áreas`
            }
          </span>
        </div>
      </div>

      {/* Instrucciones */}
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
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Crear Área</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre del área
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: Sala de Servidores"
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
            <div className="flex justify-end space-x-2">
              <button
                onClick={cancelAreaCreation}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const input = document.querySelector('input[type="text"]');
                  confirmAreaCreation(input.value);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
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

// Componente wrapper con ReactFlowProvider
const ReactFlowMap = (props) => {
  return (
    <ReactFlowProvider>
      <ReactFlowMapInner {...props} />
    </ReactFlowProvider>
  );
};

export default ReactFlowMap;
