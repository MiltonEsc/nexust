// src/components/common/ConfirmationModal.jsx

import React from "react";
import { useAppContext } from "../../context/AppContext";
import Modal from "./Modal";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

function ConfirmationModal() {
  const { confirmState, hideConfirm } = useAppContext();
  const { isOpen, title, message, onConfirm } = confirmState;

  const handleConfirm = () => {
    onConfirm(); // Ejecuta la acción de borrado
    hideConfirm(); // Cierra el modal
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={hideConfirm}
      title={title}
      maxWidth="max-w-md"
    >
      <div className="flex flex-col items-center text-center">
        <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
          <ExclamationTriangleIcon
            className="h-6 w-6 text-red-600"
            aria-hidden="true"
          />
        </div>
        <p className="mt-4 text-gray-600">{message}</p>
        <div className="mt-6 flex gap-3">
          <button type="button" onClick={hideConfirm} className="btn-secondary">
            Cancelar
          </button>
          <button type="button" onClick={handleConfirm} className="btn-danger">
            Confirmar Eliminación
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default ConfirmationModal;
