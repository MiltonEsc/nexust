import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { supabase } from '../../supabaseClient';
import { useAppContext } from '../../context/AppContext';
import LayerManager from './LayerManager';

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
    LOCKED_AREAS: 5,    // Áreas bloqueadas (más bajas)
    LOCKED_EQUIPMENT: 6, // Equipos bloqueados (más bajas)
    AREAS: 10,          // Áreas normales
    EQUIPMENT: 20,      // Equipos normales
    SELECTED: 50,       // Elementos seleccionados (más alto)
    UI_OVERLAY: 100     // Elementos de interfaz
};

// === COMPONENT: Resizable and Draggable Item ===
const DraggableResizableItem = ({ children, data, onUpdate, onSelect, onDoubleClick, isSelected, isMultiSelected, scale, getFinalZIndex, isLayerVisible, getLayerOpacity, isLayerLocked, onMultiSelect, onMoveSelectedElements, selectedIds, floors, activeFloorId, setSelectedItemsInitialPositions, isSpacePressed }) => {
    const itemRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [resizeDirection, setResizeDirection] = useState(null); // 'se', 'sw', 'ne', 'nw'
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
    const [tempPosition, setTempPosition] = useState({ x: data.x, y: data.y });
    const [tempSize, setTempSize] = useState({ width: data.width, height: data.height });
    const animationFrameRef = useRef(null);
    const lastUpdateTime = useRef(0);
    const updateThrottle = 16; // ~60fps

    // Sincronizar posiciones temporales con data cuando no estamos arrastrando
    useEffect(() => {
        if (!isDragging && !isResizing) {
            setTempPosition({ x: data.x, y: data.y });
            setTempSize({ width: data.width, height: data.height });
        }
    }, [data.x, data.y, data.width, data.height, isDragging, isResizing]);

    // Cleanup animation frame al desmontar
    useEffect(() => {
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, []);

    const handleMouseDown = useCallback((e, actionType, direction = null) => {
        // Si space está presionado, no manejar interacciones de elementos
        if (isSpacePressed) {
            return;
        }
        
        // Solo preventDefault si es necesario
        if (actionType === 'drag' || actionType.startsWith('resize')) {
            e.preventDefault();
        }
        e.stopPropagation();
        
        // Verificar si está bloqueado por la capa
        const isLocked = isLayerLocked ? isLayerLocked('item', data.id) : false;
        
        // Si está bloqueado, no permitir selección ni interacción
        if (isLocked) {
            return;
        }

        if (actionType === 'drag') {
            // Si el elemento no está seleccionado, seleccionarlo
            if (!isSelected) {
                onSelect(data);
            }
            // Si hay selección múltiple real (más de 1 elemento), no cambiar la selección
            // Solo iniciar el arrastre
            
            setIsDragging(true);
            setDragStart({
                x: e.clientX,
                y: e.clientY
            });
            setTempPosition({ x: data.x, y: data.y });
            
            // Debug para elementos recién creados
            const isNewElement = data.id.includes(Date.now().toString().slice(-6)); // Últimos 6 dígitos del timestamp
            if (isNewElement || data.name.includes('Nueva') || data.name.includes('Vacío')) {
                console.log(`Iniciando arrastre de elemento nuevo: ${data.name}`, {
                    elementPos: { x: data.x, y: data.y },
                    mousePos: { x: e.clientX, y: e.clientY },
                    scale: scale
                });
            }
            
            // Si hay selección múltiple real (más de 1 elemento), guardar las posiciones iniciales
            if (isMultiSelected && onMoveSelectedElements && selectedIds.size > 1) {
                const currentFloor = floors.find(f => f.id === activeFloorId);
                if (currentFloor) {
                    const initialPositions = new Map();
                    currentFloor.items.forEach(item => {
                        if (selectedIds.has(item.id)) {
                            initialPositions.set(item.id, { x: item.x, y: item.y });
                        }
                    });
                    setSelectedItemsInitialPositions(initialPositions);
                    console.log(`Posiciones iniciales guardadas para ${initialPositions.size} elementos`);
                }
            }
        } else if (actionType.startsWith('resize')) {
            // Para resize, necesitamos seleccionar el elemento si no está seleccionado
            if (!isSelected) {
                onSelect(data);
            }
            setIsResizing(true);
            setResizeDirection(direction);
            setResizeStart({
                x: e.clientX,
                y: e.clientY,
                width: data.width,
                height: data.height,
                elementX: data.x,
                elementY: data.y
            });
            setTempSize({ width: data.width, height: data.height });
            setTempPosition({ x: data.x, y: data.y });
        }
    }, [data, onSelect, isLayerLocked, isSpacePressed]);

    const handleMouseMove = useCallback((e) => {
        if (isDragging) {
            const newX = data.x + (e.clientX - dragStart.x) / scale;
            const newY = data.y + (e.clientY - dragStart.y) / scale;
            
            // Debug para elementos recién creados
            const isNewElement = data.name.includes('Nueva') || data.name.includes('Vacío');
            if (isNewElement) {
                console.log(`Moviendo elemento nuevo: ${data.name}`, {
                    originalPos: { x: data.x, y: data.y },
                    newPos: { x: newX, y: newY },
                    mouseDelta: { x: e.clientX - dragStart.x, y: e.clientY - dragStart.y },
                    scale: scale
                });
            }
            
            // Si hay selección múltiple real (más de 1 elemento), mover todos los elementos seleccionados
            if (isMultiSelected && onMoveSelectedElements && selectedIds.size > 1) {
                // Calcular el delta desde la posición inicial del elemento que se está arrastrando
                const deltaX = newX - data.x;
                const deltaY = newY - data.y;
                
                // Actualizar la posición visual temporal inmediatamente para feedback visual
                setTempPosition({ x: newX, y: newY });
                
                // Throttling inteligente: solo actualizar cada 16ms (~60fps) para evitar bucles
                const now = Date.now();
                if (now - lastUpdateTime.current >= updateThrottle) {
                    onMoveSelectedElements(deltaX, deltaY);
                    lastUpdateTime.current = now;
                }
            } else {
                // Movimiento individual - sin throttling para máxima responsividad
                setTempPosition({ x: newX, y: newY });
            }
        } else if (isResizing) {
            const deltaX = (e.clientX - resizeStart.x) / scale;
            const deltaY = (e.clientY - resizeStart.y) / scale;
            
            let newWidth = resizeStart.width;
            let newHeight = resizeStart.height;
            let newX = resizeStart.elementX;
            let newY = resizeStart.elementY;
            
            // Calcular nuevas dimensiones y posición según la dirección
            switch (resizeDirection) {
                case 'se': // Esquina inferior derecha (comportamiento original)
                    newWidth = Math.max(50, resizeStart.width + deltaX);
                    newHeight = Math.max(50, resizeStart.height + deltaY);
                    break;
                case 'sw': // Esquina inferior izquierda
                    newWidth = Math.max(50, resizeStart.width - deltaX);
                    newHeight = Math.max(50, resizeStart.height + deltaY);
                    newX = resizeStart.elementX + deltaX;
                    if (newWidth === 50) newX = resizeStart.elementX + resizeStart.width - 50;
                    break;
                case 'ne': // Esquina superior derecha
                    newWidth = Math.max(50, resizeStart.width + deltaX);
                    newHeight = Math.max(50, resizeStart.height - deltaY);
                    newY = resizeStart.elementY + deltaY;
                    if (newHeight === 50) newY = resizeStart.elementY + resizeStart.height - 50;
                    break;
                case 'nw': // Esquina superior izquierda
                    newWidth = Math.max(50, resizeStart.width - deltaX);
                    newHeight = Math.max(50, resizeStart.height - deltaY);
                    newX = resizeStart.elementX + deltaX;
                    newY = resizeStart.elementY + deltaY;
                    if (newWidth === 50) newX = resizeStart.elementX + resizeStart.width - 50;
                    if (newHeight === 50) newY = resizeStart.elementY + resizeStart.height - 50;
                    break;
                default: // Fallback al comportamiento original
                    newWidth = Math.max(50, resizeStart.width + deltaX);
                    newHeight = Math.max(50, resizeStart.height + deltaY);
                    break;
            }
            
            setTempSize({ width: newWidth, height: newHeight });
            setTempPosition({ x: newX, y: newY });
        }
    }, [isDragging, isResizing, dragStart, resizeStart, resizeDirection, isMultiSelected, onMoveSelectedElements, data.x, data.y, selectedIds.size, updateThrottle, scale]);

    const handleMouseUp = useCallback(() => {
        if (isDragging) {
            // Actualizar BD con la posición final (redondeada a enteros)
            onUpdate(data.id, { x: Math.round(tempPosition.x), y: Math.round(tempPosition.y) });
            setIsDragging(false);
            // Limpiar el tiempo de actualización
            lastUpdateTime.current = 0;
        } else if (isResizing) {
            // Actualizar BD con el tamaño y posición final (redondeado a enteros)
            const updateData = { 
                width: Math.round(tempSize.width), 
                height: Math.round(tempSize.height)
            };
            
            // Solo actualizar posición si cambió (para esquinas que mueven el elemento)
            if (resizeDirection === 'sw' || resizeDirection === 'ne' || resizeDirection === 'nw') {
                updateData.x = Math.round(tempPosition.x);
                updateData.y = Math.round(tempPosition.y);
            }
            
            onUpdate(data.id, updateData);
            setIsResizing(false);
            setResizeDirection(null);
        }
    }, [isDragging, isResizing, resizeDirection, tempPosition, tempSize, data.id, onUpdate]);

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
    const multiSelectionClass = isMultiSelected ? `ring-2 ring-offset-1 ring-purple-400` : '';
    const isLocked = isLayerLocked ? isLayerLocked('item', data.id) : data.locked;
    const cursorClass = isLocked ? 'cursor-not-allowed' : (isDragging ? 'cursor-grabbing' : 'cursor-move');
    
    // Función para determinar la capa correcta
    const getLayer = () => {
        // Determinar tipo de elemento
        const isArea = data.type === 'area';
        const isEquipment = data.type === 'equipment';
        
        let baseLayer;
        let layerType;
        
        // Verificar si está bloqueado por la capa
        const isLocked = isLayerLocked ? isLayerLocked('item', data.id) : data.locked;
        
        // Si está bloqueado, usar capas de bloqueo (más bajas)
        if (isLocked) {
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
            // Elementos normales (más altos)
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
        return getFinalZIndex ? getFinalZIndex(data.id, data.type) : baseLayer;
    };

    // Verificar si el elemento debe ser visible según la capa
    const shouldBeVisible = () => {
        return isLayerVisible ? isLayerVisible('item', data.id) : true;
    };

    // Obtener opacidad del elemento según la capa
    const getElementOpacity = () => {
        return getLayerOpacity ? getLayerOpacity('item', data.id) : 1;
    };
    
    // Debug: Log layer para elementos bloqueados
    if (data.locked) {
        console.log(`Elemento bloqueado ${data.id} (${data.type}): layer = ${getLayer()}, isSelected = ${isSelected}`);
    }

    // No renderizar si la capa no está visible
    if (!shouldBeVisible()) {
        console.log(`Elemento no renderizado por capa invisible:`, {
            id: data.id,
            name: data.name,
            type: data.type
        });
        return null;
    }

    return (
        <div
            ref={itemRef}
            className={`absolute ${cursorClass} ${selectionClass} ${multiSelectionClass} transition-all duration-300 ease-out`}
            style={{
                left: `${(isDragging || isResizing) ? tempPosition.x : data.x}px`,
                top: `${(isDragging || isResizing) ? tempPosition.y : data.y}px`,
                width: `${isResizing ? tempSize.width : data.width}px`,
                height: `${isResizing ? tempSize.height : data.height}px`,
                zIndex: getLayer(),
                position: 'absolute',
                opacity: getElementOpacity(),
                willChange: (isDragging || isResizing) ? 'transform, left, top' : 'auto',
                transition: (isDragging || isResizing) ? 'none' : 'all 0.2s ease-out',
                transform: (isDragging || isResizing) ? 'scale(1.01)' : 'scale(1)',
                filter: (isDragging || isResizing) ? 'drop-shadow(0 6px 12px rgba(0, 0, 0, 0.12))' : 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.08))',
            }}
            onMouseDown={(e) => handleMouseDown(e, 'drag')}
            onClick={(e) => {
                e.stopPropagation();
                // Solo permitir selección si no está bloqueado y no se está arrastrando
                if (!isLocked && !isDragging) {
                    if (onMultiSelect) {
                        onMultiSelect(data.id, e.ctrlKey || e.metaKey);
                    } else {
                        // Solo seleccionar si no está ya seleccionado
                        if (!isSelected) {
                            onSelect(data);
                        }
                    }
                }
            }}
            onContextMenu={handleRightClick}
            onDoubleClick={handleDoubleClick}
        >
            {children}
            {isLocked && (
                <div className="absolute top-1.5 left-1.5 p-1 bg-black/30 rounded-full flex items-center justify-center animate-pulse" title="Elemento bloqueado - Clic derecho para ver propiedades">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-bounce"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                </div>
            )}
            {isSelected && !isLocked && (
                <>
                    {/* Manijas de redimensionamiento para áreas - 4 esquinas */}
                    {data.type === 'area' ? (
                        <>
                            {/* Esquina superior izquierda */}
                            <div
                                className="absolute top-0 left-0 w-4 h-4 bg-white border-2 border-blue-500 rounded-full cursor-nw-resize -ml-2 -mt-2 transition-all duration-200 hover:scale-110 hover:shadow-lg"
                                onMouseDown={(e) => handleMouseDown(e, 'resize', 'nw')}
                            />
                            {/* Esquina superior derecha */}
                            <div
                                className="absolute top-0 right-0 w-4 h-4 bg-white border-2 border-blue-500 rounded-full cursor-ne-resize -mr-2 -mt-2 transition-all duration-200 hover:scale-110 hover:shadow-lg"
                                onMouseDown={(e) => handleMouseDown(e, 'resize', 'ne')}
                            />
                            {/* Esquina inferior izquierda */}
                            <div
                                className="absolute bottom-0 left-0 w-4 h-4 bg-white border-2 border-blue-500 rounded-full cursor-sw-resize -ml-2 -mb-2 transition-all duration-200 hover:scale-110 hover:shadow-lg"
                                onMouseDown={(e) => handleMouseDown(e, 'resize', 'sw')}
                            />
                            {/* Esquina inferior derecha */}
                            <div
                                className="absolute bottom-0 right-0 w-4 h-4 bg-white border-2 border-blue-500 rounded-full cursor-nwse-resize -mr-2 -mb-2 transition-all duration-200 hover:scale-110 hover:shadow-lg"
                                onMouseDown={(e) => handleMouseDown(e, 'resize', 'se')}
                            />
                        </>
                    ) : (
                        /* Manija única para equipos (comportamiento original) */
                        <div
                            className="absolute bottom-0 right-0 w-4 h-4 bg-white border-2 border-blue-500 rounded-full cursor-nwse-resize -mr-2 -mb-2 transition-all duration-200 hover:scale-110 hover:shadow-lg animate-pulse"
                            onMouseDown={(e) => handleMouseDown(e, 'resize', 'se')}
                        />
                    )}
                </>
            )}
        </div>
    );
};


// === COMPONENT: Area ===
const Area = memo(({ data, isSelected }) => {
    const selectionClass = isSelected ? `ring-blue-500` : `shadow-md`;
    const textColor = data.textColor || 'text-gray-800';
    return (
        <div style={{ backgroundColor: data.backgroundColor, borderColor: data.borderColor }}
            className={`w-full h-full p-4 border-2 rounded-lg transition-shadow duration-200 ${selectionClass}`}>
            <div className={`font-bold ${textColor}`}>{data.name}</div>
        </div>
    );
}, (prevProps, nextProps) => {
    // Comparador personalizado para evitar re-renders innecesarios
    return (
        prevProps.data.id === nextProps.data.id &&
        prevProps.data.name === nextProps.data.name &&
        prevProps.data.backgroundColor === nextProps.data.backgroundColor &&
        prevProps.data.borderColor === nextProps.data.borderColor &&
        prevProps.data.textColor === nextProps.data.textColor &&
        prevProps.isSelected === nextProps.isSelected
    );
});

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

const Equipment = memo(({ data, isSelected }) => {
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
}, (prevProps, nextProps) => {
    // Comparador personalizado para evitar re-renders innecesarios
    return (
        prevProps.data.id === nextProps.data.id &&
        prevProps.data.name === nextProps.data.name &&
        prevProps.data.backgroundColor === nextProps.data.backgroundColor &&
        prevProps.data.borderColor === nextProps.data.borderColor &&
        prevProps.data.textColor === nextProps.data.textColor &&
        prevProps.data.status === nextProps.data.status &&
        prevProps.data.icon === nextProps.data.icon &&
        prevProps.data.isEmpty === nextProps.data.isEmpty &&
        prevProps.data.assetTag === nextProps.data.assetTag &&
        prevProps.isSelected === nextProps.isSelected
    );
});


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
        <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto h-full flex flex-col">
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
            
            <div className="space-y-1 flex-1 overflow-y-auto">
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
const PropertiesPanel = ({ selectedItem, onUpdate, onDelete, availableEquipos = [], copyElement, pasteElement, duplicateElement, clipboard }) => {
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
        <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto h-full flex flex-col">
            <h3 className="text-xl font-bold text-gray-800 mb-6 border-b pb-2">Editar {itemTypeDisplay[selectedItem.type]}</h3>
            <div className="space-y-4 flex-1">
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
            <div className="mt-auto pt-4 border-t space-y-3">
                <div className="grid grid-cols-2 gap-2">
                <button 
                        onClick={() => copyElement(selectedItem.id)}
                        className="bg-blue-500 text-white font-bold py-2 px-3 rounded-md hover:bg-blue-600 transition-all duration-200 hover:scale-105 flex items-center justify-center gap-1"
                        title="Copiar elemento (Ctrl+C)"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                        Copiar
                    </button>
                    <button 
                        onClick={pasteElement}
                        disabled={!clipboard}
                        className={`font-bold py-2 px-3 rounded-md transition-all duration-200 hover:scale-105 flex items-center justify-center gap-1 ${
                            clipboard 
                                ? 'bg-green-500 text-white hover:bg-green-600' 
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                        title="Pegar elemento (Ctrl+V)"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                            <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                        </svg>
                        Pegar
                </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <button 
                        onClick={() => duplicateElement(selectedItem.id)}
                        className="bg-purple-500 text-white font-bold py-2 px-3 rounded-md hover:bg-purple-600 transition-all duration-200 hover:scale-105 flex items-center justify-center gap-1"
                        title="Duplicar elemento (Ctrl+D o F5)"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            <path d="M9 9h6v6"></path>
                        </svg>
                        Duplicar
                    </button>
                    <button 
                        onClick={() => onDelete(selectedItem.id)} 
                        className="bg-red-500 text-white font-bold py-2 px-3 rounded-md hover:bg-red-600 transition-all duration-200 hover:scale-105 flex items-center justify-center gap-1"
                        title="Eliminar elemento"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3,6 5,6 21,6"></polyline>
                            <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
                        </svg>
                        Eliminar
                    </button>
                </div>
            </div>
        </div>
    );
};


// === MAIN COMPONENT ===
const Map2D = ({ onEquipoSelect, onEquipoDoubleClick, selectedEquipo }) => {
    const [floors, setFloors] = useState([]);
    const [activeFloorId, setActiveFloorId] = useState(null);
    const [selectedId, setSelectedId] = useState(null);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
    const [isSpacePressed, setIsSpacePressed] = useState(false);
    const [isSpacePanning, setIsSpacePanning] = useState(false);
    const [availableStatuses, setAvailableStatuses] = useState([]);
    const [equipos, setEquipos] = useState([]);
    const [showLayersPanel, setShowLayersPanel] = useState(false);
    const [itemZIndex, setItemZIndex] = useState({}); // z-index individual por item
    const [draggedItem, setDraggedItem] = useState(null);
    const [dragOverItem, setDragOverItem] = useState(null);
    const [layers, setLayers] = useState({});
    const [selectedLayer, setSelectedLayer] = useState(null);
    const [clipboard, setClipboard] = useState(null);
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
            console.log('Cargando elementos para piso:', floorId, 'empresa:', activeCompany?.id);
            
            // Cargar elementos filtrados por piso y empresa
            const { data: mapItems, error } = await supabase
                .from('map_items')
                .select('*')
                .eq('floor_id', floorId)
                .eq('company_id', activeCompany?.id);

            if (error) {
                console.error('Error loading map items:', error);
                return [];
            }

            console.log(`Elementos encontrados en BD para piso ${floorId}:`, mapItems?.length || 0);
            if (mapItems && mapItems.length > 0) {
                console.log('Elementos cargados:', mapItems.map(item => ({ id: item.id, name: item.name, type: item.item_type })));
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
    }, [activeCompany?.id]);

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
                console.log('Cargando datos iniciales para empresa:', activeCompany?.id);
                // First, check if we have any floors
                const { data: existingFloors, error: floorsError } = await supabase
                    .from('map_floors')
                    .select('*')
                    .eq('company_id', activeCompany?.id)
                    .order('created_at', { ascending: true });

                if (floorsError) {
                    console.error('Error loading floors:', floorsError);
                    return;
                }
                
                console.log(`Pisos encontrados para empresa ${activeCompany?.id}:`, existingFloors?.length || 0);

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

    // Funciones para gestionar capas
    const handleLayerUpdate = useCallback((layerId, updates) => {
        setLayers(prev => ({
            ...prev,
            [layerId]: { ...prev[layerId], ...updates }
        }));
    }, []);

    const handleLayerReorder = useCallback((layerId, direction, targetLayerId = null) => {
        setLayers(prev => {
            const layerEntries = Object.entries(prev);
            const currentIndex = layerEntries.findIndex(([id]) => id === layerId);
            
            if (currentIndex === -1) return prev;
            
            let newIndex;
            if (direction === 'up') {
                newIndex = Math.max(0, currentIndex - 1);
            } else if (direction === 'down') {
                newIndex = Math.min(layerEntries.length - 1, currentIndex + 1);
            } else if (direction === 'move' && targetLayerId) {
                const targetIndex = layerEntries.findIndex(([id]) => id === targetLayerId);
                newIndex = targetIndex;
            } else {
                return prev;
            }
            
            // Reordenar array
            const newEntries = [...layerEntries];
            const [movedLayer] = newEntries.splice(currentIndex, 1);
            newEntries.splice(newIndex, 0, movedLayer);
            
            // Actualizar z-index
            const updatedEntries = newEntries.map(([id, layer], index) => [
                id, 
                { ...layer, zIndex: index }
            ]);
            
            return Object.fromEntries(updatedEntries);
        });
    }, []);

    const handleLayerSelect = useCallback((layerId) => {
        setSelectedLayer(layerId);
    }, []);

    const handleLayerDelete = useCallback((layerId) => {
        if (layerId.startsWith('custom-')) {
            setLayers(prev => {
                const newLayers = { ...prev };
                delete newLayers[layerId];
                return newLayers;
            });
        }
    }, []);

    const handleLayerCreate = useCallback(() => {
        const newLayerId = `custom-${Date.now()}`;
        const maxZIndex = Math.max(...Object.values(layers).map(layer => layer.zIndex));
        
        setLayers(prev => ({
            ...prev,
            [newLayerId]: {
                visible: true,
                locked: false,
                opacity: 1,
                zIndex: maxZIndex + 1,
                name: 'Nueva Capa',
                elementCount: 0,
                lastModified: new Date().toLocaleString(),
                type: 'custom'
            }
        }));
    }, [layers]);

    // Función para manejar doble click en capas - localizar elemento en canvas
    const handleLayerDoubleClick = useCallback((layerId, layer) => {
        // Solo funciona para capas de elementos (no capas personalizadas)
        if (!layerId.startsWith('item_')) return;
        
        // Extraer el ID del elemento del ID de la capa
        const itemId = layerId.replace('item_', '');
        
        // Buscar el elemento en el piso activo
        const activeFloor = floors.find(f => f.id === activeFloorId);
        const item = activeFloor?.items.find(i => i.id === itemId);
        
        if (!item) {
            console.warn(`Elemento ${itemId} no encontrado en el piso activo`);
            return;
        }
        
        // Seleccionar el elemento
        setSelectedId(itemId);
        
        // Calcular el centro del elemento
        const centerX = item.x + item.width / 2;
        const centerY = item.y + item.height / 2;
        
        // Obtener dimensiones del canvas container
        const canvasContainer = document.getElementById('canvas-container');
        if (!canvasContainer) return;
        
        const containerRect = canvasContainer.getBoundingClientRect();
        const containerCenterX = containerRect.width / 2;
        const containerCenterY = containerRect.height / 2;
        
        // Calcular nueva posición del transform para centrar el elemento
        const newTransformX = containerCenterX - (centerX * transform.scale);
        const newTransformY = containerCenterY - (centerY * transform.scale);
        
        // Aplicar la nueva transformación con animación suave
        setTransform(prev => ({
            ...prev,
            x: newTransformX,
            y: newTransformY
        }));
        
        // Mostrar feedback visual temporal
        console.log(`Localizando elemento: ${item.name} en posición (${item.x}, ${item.y})`);
        
    }, [floors, activeFloorId, transform.scale]);

    // Función para calcular la posición central visible del canvas
    const getVisibleCenterPosition = useCallback(() => {
        const canvasContainer = document.getElementById('canvas-container');
        if (!canvasContainer) {
            // Fallback a posición por defecto si no se puede obtener el canvas
            return { x: 100, y: 100 };
        }
        
        const containerRect = canvasContainer.getBoundingClientRect();
        const containerCenterX = containerRect.width / 2;
        const containerCenterY = containerRect.height / 2;
        
        // Convertir la posición del centro del contenedor a coordenadas del canvas
        // Teniendo en cuenta el transform actual (escala y traslación)
        const canvasCenterX = (containerCenterX - transform.x) / transform.scale;
        const canvasCenterY = (containerCenterY - transform.y) / transform.scale;
        
        return {
            x: Math.max(0, canvasCenterX), // Asegurar que no sea negativo
            y: Math.max(0, canvasCenterY)  // Asegurar que no sea negativo
        };
    }, [transform]);

    // Función para obtener el z-index final de un elemento (optimizada con memoización)
    const getFinalZIndex = useCallback((itemId, itemType) => {
        const baseLayer = LAYERS[itemType.toUpperCase()] || LAYERS.AREAS;
        const itemLayerId = `item_${itemId}`;
        const layerZIndex = layers[itemLayerId]?.zIndex || 0;
        const customZIndex = itemZIndex[itemId] || 0;
        
        // Asegurar que todos los valores sean números
        const base = Number(baseLayer) || 0;
        const layer = Number(layerZIndex) || 0;
        const custom = Number(customZIndex) || 0;
        
        return base + layer + custom;
    }, [itemZIndex, layers]);
    
    // Memoizar z-indexes para evitar recálculos innecesarios
    const memoizedZIndexes = useMemo(() => {
        const zIndexes = {};
        const currentFloor = floors.find(f => f.id === activeFloorId);
        if (currentFloor) {
            currentFloor.items.forEach(item => {
                zIndexes[item.id] = getFinalZIndex(item.id, item.type);
            });
        }
        return zIndexes;
    }, [floors, activeFloorId, getFinalZIndex]);
    
    // Viewport culling simple - solo renderizar elementos visibles
    const visibleItems = useMemo(() => {
        const currentFloor = floors.find(f => f.id === activeFloorId);
        if (!currentFloor) return [];
        
        // Obtener dimensiones del viewport del mapa
        const mapWidth = 1200; // Ajustar según el tamaño real del mapa
        const mapHeight = 800;  // Ajustar según el tamaño real del mapa
        const margin = 200; // Margen para elementos parcialmente visibles
        
        const filteredItems = currentFloor.items.filter(item => {
            const itemRight = item.x + item.width;
            const itemBottom = item.y + item.height;
            
            // Verificar si el elemento está dentro del viewport con margen
            const isInViewport = item.x < mapWidth + margin && 
                   itemRight > -margin && 
                   item.y < mapHeight + margin && 
                   itemBottom > -margin;
            
            // Debug: Log elementos que están fuera del viewport
            if (!isInViewport) {
                console.log(`Elemento fuera del viewport:`, {
                    id: item.id,
                    name: item.name,
                    x: item.x,
                    y: item.y,
                    width: item.width,
                    height: item.height,
                    itemRight,
                    itemBottom,
                    mapWidth,
                    mapHeight
                });
            }
            
            return isInViewport;
        });
        
        // Debug: Comparar total vs filtrado
        if (currentFloor.items.length !== filteredItems.length) {
            console.log(`Viewport culling: ${currentFloor.items.length} elementos total, ${filteredItems.length} visibles`);
        }
        
        return filteredItems;
    }, [floors, activeFloorId]);

    // Función para verificar si una capa está visible
    const isLayerVisible = useCallback((layerType, itemId = null) => {
        if (itemId) {
            const itemLayerId = `item_${itemId}`;
            const isVisible = layers[itemLayerId]?.visible !== false;
            
            // Debug: Log capas ocultas
            if (!isVisible) {
                console.log(`Capa oculta detectada:`, {
                    itemId,
                    layerId: itemLayerId,
                    layerData: layers[itemLayerId]
                });
            }
            
            return isVisible;
        }
        return true;
    }, [layers]);

    // Función para obtener la opacidad de una capa
    const getLayerOpacity = useCallback((layerType, itemId = null) => {
        if (itemId) {
            const itemLayerId = `item_${itemId}`;
            const opacity = layers[itemLayerId]?.opacity || 1;
            return opacity;
        }
        return 1;
    }, [layers]);

    // Función para verificar si un elemento está bloqueado según su capa
    const isLayerLocked = useCallback((layerType, itemId = null) => {
        if (itemId) {
            const itemLayerId = `item_${itemId}`;
            return layers[itemLayerId]?.locked || false;
        }
        return false;
    }, [layers]);

    // Función para copiar elemento
    const copyElement = useCallback((itemId) => {
        const currentFloor = floors.find(f => f.id === activeFloorId);
        if (currentFloor && currentFloor.items) {
            const item = currentFloor.items.find(i => i.id === itemId);
            if (item) {
                setClipboard({
                    ...item,
                    id: `temp_${Date.now()}`, // ID temporal para evitar conflictos
                    x: item.x + 20, // Offset para que no se superponga
                    y: item.y + 20
                });
                console.log('Elemento copiado:', item.name);
            }
        }
    }, [floors, activeFloorId]);

    // Función para pegar elemento
    const pasteElement = useCallback(async () => {
        if (!clipboard) return;
        
        console.log('=== INICIANDO PEGADO DE ELEMENTO ===');
        console.log('activeCompany:', activeCompany);
        console.log('activeFloorId:', activeFloorId);
        
        if (!activeCompany?.id) {
            console.error('ERROR: No hay empresa activa para pegar');
            alert('Error: No hay empresa activa. Por favor, selecciona una empresa.');
            return;
        }
        
        if (!activeFloorId) {
            console.error('ERROR: No hay piso activo para pegar');
            alert('Error: No hay piso activo. Por favor, crea o selecciona un piso.');
            return;
        }
        
        const currentFloor = floors.find(f => f.id === activeFloorId);
        if (currentFloor) {
            try {
                // Si hay selección múltiple, pegar todos los elementos seleccionados
                if (selectedIds.size > 1) {
                    const selectedItems = currentFloor.items.filter(item => selectedIds.has(item.id));
                    const newItems = selectedItems.map((item, index) => ({
                        ...item,
                        id: `item_${Date.now()}_${index}`,
                        name: `${item.name} (Copia)`,
                        x: item.x + 20 + (index * 10), // Offset para evitar superposición
                        y: item.y + 20 + (index * 10)
                    }));
                    
                    // Guardar todos los elementos en la base de datos
                    console.log(`Guardando ${newItems.length} elementos pegados en BD...`);
                    const insertPromises = newItems.map(async (item) => {
                        const { error } = await supabase
                            .from('map_items')
                            .insert({
                                id: item.id,
                                floor_id: activeFloorId,
                                company_id: activeCompany.id,
                                item_type: item.type,
                                name: item.name,
                                x: item.x,
                                y: item.y,
                                width: item.width,
                                height: item.height,
                                background_color: item.backgroundColor,
                                border_color: item.borderColor,
                                text_color: item.textColor,
                                is_locked: item.locked,
                                is_empty: item.isEmpty || false,
                                asset_tag: item.assetTag,
                                status: item.status,
                                icon: item.icon
                            });
                        
                        if (error) {
                            console.error(`Error guardando elemento ${item.id}:`, error);
                            throw error;
                        }
                        return item;
                    });
                    
                    await Promise.all(insertPromises);
                    
                    setFloors(prev => prev.map(f => 
                        f.id === activeFloorId 
                            ? { ...f, items: [...(f.items || []), ...newItems] }
                            : f
                    ));
                    
                    // Seleccionar los nuevos elementos pegados
                    const newIds = new Set(newItems.map(item => item.id));
                    setSelectedIds(newIds);
                    setSelectedId(newItems[0].id);
                    
                    console.log(`✅ ${newItems.length} elementos pegados y guardados en BD`);
                } else {
                    // Pegado individual
                    const newItem = {
                        ...clipboard,
                        id: `item_${Date.now()}`,
                        name: `${clipboard.name} (Copia)`,
                        x: clipboard.x + 20,
                        y: clipboard.y + 20
                    };
                    
                    // Guardar elemento en la base de datos
                    console.log('Guardando elemento pegado en BD:', newItem);
                    const { error } = await supabase
                        .from('map_items')
                        .insert({
                            id: newItem.id,
                            floor_id: activeFloorId,
                            company_id: activeCompany.id,
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
                        console.error('Error guardando elemento pegado:', error);
                        alert(`Error al guardar elemento pegado: ${error.message}`);
                        return;
                    }
                    
                    setFloors(prev => prev.map(f => 
                        f.id === activeFloorId 
                            ? { ...f, items: [...(f.items || []), newItem] }
                            : f
                    ));
                    setSelectedId(newItem.id);
                    console.log('✅ Elemento pegado y guardado en BD:', newItem.name);
                }
                
                console.log('=== PEGADO DE ELEMENTO COMPLETADO ===');
            } catch (error) {
                console.error('❌ Error en pegado:', error);
                alert(`Error al pegar elemento: ${error.message}`);
            }
        }
    }, [clipboard, floors, activeFloorId, setFloors, selectedIds, activeCompany, supabase]);

    // Función para duplicar elemento
    const duplicateElement = useCallback(async (itemId) => {
        copyElement(itemId);
        // Pequeño delay para asegurar que el clipboard se actualice
        setTimeout(async () => {
            await pasteElement();
        }, 100);
    }, [copyElement, pasteElement]);

    // Función para manejar selección múltiple
    const handleMultiSelect = useCallback((itemId, ctrlKey) => {
        if (ctrlKey) {
            setSelectedIds(prev => {
                const newSet = new Set(prev);
                if (newSet.has(itemId)) {
                    newSet.delete(itemId);
                } else {
                    newSet.add(itemId);
                }
                return newSet;
            });
            setSelectedId(itemId); // Mantener el último seleccionado como principal
        } else {
            setSelectedIds(new Set([itemId]));
            setSelectedId(itemId);
        }
    }, []);

    // Función para limpiar selección múltiple
    const clearMultiSelect = useCallback(() => {
        setSelectedIds(new Set());
        setSelectedId(null);
    }, []);

    // Estado para almacenar las posiciones iniciales de los elementos seleccionados
    const [selectedItemsInitialPositions, setSelectedItemsInitialPositions] = useState(new Map());

    // Función para mover elementos seleccionados (optimizada para fluidez)
    const moveSelectedElements = useCallback((deltaX, deltaY) => {
        if (selectedIds.size === 0) return;
        
        setFloors(prev => {
            const currentFloor = prev.find(f => f.id === activeFloorId);
            if (!currentFloor) return prev;

            // Optimización: solo procesar elementos seleccionados
            const updatedItems = currentFloor.items.map(item => {
                if (selectedIds.has(item.id)) {
                    // Usar la posición inicial + delta para evitar acumulación de errores
                    const initialPos = selectedItemsInitialPositions.get(item.id);
                    if (initialPos) {
                        const newX = Math.max(0, initialPos.x + deltaX);
                        const newY = Math.max(0, initialPos.y + deltaY);
                        
                        // Solo crear nuevo objeto si la posición realmente cambió
                        if (item.x !== newX || item.y !== newY) {
                            return { ...item, x: newX, y: newY };
                        }
                        return item;
                    } else {
                        // Fallback: usar posición actual (sin delta para evitar problemas)
                        console.warn(`Posición inicial no encontrada para elemento ${item.id}, usando posición actual`);
                        return item;
                    }
                }
                return item; // No cambiar elementos no seleccionados
            });

            // Solo actualizar si realmente hay cambios
            const hasChanges = updatedItems.some((item, index) => item !== currentFloor.items[index]);
            if (!hasChanges) return prev;

            return prev.map(f => 
                f.id === activeFloorId 
                    ? { ...f, items: updatedItems }
                    : f
            );
        });
    }, [selectedIds, activeFloorId, selectedItemsInitialPositions]);

    // Función para eliminar elementos seleccionados
    const deleteSelectedElements = useCallback(async () => {
        if (selectedIds.size === 0) return;
        
        const currentFloor = floors.find(f => f.id === activeFloorId);
        if (!currentFloor) return;

        const idsToDelete = Array.from(selectedIds);
        console.log('Eliminando elementos seleccionados de BD:', idsToDelete);

        try {
            // Eliminar de la base de datos
            const { error } = await supabase
                .from('map_items')
                .delete()
                .in('id', idsToDelete)
                .eq('company_id', activeCompany?.id);

            if (error) {
                console.error('Error deleting selected items from database:', error);
            } else {
                console.log('Elementos seleccionados eliminados exitosamente de BD:', idsToDelete);
            }
        } catch (error) {
            console.error('Error deleting selected items:', error);
        }

        // Eliminar del estado local
        const updatedItems = currentFloor.items.filter(item => !selectedIds.has(item.id));
        
        setFloors(prev => prev.map(f => 
            f.id === activeFloorId 
                ? { ...f, items: updatedItems }
                : f
        ));
        
        // Eliminar las capas correspondientes
        setLayers(prev => {
            const newLayers = { ...prev };
            idsToDelete.forEach(id => {
                const itemLayerId = `item_${id}`;
                delete newLayers[itemLayerId];
            });
            return newLayers;
        });
        
        clearMultiSelect();
    }, [selectedIds, floors, activeFloorId, setFloors, clearMultiSelect, activeCompany?.id]);

    // Crear capas individuales para cada elemento
    const updateLayersForItems = useCallback(() => {
        const currentFloor = floors.find(f => f.id === activeFloorId);
        if (currentFloor && currentFloor.items) {
            setLayers(prevLayers => {
                const newLayers = { ...prevLayers };
                
                // Crear capas para elementos existentes
                currentFloor.items.forEach(item => {
                    const layerId = `item_${item.id}`;
                    if (!newLayers[layerId]) {
                        newLayers[layerId] = {
                            visible: true,
                            locked: false,
                            opacity: 1,
                            zIndex: 5 + item.id,
                            lastModified: new Date().toLocaleString(),
                            type: 'item',
                            itemId: item.id,
                            itemType: item.type,
                            itemName: item.name || `Elemento ${item.id}`
                        };
                    }
                });
                
                // Limpiar capas de elementos que ya no existen
                const itemIds = currentFloor.items.map(item => `item_${item.id}`);
                Object.keys(newLayers).forEach(layerId => {
                    if (layerId.startsWith('item_') && !itemIds.includes(layerId)) {
                        delete newLayers[layerId];
                    }
                });
                
                return newLayers;
            });
        }
    }, [floors, activeFloorId]);

    // Llamar a updateLayersForItems cuando cambien los elementos
    useEffect(() => {
        updateLayersForItems();
    }, [updateLayersForItems]);

    // Limpiar selección múltiple cuando cambie el piso activo
    useEffect(() => {
        clearMultiSelect();
    }, [activeFloorId, clearMultiSelect]);

    // Atajos de teclado
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Solo procesar atajos si no estamos en un input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            if (e.ctrlKey || e.metaKey) {
                switch (e.key.toLowerCase()) {
                    case 'c':
                        if (selectedId) {
                            e.preventDefault();
                            copyElement(selectedId);
                        }
                        break;
                    case 'v':
                        e.preventDefault();
                        pasteElement();
                        break;
                    case 'd':
                        if (selectedId) {
                            e.preventDefault();
                            duplicateElement(selectedId);
                        }
                        break;
                }
            }
            
            // Atajo para duplicar con F5
            if (e.key === 'F5') {
                e.preventDefault();
                if (selectedId) {
                    duplicateElement(selectedId);
                }
            }
            
            // Atajo para seleccionar todo
            if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                const currentFloor = floors.find(f => f.id === activeFloorId);
                if (currentFloor && currentFloor.items) {
                    const allIds = new Set(currentFloor.items.map(item => item.id));
                    setSelectedIds(allIds);
                    if (allIds.size > 0) {
                        setSelectedId(Array.from(allIds)[0]);
                    }
                }
            }
            
            // Atajo para eliminar elementos seleccionados
            if (e.key === 'Delete' || e.key === 'Backspace') {
                e.preventDefault();
                if (selectedIds.size > 0) {
                    deleteSelectedElements();
                }
            }
            
            // Tecla space para modo panning
            if (e.key === ' ' || e.code === 'Space') {
                e.preventDefault();
                if (!isSpacePressed) {
                    setIsSpacePressed(true);
                }
            }
        };

        const handleKeyUp = (e) => {
            // Soltar tecla space
            if (e.key === ' ' || e.code === 'Space') {
                e.preventDefault();
                setIsSpacePressed(false);
                setIsSpacePanning(false);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keyup', handleKeyUp);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('keyup', handleKeyUp);
        };
    }, [selectedId, selectedIds, copyElement, pasteElement, duplicateElement, deleteSelectedElements, floors, activeFloorId, isSpacePressed]);

    // Forzar re-render cuando cambien las capas (optimizado)
    useEffect(() => {
        // Solo forzar re-render si realmente hay cambios significativos en las capas
        const layerCount = Object.keys(layers).length;
        if (layerCount > 0) {
            setItemZIndex(prev => ({ ...prev }));
        }
    }, [Object.keys(layers).length]);

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
            console.log('=== INICIANDO CREACIÓN DE ELEMENTO ===');
            console.log('Tipo:', type);
            console.log('activeCompany:', activeCompany);
            console.log('activeFloorId:', activeFloorId);
            
            if (!activeCompany?.id) {
                console.error('ERROR: No hay empresa activa');
                alert('Error: No hay empresa activa. Por favor, selecciona una empresa.');
                return;
            }
            
            if (!activeFloorId) {
                console.error('ERROR: No hay piso activo');
                alert('Error: No hay piso activo. Por favor, crea o selecciona un piso.');
                return;
            }
            
            // Calcular posición central visible del canvas
            const centerPosition = getVisibleCenterPosition();
            
            const newItem = type === 'area'
                ? { 
                    id: `area-${Date.now()}`, 
                    type: 'area', 
                    name: 'Nueva Área', 
                    x: Math.round(centerPosition.x - 150), // Centrar el área (ancho 300 / 2)
                    y: Math.round(centerPosition.y - 100), // Centrar el área (alto 200 / 2)
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
                    x: Math.round(centerPosition.x - 50), // Centrar el equipo (ancho 100 / 2)
                    y: Math.round(centerPosition.y - 40), // Centrar el equipo (alto 80 / 2)
                    width: 100, 
                    height: 80, 
                    backgroundColor: '#FEF3C7', 
                    borderColor: '#F59E0B', 
                    textColor: '#92400E',
                    locked: false,
                    isEmpty: true // Marcar como equipo vacío
                };

            // Save to database
            console.log('Guardando elemento en BD:', {
                id: newItem.id,
                floor_id: activeFloorId,
                company_id: activeCompany?.id,
                type: newItem.type,
                name: newItem.name
            });
            
            // Guardar elemento en base de datos
            console.log('Ejecutando inserción en BD...');
            const insertResult = await supabase
                .from('map_items')
                .insert({
                    id: newItem.id,
                    floor_id: activeFloorId,
                    company_id: activeCompany?.id,
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

            console.log('Resultado completo de la inserción:', insertResult);

            if (insertResult.error) {
                console.error('Error saving item to database:', insertResult.error);
                alert(`Error al guardar en BD: ${insertResult.error.message}`);
                return;
            } else {
                console.log('✅ Elemento guardado exitosamente en BD:', newItem.id);
            }

            // Update local state
            updateActiveFloorItems(items => [...items, newItem]);
            
            // Seleccionar el elemento con un pequeño delay para asegurar que se renderice correctamente
            setTimeout(() => {
                setSelectedId(newItem.id);
            }, 50);
            
            // Crear la capa para el nuevo elemento si no existe
            const itemLayerId = `item_${newItem.id}`;
            setLayers(prev => {
                if (!prev[itemLayerId]) {
                    const maxZIndex = Math.max(...Object.values(prev).map(layer => layer.zIndex || 0));
                    return {
                        ...prev,
                        [itemLayerId]: {
                            visible: true,
                            locked: false,
                            opacity: 1,
                            zIndex: maxZIndex + 1,
                            itemName: newItem.name,
                            itemType: newItem.type,
                            itemId: newItem.id,
                            type: 'item'
                        }
                    };
                }
                return prev;
            });
            
            // Feedback visual en consola
            console.log(`✅ ${type === 'area' ? 'Área' : 'Equipo'} "${newItem.name}" creado completamente`);
            console.log('=== CREACIÓN DE ELEMENTO COMPLETADA ===');
        } catch (error) {
            console.error('❌ Error adding item:', error);
            alert(`Error al crear elemento: ${error.message}`);
        }
    };

    // Debouncing para actualizaciones de BD
    const updateTimeouts = useRef({});

    const handleUpdateItem = useCallback(async (id, updatedData) => {
        // Update local state immediately
        updateActiveFloorItems(items => items.map(item => item.id === id ? { ...item, ...updatedData } : item));
        
        // Clear existing timeout for this item
        if (updateTimeouts.current[id]) {
            clearTimeout(updateTimeouts.current[id]);
        }
        
        // Set new timeout for database update (300ms debounce)
        updateTimeouts.current[id] = setTimeout(async () => {
        try {
            const dbUpdateData = {};
            
            // Map the updated data to database fields (rounding numeric values to integers)
            if (updatedData.x !== undefined) dbUpdateData.x = Math.round(updatedData.x);
            if (updatedData.y !== undefined) dbUpdateData.y = Math.round(updatedData.y);
            if (updatedData.width !== undefined) dbUpdateData.width = Math.round(updatedData.width);
            if (updatedData.height !== undefined) dbUpdateData.height = Math.round(updatedData.height);
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
        }, 300); // 300ms debounce
    }, [updateActiveFloorItems]);

    
    const handleDeleteItem = async (id) => {
        try {
            console.log('Eliminando elemento de BD:', { id, company_id: activeCompany?.id });
            
            // Eliminar de la base de datos con filtro por empresa
            const { error } = await supabase
                .from('map_items')
                .delete()
                .eq('id', id)
                .eq('company_id', activeCompany?.id);
            
            if (error) {
                console.error('Error deleting item from database:', error);
            } else {
                console.log('Elemento eliminado exitosamente de BD:', id);
            }
            
            // Eliminar del estado local
            updateActiveFloorItems(items => items.filter(item => item.id !== id));
            setSelectedId(null);
            
            // Eliminar la capa correspondiente
            const itemLayerId = `item_${id}`;
            setLayers(prev => {
                const newLayers = { ...prev };
                delete newLayers[itemLayerId];
                return newLayers;
            });
            
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
        // Solo mostrar información de equipo si es un equipo, no un área
        if (onEquipoDoubleClick && item.originalData && item.type === 'equipment') {
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
        
        // Si space está presionado, activar panning con cualquier botón del mouse
        if (isSpacePressed) {
            e.preventDefault();
            setIsSpacePanning(true);
            isPanning.current = true;
            lastMousePos.current = { x: e.clientX, y: e.clientY };
        } else if (e.buttons === 1) { // Left click normal (sin space)
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

    const handleMouseUpCanvas = () => {
        isPanning.current = false;
        setIsSpacePanning(false);
    };

    const activeFloor = floors.find(f => f.id === activeFloorId);
    // TEMPORAL: Deshabilitar viewport culling para debug
    const itemsToRender = activeFloor ? activeFloor.items : []; // visibleItems; // Usar elementos visibles para mejor rendimiento
    const selectedItem = itemsToRender.find(item => item.id === selectedId);
    
    // Debug: Log de elementos a renderizar
    React.useEffect(() => {
        if (activeFloor && activeFloor.items.length > 0) {
            console.log(`Renderizado - Piso activo: ${activeFloorId}`);
            console.log(`Total elementos en piso: ${activeFloor.items.length}`);
            console.log(`Elementos a renderizar: ${itemsToRender.length}`);
            console.log('Elementos en piso:', activeFloor.items.map(item => ({
                id: item.id,
                name: item.name,
                x: item.x,
                y: item.y,
                width: item.width,
                height: item.height
            })));
            console.log('Elementos a renderizar:', itemsToRender.map(item => ({
                id: item.id,
                name: item.name
            })));
        }
    }, [activeFloorId, activeFloor, itemsToRender]);

  return (
        <div className="h-[800px] w-full bg-gray-100 flex flex-col font-sans select-none rounded-lg border">
            <header className="bg-white border-b p-3 shadow-sm flex items-center justify-between z-20">
                <div className="flex items-center gap-4">
                <h1 className="text-xl font-bold">Plano de Activos</h1>
                    {clipboard && (
                        <div className="flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium animate-pulse">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                            {clipboard.name} listo para pegar
                        </div>
                    )}
                    {selectedIds.size > 1 && (
                        <div className="flex items-center gap-2 bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-medium">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 11H5a2 2 0 0 0-2 2v3c0 1.1.9 2 2 2h4m0-7h10a2 2 0 0 1 2 2v3c0 1.1-.9 2-2 2h-4m0-7v7m0-7l-3-3m3 3l3-3"/>
                            </svg>
                            {selectedIds.size} elementos seleccionados
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {selectedIds.size > 0 && (
                        <>
                            <button 
                                onClick={clearMultiSelect}
                                className="bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg shadow hover:bg-gray-600 transition-all duration-200 hover:scale-105"
                                title="Deseleccionar todo"
                            >
                                Deseleccionar
                            </button>
                            <button 
                                onClick={deleteSelectedElements}
                                className="bg-red-500 text-white font-semibold py-2 px-4 rounded-lg shadow hover:bg-red-600 transition-all duration-200 hover:scale-105"
                                title="Eliminar elementos seleccionados (Delete)"
                            >
                                Eliminar ({selectedIds.size})
                            </button>
                        </>
                    )}
                    <button onClick={() => handleAddItem('area')} className="bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg shadow hover:bg-blue-600 transition-all duration-200 hover:scale-105">Añadir Área</button>
                    <button onClick={() => handleAddItem('equipment')} className="bg-green-500 text-white font-semibold py-2 px-4 rounded-lg shadow hover:bg-green-600 transition-all duration-200 hover:scale-105">Añadir Equipo</button>
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
                    style={{ 
                        backgroundImage: 'radial-gradient(#d1d5db 1px, transparent 1px)', 
                        backgroundSize: '20px 20px',
                        cursor: isSpacePressed ? (isSpacePanning ? 'grabbing' : 'grab') : 'default'
                    }}>
                    
                    <div id="canvas-content" className="absolute top-0 left-0"
                         style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`, transformOrigin: 'top left' }}>
                        
                        {itemsToRender.map(item => (
                             <DraggableResizableItem 
                                key={item.id} 
                                data={item} 
                                onUpdate={handleUpdateItem} 
                                onSelect={handleSelect} 
                                onDoubleClick={handleDoubleClick} 
                                isSelected={selectedId === item.id} 
                                isMultiSelected={selectedIds.has(item.id) && selectedIds.size > 1}
                                scale={transform.scale} 
                                getFinalZIndex={getFinalZIndex}
                                isLayerVisible={isLayerVisible}
                                getLayerOpacity={getLayerOpacity}
                                isLayerLocked={isLayerLocked}
                                onMultiSelect={handleMultiSelect}
                                onMoveSelectedElements={moveSelectedElements}
                                selectedIds={selectedIds}
                                floors={floors}
                                activeFloorId={activeFloorId}
                                setSelectedItemsInitialPositions={setSelectedItemsInitialPositions}
                                isSpacePressed={isSpacePressed}
                            >
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
                        <LayerManager
                            layers={layers}
                            onLayerUpdate={handleLayerUpdate}
                            onLayerReorder={handleLayerReorder}
                            onLayerSelect={handleLayerSelect}
                            onLayerDelete={handleLayerDelete}
                            onLayerCreate={handleLayerCreate}
                            onLayerDoubleClick={handleLayerDoubleClick}
                            selectedLayer={selectedLayer}
                        />
                        ) : (
                            <PropertiesPanel 
                                selectedItem={selectedItem} 
                                onUpdate={handleUpdateItem} 
                                onDelete={handleDeleteItem} 
                                availableEquipos={equipos}
                                copyElement={copyElement}
                                pasteElement={pasteElement}
                                duplicateElement={duplicateElement}
                                clipboard={clipboard}
                            />
                        )}
                    </div>
          </div>
            </main>
    </div>
  );
};

export default Map2D;
