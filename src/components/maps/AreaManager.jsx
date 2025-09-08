import React, { useState } from 'react';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  UserIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

const AreaManager = ({ 
  areas, 
  onAreasChange, 
  equipos, 
  onEditArea, 
  onDeleteArea 
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingArea, setEditingArea] = useState(null);

  // Colores predefinidos para las áreas
  const predefinedColors = [
    { name: 'Azul', value: '#3B82F6', bg: '#DBEAFE', border: '#3B82F6' },
    { name: 'Verde', value: '#10B981', bg: '#D1FAE5', border: '#10B981' },
    { name: 'Amarillo', value: '#F59E0B', bg: '#FEF3C7', border: '#F59E0B' },
    { name: 'Rojo', value: '#EF4444', bg: '#FEE2E2', border: '#EF4444' },
    { name: 'Púrpura', value: '#8B5CF6', bg: '#F3E8FF', border: '#8B5CF6' },
    { name: 'Rosa', value: '#EC4899', bg: '#FCE7F3', border: '#EC4899' },
    { name: 'Indigo', value: '#6366F1', bg: '#E0E7FF', border: '#6366F1' },
    { name: 'Cian', value: '#06B6D4', bg: '#CFFAFE', border: '#06B6D4' }
  ];

  // Calcular equipos por área y alertas de sobrepoblación
  const getAreaStats = (area) => {
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

    const isOvercrowded = area.capacity && equiposEnArea > area.capacity;
    const capacityPercentage = area.capacity ? (equiposEnArea / area.capacity) * 100 : 0;

    return {
      equiposCount: equiposEnArea,
      isOvercrowded,
      capacityPercentage: Math.round(capacityPercentage)
    };
  };

  const handleCreateArea = () => {
    const newArea = {
      id: `area_${Date.now()}`,
      name: 'Nueva Área',
      x: 100,
      y: 100,
      width: 200,
      height: 150,
      color: '#3B82F6',
      bgColor: '#DBEAFE',
      borderColor: '#3B82F6',
      capacity: null,
      responsible: '',
      isCustom: true
    };
    
    onAreasChange([...areas, newArea]);
    setShowCreateForm(false);
  };

  const handleEditArea = (area) => {
    setEditingArea(area);
    onEditArea(area);
  };

  const handleDeleteArea = (areaId) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta área?')) {
      onDeleteArea(areaId);
    }
  };

  const handleUpdateArea = (updatedArea) => {
    const newAreas = areas.map(area => 
      area.id === updatedArea.id ? updatedArea : area
    );
    onAreasChange(newAreas);
    setEditingArea(null);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <UserIcon className="h-5 w-5 text-blue-600" />
          Gestión de Áreas
        </h3>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          Crear Área
        </button>
      </div>

      {/* Lista de áreas */}
      <div className="space-y-4">
        {areas.map((area) => {
          const stats = getAreaStats(area);
          return (
            <div
              key={area.id}
              className={`p-4 rounded-lg border-2 transition-all ${
                stats.isOvercrowded 
                  ? 'border-red-300 bg-red-50' 
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className="w-4 h-4 rounded-full border-2"
                      style={{ 
                        backgroundColor: area.bgColor,
                        borderColor: area.borderColor
                      }}
                    />
                    <h4 className="font-medium text-gray-900">{area.name}</h4>
                    {stats.isOvercrowded && (
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                  
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>Posición: ({area.x}, {area.y})</div>
                    <div>Tamaño: {area.width} × {area.height}</div>
                    <div>Equipos: {stats.equiposCount}</div>
                    
                    {area.capacity && (
                      <div className="flex items-center gap-2">
                        <span>Capacidad: {area.capacity}</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              stats.isOvercrowded ? 'bg-red-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${Math.min(stats.capacityPercentage, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs">{stats.capacityPercentage}%</span>
                      </div>
                    )}
                    
                    {area.responsible && (
                      <div className="flex items-center gap-1">
                        <UserIcon className="h-4 w-4 text-gray-400" />
                        <span>Responsable: {area.responsible}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleEditArea(area)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                    title="Editar área"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteArea(area.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    title="Eliminar área"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {stats.isOvercrowded && (
                <div className="mt-3 p-2 bg-red-100 border border-red-200 rounded-md">
                  <div className="flex items-center gap-2 text-red-700 text-sm">
                    <ExclamationTriangleIcon className="h-4 w-4" />
                    <span>¡Área sobrepoblada! Excede la capacidad máxima.</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Formulario de creación rápida */}
      {showCreateForm && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-4">
              Se creará un área básica que podrás personalizar después
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={handleCreateArea}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Crear Área
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de edición */}
      {editingArea && (
        <AreaEditModal
          area={editingArea}
          onSave={handleUpdateArea}
          onCancel={() => setEditingArea(null)}
          predefinedColors={predefinedColors}
        />
      )}
    </div>
  );
};

// Modal para editar áreas
const AreaEditModal = ({ area, onSave, onCancel, predefinedColors }) => {
  const [formData, setFormData] = useState({
    name: area.name,
    x: area.x,
    y: area.y,
    width: area.width,
    height: area.height,
    color: area.color,
    bgColor: area.bgColor,
    borderColor: area.borderColor,
    capacity: area.capacity || '',
    responsible: area.responsible || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...area,
      ...formData,
      capacity: formData.capacity ? parseInt(formData.capacity) : null
    });
  };

  const handleColorChange = (color) => {
    setFormData({
      ...formData,
      color: color.value,
      bgColor: color.bg,
      borderColor: color.border
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Editar Área: {area.name}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nombre */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre del Área
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Posición y tamaño */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Posición X
                </label>
                <input
                  type="number"
                  value={formData.x}
                  onChange={(e) => setFormData({ ...formData, x: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Posición Y
                </label>
                <input
                  type="number"
                  value={formData.y}
                  onChange={(e) => setFormData({ ...formData, y: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ancho
                </label>
                <input
                  type="number"
                  value={formData.width}
                  onChange={(e) => setFormData({ ...formData, width: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Alto
                </label>
                <input
                  type="number"
                  value={formData.height}
                  onChange={(e) => setFormData({ ...formData, height: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="50"
                />
              </div>
            </div>

            {/* Color */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Color del Área
              </label>
              <div className="grid grid-cols-4 gap-2">
                {predefinedColors.map((color) => (
                  <button
                    key={color.name}
                    type="button"
                    onClick={() => handleColorChange(color)}
                    className={`p-2 rounded-md border-2 transition-all ${
                      formData.color === color.value
                        ? 'border-gray-400 ring-2 ring-blue-500'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    title={color.name}
                  >
                    <div
                      className="w-6 h-6 rounded"
                      style={{ backgroundColor: color.bg }}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Capacidad */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Capacidad Máxima (opcional)
              </label>
              <input
                type="number"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Sin límite"
                min="1"
              />
            </div>

            {/* Responsable */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Responsable (opcional)
              </label>
              <input
                type="text"
                value={formData.responsible}
                onChange={(e) => setFormData({ ...formData, responsible: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nombre del responsable"
              />
            </div>

            {/* Botones */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Guardar Cambios
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AreaManager;
