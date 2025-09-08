import React, { useState, useEffect } from 'react';
import { XMarkIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { supabase } from '../../supabaseClient';

const EquipoLocationModal = ({ isOpen, onClose, equipo, onUpdate }) => {
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (equipo) {
      setX(equipo.x_coordinate || 0);
      setY(equipo.y_coordinate || 0);
    }
  }, [equipo]);

  const handleSave = async () => {
    if (!equipo) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('equipos')
        .update({ 
          x_coordinate: x, 
          y_coordinate: y 
        })
        .eq('id', equipo.id);

      if (error) throw error;

      onUpdate({ ...equipo, x_coordinate: x, y_coordinate: y });
      onClose();
    } catch (error) {
      console.error('Error updating location:', error);
      alert('Error al actualizar la ubicación');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !equipo) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2">
            <MapPinIcon className="h-6 w-6 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Ubicación del Equipo
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              {equipo.marca} {equipo.modelo}
            </h3>
            <p className="text-sm text-gray-500">
              {equipo.tipo} - {equipo.numero_serie}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Coordenada X
              </label>
              <input
                type="number"
                value={x}
                onChange={(e) => setX(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Coordenada Y
              </label>
              <input
                type="number"
                value={y}
                onChange={(e) => setY(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Tip:</strong> Las coordenadas se pueden ajustar directamente en el mapa 
              haciendo clic en la posición deseada.
            </p>
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
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Guardando...' : 'Guardar Ubicación'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EquipoLocationModal;
