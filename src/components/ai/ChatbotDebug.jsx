import React from 'react';
import { useInventoryData } from '../../hooks/useInventoryData';

const ChatbotDebug = () => {
  const inventoryData = useInventoryData();

  return (
    <div className="fixed top-4 left-4 bg-white p-4 rounded-lg shadow-lg border z-50 max-w-md">
      <h3 className="font-bold text-sm mb-2">Debug Chatbot</h3>
      <div className="text-xs space-y-1">
        <div>Loading: {inventoryData.loading ? 'Sí' : 'No'}</div>
        <div>Error: {inventoryData.error || 'Ninguno'}</div>
        <div>Equipos: {inventoryData.equipos.length}</div>
        <div>Software: {inventoryData.software.length}</div>
        <div>Periféricos: {inventoryData.perifericos.length}</div>
        <div>Consumibles: {inventoryData.consumibles.length}</div>
        {inventoryData.equipos.length > 0 && (
          <div className="mt-2">
            <div className="font-semibold">Primeros equipos:</div>
            {inventoryData.equipos.slice(0, 3).map((equipo, index) => (
              <div key={index} className="text-xs">
                {equipo.marca} {equipo.modelo} ({equipo.estado})
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatbotDebug;
