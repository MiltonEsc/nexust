import React, { useState, useCallback } from 'react';
import { 
  EyeIcon, 
  EyeSlashIcon, 
  LockClosedIcon, 
  LockOpenIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  AdjustmentsHorizontalIcon,
  TrashIcon,
  PlusIcon
} from '@heroicons/react/24/outline';

const LAYER_TYPES = {
  ITEM: 'item',
  CUSTOM: 'custom'
};

const LayerManager = ({ 
  layers, 
  onLayerUpdate, 
  onLayerReorder, 
  onLayerDelete,
  onLayerCreate,
  selectedLayer,
  onLayerSelect
}) => {
  const [draggedLayer, setDraggedLayer] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const layerNames = {
    [LAYER_TYPES.ITEM]: 'Elemento',
    [LAYER_TYPES.CUSTOM]: 'Personalizada'
  };

  const getLayerIcon = (layerType) => {
    switch (layerType) {
      case LAYER_TYPES.ITEM:
        return '📄';
      case LAYER_TYPES.CUSTOM:
        return '📄';
      default:
        return '📄';
    }
  };

  const getLayerColor = (layerType) => {
    switch (layerType) {
      case LAYER_TYPES.ITEM:
        return 'bg-blue-100';
      case LAYER_TYPES.CUSTOM:
        return 'bg-purple-100';
      default:
        return 'bg-gray-100';
    }
  };

  const toggleLayerVisibility = useCallback((layerId) => {
    onLayerUpdate(layerId, { visible: !layers[layerId].visible });
  }, [layers, onLayerUpdate]);

  const toggleLayerLock = useCallback((layerId) => {
    onLayerUpdate(layerId, { locked: !layers[layerId].locked });
  }, [layers, onLayerUpdate]);

  const setLayerOpacity = useCallback((layerId, opacity) => {
    onLayerUpdate(layerId, { opacity: Math.max(0, Math.min(1, opacity)) });
  }, [onLayerUpdate]);

  const moveLayerUp = useCallback((layerId) => {
    onLayerReorder(layerId, 'up');
  }, [onLayerReorder]);

  const moveLayerDown = useCallback((layerId) => {
    onLayerReorder(layerId, 'down');
  }, [onLayerReorder]);

  const handleDragStart = useCallback((e, layerId) => {
    setDraggedLayer(layerId);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e, targetLayerId) => {
    e.preventDefault();
    if (draggedLayer && draggedLayer !== targetLayerId) {
      onLayerReorder(draggedLayer, 'move', targetLayerId);
    }
    setDraggedLayer(null);
  }, [draggedLayer, onLayerReorder]);

  const handleDragEnd = useCallback(() => {
    setDraggedLayer(null);
  }, []);

  const sortedLayers = Object.entries(layers).sort(([, a], [, b]) => a.zIndex - b.zIndex);

  return (
    <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
          <AdjustmentsHorizontalIcon className="w-5 h-5 text-blue-600" />
          Gestión de Capas
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="p-1 text-gray-400 hover:text-gray-600"
            title="Configuración avanzada"
          >
            <AdjustmentsHorizontalIcon className="w-4 h-4" />
          </button>
          {onLayerCreate && (
            <button
              onClick={() => onLayerCreate()}
              className="p-1 text-gray-400 hover:text-green-600"
              title="Crear nueva capa"
            >
              <PlusIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Lista de capas */}
      <div className="space-y-2 flex-1 overflow-y-auto">
        {sortedLayers.map(([layerId, layer]) => {
          const isSelected = selectedLayer === layerId;
          const isDragging = draggedLayer === layerId;
          
          return (
            <div
              key={layerId}
              className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                isSelected 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 bg-white hover:border-gray-300'
              } ${isDragging ? 'opacity-50' : ''}`}
              draggable
              onDragStart={(e) => handleDragStart(e, layerId)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, layerId)}
              onDragEnd={handleDragEnd}
              onClick={() => onLayerSelect?.(layerId)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getLayerColor(layerId)}`}>
                    <span className="text-sm">{getLayerIcon(layerId)}</span>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {layer.itemName || layerNames[layerId] || layer.name || 'Capa sin nombre'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {layer.type === 'item' ? (
                        <>
                          {layer.itemType === 'area' ? 'Área' : 'Equipo'} • ID: {layer.itemId}
                        </>
                      ) : (
                        <>
                          Z-Index: {layer.zIndex || 0} • {layer.elementCount || 0} elementos
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {/* Botón de visibilidad */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLayerVisibility(layerId);
                    }}
                    className={`p-1 rounded hover:bg-gray-200 transition-all duration-200 hover:scale-110 ${
                      layer.visible ? 'text-gray-600' : 'text-gray-400'
                    }`}
                    title={layer.visible ? 'Ocultar capa' : 'Mostrar capa'}
                  >
                    {layer.visible ? (
                      <EyeIcon className="w-4 h-4 transition-transform duration-200" />
                    ) : (
                      <EyeSlashIcon className="w-4 h-4 transition-transform duration-200" />
                    )}
                  </button>

                  {/* Botón de bloqueo */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLayerLock(layerId);
                    }}
                    className={`p-1 rounded hover:bg-gray-200 transition-all duration-200 hover:scale-110 ${
                      layer.locked ? 'text-red-500' : 'text-green-500'
                    }`}
                    title={layer.locked ? 'Desbloquear capa' : 'Bloquear capa'}
                  >
                    {layer.locked ? (
                      <LockClosedIcon className="w-4 h-4 transition-transform duration-200" />
                    ) : (
                      <LockOpenIcon className="w-4 h-4 transition-transform duration-200" />
                    )}
                  </button>

                  {/* Botones de reordenamiento */}
                  <div className="flex flex-col">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        moveLayerUp(layerId);
                      }}
                      className="p-0.5 text-gray-400 hover:text-gray-600 transition-all duration-200 hover:scale-110"
                      title="Subir capa"
                    >
                      <ChevronUpIcon className="w-3 h-3 transition-transform duration-200" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        moveLayerDown(layerId);
                      }}
                      className="p-0.5 text-gray-400 hover:text-gray-600 transition-all duration-200 hover:scale-110"
                      title="Bajar capa"
                    >
                      <ChevronDownIcon className="w-3 h-3 transition-transform duration-200" />
                    </button>
                  </div>

                  {/* Botón de eliminar (solo para capas personalizadas) */}
                  {layerId.startsWith('custom-') && onLayerDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onLayerDelete(layerId);
                      }}
                      className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-all duration-200 hover:scale-110"
                      title="Eliminar capa"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Configuración avanzada */}
              {showAdvanced && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="space-y-2">
                    {/* Control de opacidad */}
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-600 w-16">Opacidad:</label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={layer.opacity || 1}
                        onChange={(e) => setLayerOpacity(layerId, parseFloat(e.target.value))}
                        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="text-xs text-gray-500 w-8">
                        {Math.round((layer.opacity || 1) * 100)}%
                      </span>
                    </div>

                    {/* Información adicional */}
                    <div className="text-xs text-gray-500 space-y-1">
                      <div>Elementos: {layer.elementCount || 0}</div>
                      <div>Última modificación: {layer.lastModified || 'N/A'}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Información del sistema */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 space-y-1">
          <div className="flex items-center justify-between">
            <span>Total de capas:</span>
            <span className="font-medium">{Object.keys(layers).length}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Capas visibles:</span>
            <span className="font-medium">
              {Object.values(layers).filter(layer => layer.visible).length}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Capas bloqueadas:</span>
            <span className="font-medium">
              {Object.values(layers).filter(layer => layer.locked).length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LayerManager;
