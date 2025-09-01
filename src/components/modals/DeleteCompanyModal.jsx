// src/components/modals/DeleteCompanyModal.jsx

import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import Modal from "../common/Modal";

function DeleteCompanyModal({ company, onClose, onSuccess }) {
  // ▼▼▼ ESTA LÍNEA ES LA SOLUCIÓN ▼▼▼
  // Si no hay una compañía para borrar, no renderizamos nada.
  if (!company) {
    return null;
  }

  const [confirmationText, setConfirmationText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setConfirmationText("");
    setError("");
  }, [company]);

  const handleDelete = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { error } = await supabase.functions.invoke("delete-company", {
        body: { company_id: company.id },
      });
      if (error) throw error;

      alert(`Empresa "${company.name}" eliminada con éxito.`);
      onSuccess();
    } catch (err) {
      setError(err.message);
      console.error("Error al eliminar la empresa:", err);
    } finally {
      setLoading(false);
    }
  };

  const isButtonDisabled = confirmationText !== company.name || loading;

  return (
    <Modal
      isOpen={!!company}
      onClose={onClose}
      title="Confirmación de Eliminación Permanente"
    >
      <form onSubmit={handleDelete} className="space-y-4">
        <p className="text-sm text-gray-600">
          Esta acción es irreversible y eliminará la empresa, junto con todos
          sus activos, usuarios y datos asociados.
        </p>
        <p className="text-sm text-gray-600">
          Para confirmar, por favor escribe el nombre exacto de la empresa:{" "}
          <strong className="text-gray-900">{company.name}</strong>
        </p>
        <div>
          <label className="block text-sm">Nombre de la empresa</label>
          <input
            type="text"
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value)}
            className="input-style"
            autoComplete="off"
          />
        </div>
        {error && <p className="text-sm text-red-600 text-center">{error}</p>}
        <div className="text-right space-x-3 pt-4">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isButtonDisabled}
            className="btn-danger disabled:bg-red-300"
          >
            {loading ? "Eliminando..." : "Eliminar Permanentemente"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default DeleteCompanyModal;
