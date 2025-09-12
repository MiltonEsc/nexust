import React, { memo, useMemo, useCallback } from 'react';
import { 
  ComputerDesktopIcon, 
  CommandLineIcon, 
  CubeIcon, 
  ArchiveBoxIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

// Componente memoizado para cada item de la lista
const InventoryItem = memo(({ item, onView, onEdit, onDelete, onSelect, isSelected }) => {
  const getItemIcon = (type) => {
    switch (type) {
      case 'equipos':
        return ComputerDesktopIcon;
      case 'software':
        return CommandLineIcon;
      case 'perifericos':
        return CubeIcon;
      case 'consumibles':
        return ArchiveBoxIcon;
      default:
        return ComputerDesktopIcon;
    }
  };

  const getStatusColor = (estado) => {
    switch (estado) {
      case 'Bueno':
        return 'bg-green-100 text-green-800';
      case 'Regular':
        return 'bg-yellow-100 text-yellow-800';
      case 'Malo':
        return 'bg-red-100 text-red-800';
      case 'En reparación':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const IconComponent = getItemIcon(item.type || 'equipos');

  return (
    <div 
      className={`bg-white rounded-lg border p-4 hover:shadow-md transition-shadow cursor-pointer mb-2 ${
        isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
      }`}
      onClick={() => onSelect?.(item)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <IconComponent className="h-6 w-6 text-gray-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-900 truncate">
              {item.nombre || `${item.marca} ${item.modelo}`}
            </h3>
            <p className="text-sm text-gray-500 truncate">
              {item.tipo || item.marca} • {item.modelo}
            </p>
            {item.estado && (
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${getStatusColor(item.estado)}`}>
                {item.estado}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onView?.(item);
            }}
            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
            title="Ver detalles"
          >
            <EyeIcon className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.(item);
            }}
            className="p-1 text-gray-400 hover:text-green-600 transition-colors"
            title="Editar"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.(item);
            }}
            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
            title="Eliminar"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
});

InventoryItem.displayName = 'InventoryItem';

// Componente principal de lista optimizada
const SimpleInventoryList = memo(({
  items = [],
  onView,
  onEdit,
  onDelete,
  onSelect,
  selectedItems = [],
  loading = false,
  error = null,
  emptyMessage = "No hay elementos para mostrar"
}) => {
  // Memoizar los items seleccionados para evitar re-renders
  const selectedItemsSet = useMemo(() => new Set(selectedItems), [selectedItems]);

  // Callback memoizado para el render de items
  const renderItem = useCallback((item, index) => (
    <InventoryItem
      key={item.id || index}
      item={item}
      onView={onView}
      onEdit={onEdit}
      onDelete={onDelete}
      onSelect={onSelect}
      isSelected={selectedItemsSet.has(item.id)}
    />
  ), [onView, onEdit, onDelete, onSelect, selectedItemsSet]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Cargando inventario...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-600">
        <div className="text-center">
          <p className="font-medium">Error al cargar el inventario</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="text-center">
          <ArchiveBoxIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p className="font-medium">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {items.map((item, index) => renderItem(item, index))}
    </div>
  );
});

SimpleInventoryList.displayName = 'SimpleInventoryList';

export default SimpleInventoryList;
