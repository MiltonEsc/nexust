import React, { useState, useCallback, useMemo } from 'react';
import { 
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
  onLayerSelect,
  onLayerDoubleClick,
  onLayerItemDelete
}) => {
  const [draggedLayer, setDraggedLayer] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState({
    areas: false,
    equipment: false,
    custom: false
  });
  const [contextMenu, setContextMenu] = useState(null);

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

  const openContextMenu = useCallback((e, layerId, layer) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      layerId,
      layer
    });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  React.useEffect(() => {
    if (!contextMenu) return;
    const handleClick = () => setContextMenu(null);
    const handleEsc = (ev) => {
      if (ev.key === 'Escape') setContextMenu(null);
    };
    window.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [contextMenu]);

  const sortedLayers = Object.entries(layers).sort(([, a], [, b]) => a.zIndex - b.zIndex);

  const groupedLayers = useMemo(() => {
    const groups = {
      areas: [],
      equipment: [],
      custom: []
    };

    sortedLayers.forEach(([layerId, layer]) => {
      if (layer.type === 'item') {
        if (layer.itemType === 'area') {
          groups.areas.push([layerId, layer]);
        } else {
          groups.equipment.push([layerId, layer]);
        }
      } else {
        groups.custom.push([layerId, layer]);
      }
    });

    return groups;
  }, [sortedLayers]);

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
      <div className="space-y-4 flex-1 overflow-y-auto">
        {[
          { key: 'areas', label: 'Areas', items: groupedLayers.areas },
          { key: 'equipment', label: 'Equipos', items: groupedLayers.equipment },
          { key: 'custom', label: 'Capas personalizadas', items: groupedLayers.custom }
        ].map(group => (
          <div key={group.key} className="space-y-2">
            <button
              onClick={() => setCollapsedGroups(prev => ({ ...prev, [group.key]: !prev[group.key] }))}
              className="w-full flex items-center justify-between text-sm font-semibold text-gray-700 bg-gray-50 px-3 py-2 rounded-md border"
            >
              <span>{group.label} ({group.items.length})</span>
              {collapsedGroups[group.key] ? (
                <ChevronDownIcon className="w-4 h-4" />
              ) : (
                <ChevronUpIcon className="w-4 h-4" />
              )}
            </button>

            {!collapsedGroups[group.key] && group.items.map(([layerId, layer]) => {
              const isSelected = selectedLayer === layerId;
              const isDragging = draggedLayer === layerId;

              return (
                <div
                  key={layerId}
                  className={`p-3 rounded-lg border-2 transition-all duration-200 overflow-hidden ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  } ${isDragging ? 'opacity-50' : ''} cursor-pointer`}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, layerId)}
                  onDragEnd={handleDragEnd}
                  onClick={() => onLayerSelect?.(layerId)}
                  onDoubleClick={() => onLayerDoubleClick?.(layerId, layer)}
                  onContextMenu={(e) => openContextMenu(e, layerId, layer)}
                  title="Doble click para localizar en el canvas"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className="text-gray-400 cursor-grab select-none px-1"
                        draggable
                        onDragStart={(e) => handleDragStart(e, layerId)}
                        title="Arrastrar para reordenar"
                      >
                        ≡
                      </div>
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
                              {layer.itemType === 'area' ? 'Area' : 'Equipo'} - ID: {layer.itemId}
                            </>
                          ) : (
                            <>
                              Z-Index: {layer.zIndex || 0} - {layer.elementCount || 0} elementos
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
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
                    </div>
                  </div>

                  {showAdvanced && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="space-y-2">
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
                          <span className="text-xs text-gray-500 w-8">{Math.round((layer.opacity || 1) * 100)}%</span>
                        </div>

                        <div className="text-xs text-gray-500 space-y-1">
                          <div>Elementos: {layer.elementCount || 0}</div>
                          <div>Ultima modificacion: {layer.lastModified || 'N/A'}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>


      {contextMenu && (
        <div
          className="fixed z-[2000]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-white border border-gray-200 rounded-md shadow-lg min-w-[160px]">
            <button
              onClick={() => {
                toggleLayerVisibility(contextMenu.layerId);
                closeContextMenu();
              }}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              {layers[contextMenu.layerId]?.visible === false ? 'Mostrar' : 'Ocultar'}
            </button>
            <button
              onClick={() => {
                toggleLayerLock(contextMenu.layerId);
                closeContextMenu();
              }}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              {layers[contextMenu.layerId]?.locked ? 'Desbloquear' : 'Bloquear'}
            </button>
            <button
              onClick={() => {
                if (contextMenu.layerId.startsWith('item_')) {
                  const itemId = contextMenu.layerId.replace('item_', '');
                  onLayerItemDelete?.(itemId);
                } else {
                  onLayerDelete?.(contextMenu.layerId);
                }
                closeContextMenu();
              }}
              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              Eliminar
            </button>
          </div>
        </div>
      )}

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
