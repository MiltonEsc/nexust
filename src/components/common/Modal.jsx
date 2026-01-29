// src/components/common/Modal.jsx

import React, { useEffect } from "react";
import { createPortal } from "react-dom";

// Este componente recibe 4 props:
// isOpen: un booleano para saber si se debe mostrar.
// onClose: una función para llamar cuando se quiera cerrar.
// title: un título opcional para el modal.
// children: el contenido que irá dentro del modal (nuestro formulario).
function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-3xl' }) {
  // useEffect para manejar el cierre con la tecla 'Escape'
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEsc);
    // Limpiamos el event listener cuando el componente se desmonta
    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
  }, [onClose]);

  // Si no está abierto, no renderizamos nada.
  if (!isOpen) return null;

  // Portal-like structure to render at the top level
  return createPortal(
    <>
      {/* 1. El Fondo Opaco (Backdrop) */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose} // Permite cerrar el modal haciendo clic fuera
      ></div>

      {/* 2. El Contenedor Principal del Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className={`bg-white p-6 rounded-lg shadow-xl relative w-full ${maxWidth}`}>
          {/* Encabezado del Modal con Título y Botón de Cierre */}
          <div className="flex justify-between items-center border-b pb-3 mb-4">
            <h3 className="text-xl font-semibold">{title}</h3>
            <button
              onClick={onClose}
              className="text-2xl font-bold hover:text-red-600"
            >
              &times;
            </button>
          </div>

          {/* 3. Aquí se renderizará el contenido (nuestro formulario) */}
          <div>{children}</div>
        </div>
      </div>
    </>,
    document.body
  );
}

export default Modal;
