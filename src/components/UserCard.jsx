// src/components/UserCard.jsx

import React from "react";

// Recibe como props el objeto del registro y las funciones para editar/eliminar
function UserCard({ registro, onEdit, onDelete }) {
  // Obtenemos los datos del equipo relacionado. Puede ser null si no tiene uno asignado.
  const equipoAsignado = registro.equipos;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col">
      <div className="flex-grow">
        <h3 className="font-bold text-lg text-gray-900">{registro.nombre}</h3>
        <p className="text-sm text-gray-600 mb-4">{registro.cargo}</p>
        <div className="pt-4 border-t border-gray-200 text-sm space-y-2">
          <p>
            <strong>Departamento:</strong> {registro.departamento || "N/A"}
          </p>
          <p>
            <strong>Cédula:</strong> {registro.cedula}
          </p>
          <p>
            <strong>Equipo:</strong>{" "}
            {equipoAsignado
              ? `${equipoAsignado.marca} ${equipoAsignado.modelo}`
              : "N/A"}
          </p>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-gray-100 text-right space-x-2">
        <button
          onClick={() => alert("Ver detalles no implementado")}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
        >
          Ver Hoja de Vida &rarr;
        </button>
        <button
          onClick={() => onEdit(registro)}
          className="text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          Editar
        </button>
        <button
          onClick={() => onDelete(registro.id)}
          className="text-sm font-medium text-red-600 hover:text-red-800"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
}

export default UserCard;
