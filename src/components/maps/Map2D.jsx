import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { useAppContext } from '../../context/AppContext';

// === ICONS (for equipment types) ===
const ICONS = {
    default: (props) => (
        <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
            <path d="M6 14V8a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v6"></path>
            <circle cx="12" cy="18" r="1"></circle>
        </svg>
    ),
    server: (props) => (
         <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
            <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
            <line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line>
        </svg>
    ),
    computador: (props) => (
        <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
            <line x1="8" y1="21" x2="16" y2="21"></line>
            <line x1="12" y1="17" x2="12" y2="21"></line>
        </svg>
    ),
    impresora: (props) => (
        <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6,9 6,2 18,2 18,9"></polyline>
            <path d="M6,18H4a2,2,0,0,1-2-2V11a2,2,0,0,1,2-2H20a2,2,0,0,1,2,2v5a2,2,0,0,1-2,2H18"></path>
            <rect x="6" y="14" width="12" height="8"></rect>
        </svg>
    ),
    telefono: (props) => (
        <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22,16.92v3a2,2,0,0,1-2.18,2,19.79,19.79,0,0,1-8.63-3.07,19.5,19.5,0,0,1-6-6,19.79,19.79,0,0,1-3.07-8.67A2,2,0,0,1,4.11,2H7a2,2,0,0,1,2,1.72,12.84,12.84,0,0,0,.7,2.81,2,2,0,0,1-.45,2.11L8.09,9.91a16,16,0,0,0,6,6l1.27-1.27a2,2,0,0,1,2.11-.45,12.84,12.84,0,0,0,2.81.7A2,2,0,0,1,22,16.92Z"></path>
        </svg>
    ),
};


// === LAYERS SYSTEM ===
const LAYERS = {
    BACKGROUND: 0,      // Fondo del mapa
    AREAS: 10,          // Áreas normales
    EQUIPMENT: 20,      // Equipos normales
    LOCKED_AREAS: 30,   // Áreas bloqueadas (siempre visibles)
    LOCKED_EQUIPMENT: 40, // Equipos bloqueados
    SELECTED: 50,       // Elementos seleccionados (más alto)
    UI_OVERLAY: 100     // Elementos de interfaz
};

// === COMPONENT: Resizable and Draggable Item ===
const DraggableResizableItem = ({ children, data, onUpdate, onSelect, onDoubleClick, isSelected, scale, getFinalZIndex }) => {
    const itemRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
    const [tempPosition, setTempPosition] = useState({ x: data.x, y: data.y });
    const [tempSize, setTempSize] = useState({ width: data.width, height: data.height });

    // Sincronizar posiciones temporales con data cuando no estamos arrastrando
    useEffect(() => {
        if (!isDragging && !isResizing) {
            setTempPosition({ x: data.x, y: data.y });
            setTempSize({ width: data.width, height: data.height });
        }
    }, [data.x, data.y, data.width, data.height, isDragging, isResizing]);

    const handleMouseDown = useCallback((e, actionType) => {
        // Solo preventDefault si es necesario
        if (actionType === 'drag' || actionType === 'resize') {
            e.preventDefault();
        }
        e.stopPropagation();
        
        // Si está bloqueado, no permitir selección ni interacción
        if (data.locked) return;

        // Permitir selección solo si no está bloqueado
        onSelect(data);

        if (actionType === 'drag') {
            setIsDragging(true);
            setDragStart({
                x: e.clientX - data.x,
                y: e.clientY - data.y
            });
            setTempPosition({ x: data.x, y: data.y });
        } else if (actionType === 'resize') {
            setIsResizing(true);
            setResizeStart({
                x: e.clientX,
                y: e.clientY,
                width: data.width,
                height: data.height
            });
            setTempSize({ width: data.width, height: data.height });
        }
    }, [data, onSelect]);

    const handleMouseMove = useCallback((e) => {
        if (isDragging) {
            const newX = e.clientX - dragStart.x;
            const newY = e.clientY - dragStart.y;
            setTempPosition({ x: newX, y: newY });
        } else if (isResizing) {
            const deltaX = e.clientX - resizeStart.x;
            const deltaY = e.clientY - resizeStart.y;
            const newWidth = Math.max(50, resizeStart.width + deltaX);
            const newHeight = Math.max(50, resizeStart.height + deltaY);
            setTempSize({ width: newWidth, height: newHeight });
        }
    }, [isDragging, isResizing, dragStart, resizeStart]);

    const handleMouseUp = useCallback(() => {
        if (isDragging) {
            // Actualizar BD con la posición final
            onUpdate(data.id, { x: tempPosition.x, y: tempPosition.y });
            setIsDragging(false);
        } else if (isResizing) {
            // Actualizar BD con el tamaño final
            onUpdate(data.id, { width: tempSize.width, height: tempSize.height });
            setIsResizing(false);
        }
    }, [isDragging, isResizing, tempPosition, tempSize, data.id, onUpdate]);

    const handleDoubleClick = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (onDoubleClick) {
            onDoubleClick(data);
        }
    }, [data, onDoubleClick]);

    const handleRightClick = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Para áreas bloqueadas, permitir ver propiedades con clic derecho
        if (data.locked) {
            onSelect(data);
        }
    }, [data, onSelect]);

    useEffect(() => {
        if (isDragging || isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);
    
    const selectionClass = isSelected ? `ring-4 ring-offset-2 ring-blue-500` : '';
    const cursorClass = data.locked ? 'cursor-not-allowed' : (isDragging ? 'cursor-grabbing' : 'cursor-move');
    
    // Función para determinar la capa correcta
    const getLayer = () => {
        // Determinar tipo de elemento
        const isArea = data.type === 'area';
        const isEquipment = data.type === 'equipment';
        
        let baseLayer;
        let layerType;
        
        // Si está bloqueado
        if (data.locked) {
            if (isArea) {
                baseLayer = LAYERS.LOCKED_AREAS;
                layerType = 'locked_areas';
            } else if (isEquipment) {
                baseLayer = LAYERS.LOCKED_EQUIPMENT;
                layerType = 'locked_equipment';
            } else {
                baseLayer = LAYERS.LOCKED_AREAS;
                layerType = 'locked_areas';
            }
        } else {
            // Elementos normales
            if (isArea) {
                baseLayer = LAYERS.AREAS;
                layerType = 'areas';
            } else if (isEquipment) {
                baseLayer = LAYERS.EQUIPMENT;
                layerType = 'equipment';
            } else {
                baseLayer = LAYERS.AREAS;
                layerType = 'areas';
            }
        }
        
        // Aplicar orden personalizado si existe
        return getFinalZIndex ? getFinalZIndex(baseLayer, layerType, data.id) : baseLayer;
    };
    
    // Debug: Log layer para elementos bloqueados
    if (data.locked) {
        console.log(`Elemento bloqueado ${data.id} (${data.type}): layer = ${getLayer()}, isSelected = ${isSelected}`);
    }

    return (
        <div
            ref={itemRef}
            className={`absolute ${cursorClass} ${selectionClass}`}
            style={{
                left: `${isDragging ? tempPosition.x : data.x}px`,
                top: `${isDragging ? tempPosition.y : data.y}px`,
                width: `${isResizing ? tempSize.width : data.width}px`,
                height: `${isResizing ? tempSize.height : data.height}px`,
                zIndex: getLayer(),
                position: 'absolute',
                willChange: (isDragging || isResizing) ? 'transform' : 'auto',
                transition: (isDragging || isResizing) ? 'none' : 'all 0.1s ease-out',
            }}
            onMouseDown={(e) => handleMouseDown(e, 'drag')}
            onClick={(e) => {
                e.stopPropagation();
                // Solo permitir selección si no está bloqueado
                if (!data.locked) {
                    onSelect(data);
                }
            }}
            onContextMenu={handleRightClick}
            onDoubleClick={handleDoubleClick}
        >
            {children}
            {data.locked && (
                <div className="absolute top-1.5 left-1.5 p-1 bg-black/30 rounded-full flex items-center justify-center" title="Área bloqueada - Clic derecho para ver propiedades">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                </div>
            )}
            {isSelected && !data.locked && (
                 <div
                    className="absolute bottom-0 right-0 w-4 h-4 bg-white border-2 border-blue-500 rounded-full cursor-nwse-resize -mr-2 -mb-2"
                    onMouseDown={(e) => handleMouseDown(e, 'resize')}
                 />
            )}
        </div>
    );
};


// === COMPONENT: Area ===
const Area = ({ data, isSelected }) => {
    const selectionClass = isSelected ? `ring-blue-500` : `shadow-md`;
    const textColor = data.textColor || 'text-gray-800';
    return (
        <div style={{ backgroundColor: data.backgroundColor, borderColor: data.borderColor }}
            className={`w-full h-full p-4 border-2 rounded-lg transition-shadow duration-200 ${selectionClass}`}>
            <div className={`font-bold ${textColor}`}>{data.name}</div>
        </div>
    );
};

// === COMPONENT: Equipment ===
// Función para mapear estados de la BD a estados del mapa
const mapDatabaseStatusToMapStatus = (dbStatus) => {
    const statusMap = {
        'Bueno': 'activo',
        'Malo': 'dañado',
        'En Reparación': 'mantenimiento',
        'Fuera de Servicio': 'inactivo',
        'Mantenimiento': 'mantenimiento',
        'Reparación': 'mantenimiento',
        'Activo': 'activo',
        'Inactivo': 'inactivo',
        'Dañado': 'dañado'
    };
    return statusMap[dbStatus] || 'activo';
};

const Equipment = ({ data, isSelected }) => {
    const selectionClass = isSelected ? `ring-blue-500` : 'shadow-lg';
    const textColor = data.textColor || 'text-gray-700';
    const statusColors = {
        activo: 'bg-green-500',
        mantenimiento: 'bg-yellow-500',
        dañado: 'bg-red-500',
        inactivo: 'bg-gray-500',
    };
    const IconComponent = ICONS[data.icon] || ICONS.default;

    return (
        <div style={{ backgroundColor: data.backgroundColor, borderColor: data.borderColor }}
            className={`w-full h-full flex flex-col items-center justify-center p-2 border-2 rounded-md transition-shadow duration-200 ${selectionClass}`}>
            
            <div className="absolute top-1.5 right-1.5 flex items-center">
                <span className={`w-3 h-3 rounded-full ${statusColors[data.status] || 'bg-gray-400'}`}></span>
            </div>

            {data.isEmpty ? (
                <div className="flex flex-col items-center">
                    <div className="w-8 h-8 border-2 border-dashed border-gray-400 rounded-lg flex items-center justify-center mb-2">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                    </div>
                    <div className={`text-xs font-semibold text-center ${textColor}`}>Equipo Vacío</div>
                    <div className={`text-[10px] text-gray-500 text-center`}>Selecciona un equipo</div>
                </div>
            ) : (
                <>
                    <IconComponent className={`w-6 h-6 mb-1 ${textColor}`} />
                    <div className={`text-xs font-semibold whitespace-nowrap overflow-hidden ${textColor}`}>{data.name}</div>
                    <div className={`text-[10px] text-gray-500`}>{data.assetTag}</div>
                </>
            )}
        </div>
    );
};


// === COMPONENT: Layers Panel ===
const LayersPanel = ({ floors, activeFloorId, onToggleLayer, onSelectItem, resetItemOrder, itemZIndex, moveItemUp, moveItemDown }) => {
    const activeFloor = floors.find(f => f.id === activeFloorId);
    if (!activeFloor) return null;

    const getLayerColorFromType = (layerType) => {
        switch (layerType) {
            case 'areas': return 'bg-blue-500';
            case 'equipment': return 'bg-green-500';
            case 'locked_areas': return 'bg-red-500';
            case 'locked_equipment': return 'bg-orange-500';
            default: return 'bg-gray-500';
        }
    };

    // Ordenar elementos por z-index (mayor a menor)
    const sortedItems = [...activeFloor.items].sort((a, b) => {
        const aZIndex = itemZIndex[a.id] || 0;
        const bZIndex = itemZIndex[b.id] || 0;
        return bZIndex - aZIndex; // Mayor z-index primero
    });

    // HTML5 Drag & Drop handlers
    const handleDragStart = (e, itemId) => {
        e.dataTransfer.setData('text/plain', itemId);
        e.dataTransfer.effectAllowed = 'move';
        e.target.style.opacity = '0.5';
    };

    const handleDragEnd = (e) => {
        e.target.style.opacity = '1';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e, targetItemId) => {
        e.preventDefault();
        const draggedItemId = e.dataTransfer.getData('text/plain');
        
        if (draggedItemId && draggedItemId !== targetItemId) {
            // Intercambiar z-index
            const draggedZIndex = itemZIndex[draggedItemId] || 0;
            const targetZIndex = itemZIndex[targetItemId] || 0;
            
            // Actualizar z-index
            const newItemZIndex = { ...itemZIndex };
            newItemZIndex[draggedItemId] = targetZIndex;
            newItemZIndex[targetItemId] = draggedZIndex;
            
            // Actualizar estado (esto se manejará desde el componente padre)
            console.log('Items swapped:', { draggedItemId, targetItemId, draggedZIndex, targetZIndex });
        }
    };

    return (
        <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto max-h-[500px]">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-700">Capas</h3>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={resetItemOrder}
                        className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded text-gray-600"
                        title="Resetear orden de elementos"
                    >
                        Reset
                    </button>
                    <button
                        onClick={() => onToggleLayer()}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 6L6 18"/>
                            <path d="M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
            </div>
            
            <div className="space-y-1">
                {sortedItems.map((item, index) => {
                    const currentZIndex = itemZIndex[item.id] || 0;
                    
                    return (
                        <div 
                            key={item.id}
                            className="border rounded-lg p-2 transition-all duration-200 border-gray-200 hover:border-gray-300 bg-white"
                            draggable
                            onDragStart={(e) => handleDragStart(e, item.id)}
                            onDragEnd={handleDragEnd}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, item.id)}
                        >
                            <div className="flex items-center justify-between">
                                <div 
                                    className="flex items-center flex-1 cursor-pointer" 
                                    onClick={() => onSelectItem(item.id)}
                                >
                                    <svg 
                                        xmlns="http://www.w3.org/2000/svg" 
                                        width="14" 
                                        height="14" 
                                        viewBox="0 0 24 24" 
                                        fill="none" 
                                        stroke="currentColor" 
                                        strokeWidth="2" 
                                        strokeLinecap="round" 
                                        strokeLinejoin="round"
                                        className="text-gray-400 mr-2 cursor-move"
                                    >
                                        <path d="M3 6h18"/>
                                        <path d="M3 12h18"/>
                                        <path d="M3 18h18"/>
                                    </svg>
                                    <div className={`w-2 h-2 rounded-full ${getLayerColorFromType(item.locked ? (item.type === 'area' ? 'locked_areas' : 'locked_equipment') : (item.type === 'area' ? 'areas' : 'equipment'))} mr-2`}></div>
                                    <span className="text-sm text-gray-700 font-medium">
                                        {item.name || `${item.type} ${item.id}`}
                                    </span>
                                    {item.locked && (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500 ml-1">
                                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                        </svg>
                                    )}
                                </div>
                                <div className="flex items-center space-x-1">
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            moveItemUp(item.id);
                                        }}
                                        className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                                        title="Subir elemento"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M18 15l-6-6-6 6"/>
                                        </svg>
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            moveItemDown(item.id);
                                        }}
                                        className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                                        title="Bajar elemento"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M6 9l6 6 6-6"/>
                                        </svg>
                                    </button>
                                    {currentZIndex !== 0 && (
                                        <span className={`text-xs ml-1 ${currentZIndex > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                            {currentZIndex > 0 ? `+${currentZIndex}` : currentZIndex}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// === COMPONENT: Properties Panel ===
const PropertiesPanel = ({ selectedItem, onUpdate, onDelete, availableEquipos = [] }) => {
    if (!selectedItem) {
        return (
            <div className="w-80 bg-white border-l border-gray-200 p-6 flex flex-col items-center justify-center text-center">
                 <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 mb-4"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/><path d="m12 13-2-2 2-2"/><path d="m18 13-2-2 2-2"/></svg>
                <h3 className="text-lg font-semibold text-gray-700">Panel de Propiedades</h3>
                <p className="text-sm text-gray-500 mt-1">Selecciona un elemento para editar sus detalles.</p>
            </div>
        );
    }
    
    const handleInputChange = (e) => onUpdate(selectedItem.id, { [e.target.name]: e.target.value });
    const handleNumericChange = (e) => onUpdate(selectedItem.id, { [e.target.name]: parseInt(e.target.value, 10) || 0 });
    
    const itemTypeDisplay = { area: 'Área', equipment: 'Equipo' };

    return (
        <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto max-h-[500px]">
            <h3 className="text-xl font-bold text-gray-800 mb-6 border-b pb-2">Editar {itemTypeDisplay[selectedItem.type]}</h3>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Código Interno</label>
                    <input type="text" name="name" value={selectedItem.name} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md"/>
                </div>
                {selectedItem.type === 'equipment' && (
                    <>
                        {selectedItem.isEmpty && (
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Seleccionar Equipo</label>
                                <select 
                                    name="equipoId" 
                                    value={selectedItem.equipoId || ''} 
                                    onChange={(e) => {
                                        const selectedEquipo = availableEquipos.find(eq => eq.id == e.target.value);
                                        
                                        if (selectedEquipo) {
                                            onUpdate(selectedItem.id, {
                                                name: selectedEquipo.codigo_interno || 'Sin código',
                                                assetTag: selectedEquipo.persona_asignada || 'Disponible',
                                                status: mapDatabaseStatusToMapStatus(selectedEquipo.estado),
                                                icon: 'default',
                                                backgroundColor: '#D1FAE5',
                                                borderColor: '#10B981',
                                                textColor: '#064E3B',
                                                isEmpty: false,
                                                equipoId: selectedEquipo.id,
                                                originalData: selectedEquipo
                                            });
                                        }
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                >
                                    <option value="">Selecciona un equipo...</option>
                                    {availableEquipos && availableEquipos.length > 0 ? (
                                        availableEquipos.map(equipo => {
                                            const codigoInterno = equipo.codigo_interno || 'Sin código';
                                            const personaAsignada = equipo.persona_asignada || 'Disponible';
                                            const ubicacion = equipo.ubicacion || 'Sin ubicación';
                                            return (
                                                <option key={equipo.id} value={equipo.id}>
                                                    {codigoInterno} - {personaAsignada} ({ubicacion})
                                                </option>
                                            );
                                        })
                                    ) : (
                                        <option value="" disabled>No hay equipos disponibles</option>
                                    )}
                                </select>
                                {availableEquipos && availableEquipos.length === 0 && (
                                    <p className="text-xs text-gray-500 mt-1">No hay equipos disponibles en la base de datos</p>
                                )}
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Persona Asignada</label>
                            <input type="text" name="assetTag" value={selectedItem.assetTag || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Estado</label>
                            <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                                {selectedItem.originalData?.estado || selectedItem.status || 'Sin estado'}
                            </div>
                        </div>
                    </>
                )}
                <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Fondo</label>
                        <input type="color" name="backgroundColor" value={selectedItem.backgroundColor} onChange={handleInputChange} className="w-full h-10 p-1 border"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Borde</label>
                        <input type="color" name="borderColor" value={selectedItem.borderColor} onChange={handleInputChange} className="w-full h-10 p-1 border"/>
                    </div>
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm">Ancho</label><input type="number" name="width" value={Math.round(selectedItem.width)} onChange={handleNumericChange} className="w-full p-2 border rounded"/></div>
                    <div><label className="block text-sm">Alto</label><input type="number" name="height" value={Math.round(selectedItem.height)} onChange={handleNumericChange} className="w-full p-2 border rounded"/></div>
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm">Pos X</label><input type="number" name="x" value={Math.round(selectedItem.x)} onChange={handleNumericChange} className="w-full p-2 border rounded"/></div>
                    <div><label className="block text-sm">Pos Y</label><input type="number" name="y" value={Math.round(selectedItem.y)} onChange={handleNumericChange} className="w-full p-2 border rounded"/></div>
                </div>
            </div>
            <div className="mt-8 pt-4 border-t space-y-3">
                <button 
                    onClick={() => onUpdate(selectedItem.id, { locked: !selectedItem.locked })}
                    className={`w-full font-bold py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-2 ${
                        selectedItem.locked 
                        ? 'bg-yellow-500 text-white hover:bg-yellow-600' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                >
                    {selectedItem.locked ? 
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>
                        :
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                    }
                    {selectedItem.locked ? 'Desbloquear' : 'Bloquear'}
                </button>
                 <button onClick={() => onDelete(selectedItem.id)} className="w-full bg-red-500 text-white font-bold py-2 px-4 rounded-md hover:bg-red-600">Eliminar Elemento</button>
            </div>
        </div>
    );
};


// === MAIN COMPONENT ===
const Map2D = ({ onEquipoSelect, onEquipoDoubleClick, selectedEquipo }) => {
    const [floors, setFloors] = useState([]);
    const [activeFloorId, setActiveFloorId] = useState(null);
    const [selectedId, setSelectedId] = useState(null);
    const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
    const [availableStatuses, setAvailableStatuses] = useState([]);
    const [equipos, setEquipos] = useState([]);
    const [showLayersPanel, setShowLayersPanel] = useState(false);
    const [itemZIndex, setItemZIndex] = useState({}); // z-index individual por item
    const [draggedItem, setDraggedItem] = useState(null);
    const [dragOverItem, setDragOverItem] = useState(null);
    const { activeCompany } = useAppContext();

    const isPanning = useRef(false);
    const lastMousePos = useRef({ x: 0, y: 0 });
    const canvasRef = useRef(null);

    // Prevent scroll propagation
    useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

        const handleWheelCapture = (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            const scaleAmount = -e.deltaY * 0.001;
            setTransform(prev => ({ ...prev, scale: Math.max(0.1, prev.scale + scaleAmount)}));
            return false;
        };

        // Add event listener with capture phase
        canvas.addEventListener('wheel', handleWheelCapture, { passive: false, capture: true });
        
        return () => {
            canvas.removeEventListener('wheel', handleWheelCapture, { capture: true });
        };
    }, []);

    // Load unique statuses from equipos table
    const loadAvailableStatuses = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('equipos')
                .select('estado')
                .not('estado', 'is', null);

            if (error) {
                console.error('Error loading statuses:', error);
                return;
            }

            // Get unique statuses
            const uniqueStatuses = [...new Set(data.map(item => item.estado))].filter(Boolean);
            setAvailableStatuses(uniqueStatuses);
        } catch (error) {
            console.error('Error loading statuses:', error);
        }
    }, []);

    // Load equipos with registros data
    const loadEquiposWithRegistros = useCallback(async () => {
        try {
            // Load equipos
            const { data: equiposData, error: equiposError } = await supabase
                .from('equipos')
                .select('*');

            if (equiposError) {
                console.error('Error loading equipos:', equiposError);
                return [];
            }

            // Load registros
            const { data: registrosData, error: registrosError } = await supabase
                .from('registros')
                .select('*');

            if (registrosError) {
                console.error('Error loading registros:', registrosError);
                return equiposData || [];
            }

            // Process data to include persona_asignada from registros
            const processedData = (equiposData || []).map(equipo => {
                // Find registro for this equipo (where equipo_id matches)
                const registro = (registrosData || []).find(reg => 
                    reg.equipo_id === equipo.id
                );
                
                return {
                    ...equipo,
                    persona_asignada: registro ? registro.nombre : 'Disponible'
                };
            });

            return processedData;
        } catch (error) {
            console.error('Error loading equipos with registros:', error);
            return [];
        }
    }, []);

    // Load map items from database
    const loadMapItems = useCallback(async (floorId) => {
        try {
            const { data: mapItems, error } = await supabase
                .from('map_items')
                .select('*')
                .eq('floor_id', floorId);

            if (error) {
                console.error('Error loading map items:', error);
                return [];
            }

            if (!mapItems || mapItems.length === 0) {
                return [];
            }

            const processedItems = mapItems.map(item => {
                const processedItem = {
                    id: item.id,
                    type: item.item_type,
                    name: item.name,
                    assetTag: item.asset_tag || 'N/A',
                    status: item.status || 'activo',
                    icon: item.icon || 'default',
                    x: item.x || 50,
                    y: item.y || 50,
                    width: item.width || 100,
                    height: item.height || 80,
                    backgroundColor: item.background_color || '#F3F4F6',
                    borderColor: item.border_color || '#6B7280',
                    textColor: item.text_color || '#374151',
                    locked: item.is_locked || false,
                    isEmpty: item.is_empty || false,
                    equipoId: item.equipo_id,
                    originalData: item.original_data || item
                };
                return processedItem;
            });

            return processedItems;
        } catch (error) {
            console.error('Error loading map items:', error);
            return [];
        }
    }, []);

    // Convert equipos data to floor plan items (for selector only)
    const convertEquiposToItems = useCallback((equiposData) => {
        return equiposData.map(equipo => ({
            id: `equip-${equipo.id}`,
            type: 'equipment',
            name: equipo.codigo_interno || 'Sin código',
            assetTag: equipo.persona_asignada || 'Disponible',
            status: mapDatabaseStatusToMapStatus(equipo.estado),
            icon: equipo.tipo?.toLowerCase() || 'default',
            x: equipo.x_coordinate || 50,
            y: equipo.y_coordinate || 50,
            width: 100,
            height: 80,
            backgroundColor: getEquipoBackgroundColor(equipo.estado),
            borderColor: getEquipoBorderColor(equipo.estado),
            textColor: getEquipoTextColor(equipo.estado),
            locked: false,
            originalData: equipo
        }));
    }, []);

    // Helper functions for colors
    const getEquipoBackgroundColor = (estado) => {
        switch (estado?.toLowerCase()) {
            case 'activo': return '#D1FAE5';
            case 'mantenimiento': return '#FEF3C7';
            case 'dañado': return '#FEE2E2';
            case 'inactivo': return '#F3F4F6';
            default: return '#E0E7FF';
        }
    };

    const getEquipoBorderColor = (estado) => {
        switch (estado?.toLowerCase()) {
            case 'activo': return '#10B981';
            case 'mantenimiento': return '#F59E0B';
            case 'dañado': return '#EF4444';
            case 'inactivo': return '#6B7280';
            default: return '#4F46E5';
        }
    };

    const getEquipoTextColor = (estado) => {
        switch (estado?.toLowerCase()) {
            case 'activo': return '#064E3B';
            case 'mantenimiento': return '#92400E';
            case 'dañado': return '#991B1B';
            case 'inactivo': return '#374151';
            default: return '#3730A3';
        }
    };

    // Load initial state from equipos data
    // Load initial data from map_items
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                // First, check if we have any floors
                const { data: existingFloors, error: floorsError } = await supabase
                    .from('map_floors')
                    .select('*')
                    .order('created_at', { ascending: true });

                if (floorsError) {
                    console.error('Error loading floors:', floorsError);
                    return;
                }

                if (existingFloors && existingFloors.length > 0) {
                    // Load items for each floor
                    const floorsWithItems = await Promise.all(
                        existingFloors.map(async (floor) => {
                            const items = await loadMapItems(floor.id);
                            return {
                                id: floor.id,
                                name: floor.name,
                                items: items
                            };
                        })
                    );
                    setFloors(floorsWithItems);
                    setActiveFloorId(existingFloors[0].id);
                } else {
                    // Create a default floor if none exists
                    const firstFloorId = `floor-${Date.now()}`;
                    
                    // Create floor in database
                    const { error: floorError } = await supabase
                        .from('map_floors')
                        .insert({
                            id: firstFloorId,
                            name: 'Plano Principal',
                            company_id: activeCompany?.id || null
                        });
                    
                    if (floorError) {
                        console.error('Error creating floor:', floorError);
                    }
                    
                    const newFloors = [{
                        id: firstFloorId,
                        name: 'Plano Principal',
                        items: []
                    }];
                    setFloors(newFloors);
                    setActiveFloorId(firstFloorId);
                }
            } catch (error) {
                console.error('Error loading initial data:', error);
            }
        };

        loadInitialData();
        loadAvailableStatuses();
    }, [activeCompany?.id]);

    // Load equipos with registros data
    useEffect(() => {
        const loadEquipos = async () => {
            const equiposData = await loadEquiposWithRegistros();
            setEquipos(equiposData);
        };
        loadEquipos();
    }, [loadEquiposWithRegistros]);

    // Funciones para drag & drop de elementos individuales
    const handleItemDragStart = useCallback((e, itemId) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', itemId);
        setDraggedItem(itemId);
        console.log('Item drag started:', itemId);
    }, []);

    const handleItemDragOver = useCallback((e, itemId) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverItem(itemId);
    }, []);

    const handleItemDragLeave = useCallback(() => {
        setDragOverItem(null);
    }, []);

    const handleItemDrop = useCallback((e, targetItemId) => {
        e.preventDefault();
        const draggedItemId = e.dataTransfer.getData('text/plain');
        
        if (draggedItemId && draggedItemId !== targetItemId) {
            // Intercambiar z-index de los elementos
            setItemZIndex(prev => {
                const newZIndex = { ...prev };
                const draggedZIndex = newZIndex[draggedItemId] || 0;
                const targetZIndex = newZIndex[targetItemId] || 0;
                
                newZIndex[draggedItemId] = targetZIndex;
                newZIndex[targetItemId] = draggedZIndex;
                
                console.log('Items z-index swapped:', { draggedItemId, targetItemId, draggedZIndex, targetZIndex });
                return newZIndex;
            });
        }
        
        setDraggedItem(null);
        setDragOverItem(null);
    }, []);

    const handleItemDragEnd = useCallback(() => {
        setDraggedItem(null);
        setDragOverItem(null);
    }, []);

    const moveItemUp = useCallback((itemId) => {
        console.log('Moving item up:', itemId);
        setItemZIndex(prev => {
            // Encontrar el z-index más alto actual
            const allZIndexes = Object.values(prev);
            const maxZIndex = allZIndexes.length > 0 ? Math.max(...allZIndexes) : 0;
            
            // Poner el elemento por encima de todos los demás
            const newZIndex = maxZIndex + 1;
            console.log(`Item ${itemId}: bringing to front with z-index ${newZIndex}`);
            return {
                ...prev,
                [itemId]: newZIndex
            };
        });
    }, []);

    const moveItemDown = useCallback((itemId) => {
        console.log('Moving item down:', itemId);
        setItemZIndex(prev => {
            // Encontrar el z-index más bajo actual
            const allZIndexes = Object.values(prev);
            const minZIndex = allZIndexes.length > 0 ? Math.min(...allZIndexes) : 0;
            
            // Poner el elemento por debajo de todos los demás
            const newZIndex = minZIndex - 1;
            console.log(`Item ${itemId}: sending to back with z-index ${newZIndex}`);
            return {
                ...prev,
                [itemId]: newZIndex
            };
        });
    }, []);

    const resetItemOrder = useCallback(() => {
        console.log('Resetting item order');
        setItemZIndex({});
    }, []);

    // Debug: Log itemZIndex changes
    useEffect(() => {
        console.log('itemZIndex updated:', itemZIndex);
    }, [itemZIndex]);

    // Función para obtener el z-index final de un elemento
    const getFinalZIndex = useCallback((baseLayer, layerType, itemId) => {
        const customZIndex = itemZIndex[itemId] || 0;
        const finalZIndex = baseLayer + customZIndex;
        console.log(`getFinalZIndex: ${itemId} = ${baseLayer} + ${customZIndex} = ${finalZIndex}`);
        return finalZIndex;
    }, [itemZIndex]);

    // Update equipos when items change
    const updateEquipoPosition = useCallback(async (itemId, newProps) => {
        const item = floors.find(f => f.id === activeFloorId)?.items.find(i => i.id === itemId);
        if (!item || !item.originalData) return;

        try {
            const { error } = await supabase
                .from('equipos')
                .update({
                    x_coordinate: newProps.x,
                    y_coordinate: newProps.y
                })
                .eq('id', item.originalData.id)
                .eq('company_id', activeCompany?.id);

            if (error) {
                console.error('Error updating equipo position:', error);
                return;
            }

            // Update local state
            setFloors(prevFloors => 
                prevFloors.map(floor => 
                    floor.id === activeFloorId 
                        ? {
                            ...floor,
                            items: floor.items.map(item => 
                                item.id === itemId 
                                    ? { ...item, ...newProps }
                                    : item
                            )
                        }
                        : floor
                )
            );

            // Notify parent component
            if (onEquipoSelect) {
                const updatedItem = floors.find(f => f.id === activeFloorId)?.items.find(i => i.id === itemId);
                if (updatedItem) {
                    onEquipoSelect(updatedItem.originalData);
                }
            }
        } catch (error) {
            console.error('Error updating equipo:', error);
        }
    }, [floors, activeFloorId, activeCompany, onEquipoSelect]);

    const handleAddFloor = async () => {
        try {
            const newFloor = { 
                id: `floor-${Date.now()}`, 
                name: `Piso ${floors.length + 1}`, 
                items: [] 
            };
            
            // Save to database
            const { error } = await supabase
                .from('map_floors')
                .insert({
                    id: newFloor.id,
                    name: newFloor.name,
                    company_id: activeCompany?.id || null
                });

            if (error) {
                console.error('Error creating floor:', error);
                return;
            }

            // Update local state
            setFloors([...floors, newFloor]);
            setActiveFloorId(newFloor.id);
        } catch (error) {
            console.error('Error creating floor:', error);
        }
    };
    
    const handleRenameFloor = async (floorId, newName) => {
        try {
            // Update database
            const { error } = await supabase
                .from('map_floors')
                .update({ name: newName })
                .eq('id', floorId);

            if (error) {
                console.error('Error renaming floor:', error);
                return;
            }

            // Update local state
            setFloors(floors.map(f => f.id === floorId ? { ...f, name: newName } : f));
        } catch (error) {
            console.error('Error renaming floor:', error);
        }
    };

    const updateActiveFloorItems = (updateFn) => {
        setFloors(floors.map(f => f.id === activeFloorId ? { ...f, items: updateFn(f.items) } : f));
    };

    const handleAddItem = async (type) => {
        try {
            const newItem = type === 'area'
                ? { 
                    id: `area-${Date.now()}`, 
                    type: 'area', 
                    name: 'Nueva Área', 
                    x: 20, 
                    y: 20, 
                    width: 300, 
                    height: 200, 
                    backgroundColor: '#F3F4F6', 
                    borderColor: '#6B7280', 
                    locked: false 
                }
                : { 
                    id: `equip-${Date.now()}`, 
                    type: 'equipment', 
                    name: 'Equipo Vacío', 
                    assetTag: '', 
                    status: 'activo', 
                    icon: 'default', 
                    x: 30, 
                    y: 30, 
                    width: 100, 
                    height: 80, 
                    backgroundColor: '#FEF3C7', 
                    borderColor: '#F59E0B', 
                    textColor: '#92400E',
                    locked: false,
                    isEmpty: true // Marcar como equipo vacío
                };

            // Save to database
            const { error } = await supabase
                .from('map_items')
                .insert({
                    id: newItem.id,
                    floor_id: activeFloorId,
                    item_type: newItem.type,
                    name: newItem.name,
                    x: newItem.x,
                    y: newItem.y,
                    width: newItem.width,
                    height: newItem.height,
                    background_color: newItem.backgroundColor,
                    border_color: newItem.borderColor,
                    text_color: newItem.textColor,
                    is_locked: newItem.locked,
                    is_empty: newItem.isEmpty || false,
                    asset_tag: newItem.assetTag,
                    status: newItem.status,
                    icon: newItem.icon
                });

            if (error) {
                console.error('Error saving item to database:', error);
            }

            // Update local state
            updateActiveFloorItems(items => [...items, newItem]);
            setSelectedId(newItem.id);
        } catch (error) {
            console.error('Error adding item:', error);
        }
    };

    const handleUpdateItem = useCallback(async (id, updatedData) => {
        // Update local state
        updateActiveFloorItems(items => items.map(item => item.id === id ? { ...item, ...updatedData } : item));
        
        // Update database
        try {
            const dbUpdateData = {};
            
            // Map the updated data to database fields
            if (updatedData.x !== undefined) dbUpdateData.x = updatedData.x;
            if (updatedData.y !== undefined) dbUpdateData.y = updatedData.y;
            if (updatedData.width !== undefined) dbUpdateData.width = updatedData.width;
            if (updatedData.height !== undefined) dbUpdateData.height = updatedData.height;
            if (updatedData.name !== undefined) dbUpdateData.name = updatedData.name;
            if (updatedData.assetTag !== undefined) dbUpdateData.asset_tag = updatedData.assetTag;
            if (updatedData.status !== undefined) dbUpdateData.status = updatedData.status;
            if (updatedData.backgroundColor !== undefined) dbUpdateData.background_color = updatedData.backgroundColor;
            if (updatedData.borderColor !== undefined) dbUpdateData.border_color = updatedData.borderColor;
            if (updatedData.textColor !== undefined) dbUpdateData.text_color = updatedData.textColor;
            if (updatedData.locked !== undefined) dbUpdateData.is_locked = updatedData.locked;
            if (updatedData.isEmpty !== undefined) dbUpdateData.is_empty = updatedData.isEmpty;
            if (updatedData.equipoId !== undefined) dbUpdateData.equipo_id = updatedData.equipoId;
            if (updatedData.originalData !== undefined) dbUpdateData.original_data = updatedData.originalData;

            // Only update if there's something to update
            if (Object.keys(dbUpdateData).length > 0) {
                const { error } = await supabase
                    .from('map_items')
                    .update(dbUpdateData)
                    .eq('id', id);

                if (error) {
                    console.error('Error updating item in database:', error);
                }
            }
        } catch (error) {
            console.error('Error updating item:', error);
        }
    }, [updateActiveFloorItems]);

    
    const handleDeleteItem = async (id) => {
        try {
            // Eliminar de la base de datos si existe
            const { error } = await supabase
                .from('map_items')
                .delete()
                .eq('id', id);
            
            if (error) {
                console.error('Error deleting item from database:', error);
            }
            
            // Eliminar del estado local
            updateActiveFloorItems(items => items.filter(item => item.id !== id));
            setSelectedId(null);
        } catch (error) {
            console.error('Error deleting item:', error);
            // Aún así eliminar del estado local
            updateActiveFloorItems(items => items.filter(item => item.id !== id));
            setSelectedId(null);
        }
    };

    const handleSelect = useCallback((item) => {
        setSelectedId(item.id);
        // Solo seleccionar visualmente, no abrir modal
  }, []);

    const handleDoubleClick = useCallback((item) => {
        setSelectedId(item.id);
        if (onEquipoDoubleClick && item.originalData) {
            onEquipoDoubleClick(item.originalData);
        }
    }, [onEquipoDoubleClick]);
    
    // --- Pan and Zoom handlers ---
    const handleWheel = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        const scaleAmount = -e.deltaY * 0.001;
        setTransform(prev => ({ ...prev, scale: Math.max(0.1, prev.scale + scaleAmount)}));
        return false;
    };

    const handleMouseDownCanvas = (e) => {
        e.stopPropagation();
        if (e.buttons === 1) { // Left click
            isPanning.current = true;
            lastMousePos.current = { x: e.clientX, y: e.clientY };
        }
    };
    
    const handleMouseMoveCanvas = (e) => {
        if (!isPanning.current) return;
        e.stopPropagation();
        const dx = e.clientX - lastMousePos.current.x;
        const dy = e.clientY - lastMousePos.current.y;
        setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
        lastMousePos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUpCanvas = () => isPanning.current = false;

    const activeFloor = floors.find(f => f.id === activeFloorId);
    const itemsToRender = activeFloor ? activeFloor.items : [];
    const selectedItem = itemsToRender.find(item => item.id === selectedId);

  return (
        <div className="h-[800px] w-full bg-gray-100 flex flex-col font-sans select-none rounded-lg border">
            <header className="bg-white border-b p-3 shadow-sm flex items-center justify-between z-20">
                <h1 className="text-xl font-bold">Plano de Activos</h1>
                <div className="flex items-center gap-2">
                    <button onClick={() => handleAddItem('area')} className="bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg shadow hover:bg-blue-600">Añadir Área</button>
                    <button onClick={() => handleAddItem('equipment')} className="bg-green-500 text-white font-semibold py-2 px-4 rounded-lg shadow hover:bg-green-600">Añadir Equipo</button>
      </div>
            </header>
            
            <div className="bg-gray-100 border-b px-4 py-2 flex items-center gap-2 z-10">
                 {floors.map(floor => (
                    <div key={floor.id} onDoubleClick={() => { const newName = prompt("Nuevo nombre:", floor.name); if (newName) handleRenameFloor(floor.id, newName); }}
                        className={`px-4 py-2 rounded-md cursor-pointer font-semibold ${activeFloorId === floor.id ? 'bg-indigo-600 text-white' : 'bg-white hover:bg-gray-200'}`}
                        onClick={() => setActiveFloorId(floor.id)}>
                        {floor.name}
                    </div>
                ))}
                <button onClick={handleAddFloor} className="bg-white font-bold py-2 px-3 rounded-md hover:bg-gray-200">+</button>
      </div>

            <main className="flex-grow flex overflow-hidden">
                <div id="canvas-container" ref={canvasRef} className="flex-grow h-full bg-gray-50 relative overflow-hidden"
                    onMouseDown={handleMouseDownCanvas}
                    onMouseMove={handleMouseMoveCanvas}
                    onMouseUp={handleMouseUpCanvas}
                    onMouseLeave={handleMouseUpCanvas} 
                    onClick={(e) => { if(e.target.id === "canvas-container" || e.target.id === "canvas-content") setSelectedId(null)}}
                    style={{ backgroundImage: 'radial-gradient(#d1d5db 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                    
                    <div id="canvas-content" className="absolute top-0 left-0"
                         style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`, transformOrigin: 'top left' }}>
                        
                        {itemsToRender.map(item => (
                             <DraggableResizableItem key={item.id} data={item} onUpdate={handleUpdateItem} onSelect={handleSelect} onDoubleClick={handleDoubleClick} isSelected={selectedId === item.id} scale={transform.scale} getFinalZIndex={getFinalZIndex}>
                                {item.type === 'area' ? 
                                    <Area data={item} isSelected={selectedId === item.id} /> : 
                                    <Equipment data={item} isSelected={selectedId === item.id} />
                                }
                            </DraggableResizableItem>
                        ))}

          </div>
          </div>
                <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
                    {/* Header con botones de alternancia */}
                    <div className="flex border-b border-gray-200">
                        <button
                            onClick={() => setShowLayersPanel(false)}
                            className={`flex-1 px-4 py-3 text-sm font-medium ${
                                !showLayersPanel 
                                    ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' 
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            Propiedades
                        </button>
                        <button
                            onClick={() => setShowLayersPanel(true)}
                            className={`flex-1 px-4 py-3 text-sm font-medium ${
                                showLayersPanel 
                                    ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' 
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            Capas
                        </button>
          </div>
                    
                    {/* Contenido del panel */}
                    <div className="flex-1 overflow-hidden">
                        {showLayersPanel ? (
                        <LayersPanel 
                            floors={floors} 
                            activeFloorId={activeFloorId} 
                            onToggleLayer={() => setShowLayersPanel(false)}
                            onSelectItem={(id) => setSelectedId(id)}
                            resetItemOrder={resetItemOrder}
                            itemZIndex={itemZIndex}
                            moveItemUp={moveItemUp}
                            moveItemDown={moveItemDown}
                        />
                        ) : (
                            <PropertiesPanel selectedItem={selectedItem} onUpdate={handleUpdateItem} onDelete={handleDeleteItem} availableEquipos={equipos}/>
                        )}
                    </div>
          </div>
            </main>
    </div>
  );
};

export default Map2D;
