import React, { useState } from 'react';
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

const AreaConfigModal = ({ isOpen, onClose, areas, onSave }) => {
  const [localAreas, setLocalAreas] = useState(areas || []);
  const [editingArea, setEditingArea] = useState(null);

  const handleAddArea = () => {
    const newArea = {
      id: `area_${Date.now()}`,
      name: 'Nueva Área',
      x: 100,
      y: 100,
      width: 150,
      height: 100,
      color: '#E5E7EB',
      borderColor: '#9CA3AF'
    };
    setLocalAreas([...localAreas, newArea]);
    setEditingArea(newArea.id);
  };

  const handleUpdateArea = (areaId, field, value) => {
    setLocalAreas(prev => 
      prev.map(area => 
        area.id === areaId 
          ? { ...area, [field]: value }
          : area
      )
    );
  };

  const handleDeleteArea = (areaId) => {
    setLocalAreas(prev => prev.filter(area => area.id !== areaId));
  };

  const handleSave = () => {
    onSave(localAreas);
    onClose();
  };

  const colorOptions = [
    { name: 'Gris', value: '#E5E7EB', border: '#9CA3AF' },
    { name: 'Azul', value: '#DBEAFE', border: '#3B82F6' },
    { name: 'Verde', value: '#ECFDF5', border: '#10B981' },
    { name: 'Amarillo', value: '#FEF3C7', border: '#F59E0B' },
    { name: 'Púrpura', value: '#F3E8FF', border: '#8B5CF6' },
    { name: 'Rosa', value: '#FCE7F3', border: '#EC4899' }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            Configurar Áreas de la Oficina
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Lista de áreas */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-md font-medium text-gray-900">Áreas</h3>
                <button
                  onClick={handleAddArea}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <PlusIcon className="h-4 w-4" />
                  Agregar Área
                </button>
              </div>

              <div className="space-y-3">
                {localAreas.map((area, index) => (
                  <div key={area.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: area.color, border: `2px solid ${area.borderColor}` }}
                        ></div>
                        <span className="font-medium text-gray-900">
                          {area.name || `Área ${index + 1}`}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteArea(area.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nombre
                        </label>
                        <input
                          type="text"
                          value={area.name}
                          onChange={(e) => handleUpdateArea(area.id, 'name', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Color
                        </label>
                        <select
                          value={area.color}
                          onChange={(e) => {
                            const selectedColor = colorOptions.find(c => c.value === e.target.value);
                            handleUpdateArea(area.id, 'color', selectedColor.value);
                            handleUpdateArea(area.id, 'borderColor', selectedColor.border);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {colorOptions.map(color => (
                            <option key={color.value} value={color.value}>
                              {color.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          X
                        </label>
                        <input
                          type="number"
                          value={area.x}
                          onChange={(e) => handleUpdateArea(area.id, 'x', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Y
                        </label>
                        <input
                          type="number"
                          value={area.y}
                          onChange={(e) => handleUpdateArea(area.id, 'y', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Ancho
                        </label>
                        <input
                          type="number"
                          value={area.width}
                          onChange={(e) => handleUpdateArea(area.id, 'width', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Alto
                        </label>
                        <input
                          type="number"
                          value={area.height}
                          onChange={(e) => handleUpdateArea(area.id, 'height', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Vista previa */}
            <div>
              <h3 className="text-md font-medium text-gray-900 mb-4">Vista Previa</h3>
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="relative w-full h-64 bg-white border rounded">
                  {localAreas.map(area => (
                    <div
                      key={area.id}
                      className="absolute border-2 rounded"
                      style={{
                        left: `${(area.x / 800) * 100}%`,
                        top: `${(area.y / 600) * 100}%`,
                        width: `${(area.width / 800) * 100}%`,
                        height: `${(area.height / 600) * 100}%`,
                        backgroundColor: area.color,
                        borderColor: area.borderColor
                      }}
                    >
                      <div className="p-2 text-xs font-medium text-gray-700">
                        {area.name}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
          >
            Guardar Configuración
          </button>
        </div>
      </div>
    </div>
  );
};

export default AreaConfigModal;
