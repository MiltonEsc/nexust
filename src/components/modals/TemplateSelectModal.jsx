import React from 'react';
import { XMarkIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';
import { officeTemplates } from '../maps/OfficeTemplates';

const TemplateSelectModal = ({ isOpen, onClose, onSelectTemplate }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            Seleccionar Plantilla de Oficina
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(officeTemplates).map(([key, template]) => (
              <div
                key={key}
                onClick={() => onSelectTemplate(template.areas)}
                className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3 mb-3">
                  <BuildingOfficeIcon className="h-8 w-8 text-blue-600" />
                  <div>
                    <h3 className="font-medium text-gray-900">{template.name}</h3>
                    <p className="text-sm text-gray-600">{template.description}</p>
                  </div>
                </div>

                {/* Vista previa del layout */}
                <div className="relative w-full h-32 bg-gray-100 border rounded">
                  {template.areas.map(area => (
                    <div
                      key={area.id}
                      className="absolute border rounded text-xs"
                      style={{
                        left: `${(area.x / 1000) * 100}%`,
                        top: `${(area.y / 500) * 100}%`,
                        width: `${(area.width / 1000) * 100}%`,
                        height: `${(area.height / 500) * 100}%`,
                        backgroundColor: area.color,
                        borderColor: area.borderColor
                      }}
                    >
                      <div className="p-1 text-xs font-medium text-gray-700 truncate">
                        {area.name}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 text-sm text-gray-500">
                  {template.areas.length} áreas configuradas
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default TemplateSelectModal;
