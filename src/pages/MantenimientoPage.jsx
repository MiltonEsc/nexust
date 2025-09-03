// src/pages/MantenimientoPage.jsx

import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useAppContext } from "../context/AppContext";
import Modal from "../components/common/Modal";
import MantenimientoForm from "../components/forms/MantenimientoForm";
import Pagination from "../components/common/Pagination";

const ITEMS_PER_PAGE = 10;

// Componente auxiliar para mostrar la evidencia de forma elegante
const EvidenceDisplay = ({ url }) => {
  if (!url) {
    return <span className="text-gray-400">N/A</span>;
  }

  const isPdf = url.toLowerCase().endsWith(".pdf");

  if (isPdf) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:underline"
      >
        Ver PDF
      </a>
    );
  }

  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      <img
        src={url}
        alt="Evidencia"
        className="h-10 w-10 object-cover rounded-md hover:opacity-80 transition-opacity"
      />
    </a>
  );
};

function MantenimientoPage() {
  const { activeCompany } = useAppContext();
  const [maintenanceLogs, setMaintenanceLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados para el modal (crear y editar)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const fetchMaintenanceData = async (page) => {
    if (!activeCompany) {
      setLoading(false);
      setMaintenanceLogs([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      // Leemos desde la nueva tabla 'maintenance_logs' y hacemos un join con equipos
      const { data, error, count } = await supabase
        .from("maintenance_logs")
        .select(
          `
          *,
          equipos (marca, modelo)
        `,
          { count: "exact" }
        )
        .eq("company_id", activeCompany.id)
        .order("fecha", { ascending: false })
        .range(from, to);

      if (error) throw error;
      setMaintenanceLogs(data || []);
      setTotalItems(count || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeCompany) {
      fetchMaintenanceData(currentPage);
    }
  }, [currentPage, activeCompany]);

  const handleOpenModal = (log = null) => {
    setEditingLog(log); // Si no hay log, es para crear. Si hay, es para editar.
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingLog(null);
    setIsModalOpen(false);
  };

  const handleSuccess = () => {
    handleCloseModal();
    fetchMaintenanceData(currentPage);
  };

  const handleDelete = async (logId) => {
    if (
      window.confirm(
        "¿Estás seguro de que quieres eliminar este registro de mantenimiento?"
      )
    ) {
      try {
        const { error } = await supabase
          .from("maintenance_logs")
          .delete()
          .eq("id", logId);
        if (error) throw error;
        // Si al eliminar nos quedamos sin items en la página actual, volvemos a la anterior
        if (maintenanceLogs.length === 1 && currentPage > 1) {
          setCurrentPage(currentPage - 1);
        } else {
          fetchMaintenanceData(currentPage);
        }
      } catch (error) {
        alert("Error al eliminar el registro: " + error.message);
      }
    }
  };

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  // Muestra "Cargando..." solo en la carga inicial
  if (loading && maintenanceLogs.length === 0)
    return (
      <p className="p-4 text-center">Cargando historial de mantenimiento...</p>
    );
  if (error)
    return <p className="p-4 text-center text-red-600">Error: {error}</p>;

  return (
    <div className="p-6 sm:p-8 bg-white rounded-xl shadow-lg max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Historial de Mantenimiento</h1>
        <button onClick={() => handleOpenModal()} className="btn-primary">
          Registrar Mantenimiento
        </button>
      </div>

      <div
        className={`overflow-x-auto transition-opacity ${
          loading ? "opacity-50" : "opacity-100"
        }`}
      >
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="th-cell">Equipo</th>
              <th className="th-cell">Fecha</th>
              <th className="th-cell">Descripción</th>
              <th className="th-cell">Técnico</th>
              <th className="th-cell">Evidencia</th>
              <th className="th-cell">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {maintenanceLogs.length > 0 ? (
              maintenanceLogs.map((log) => (
                <tr key={log.id}>
                  <td className="td-cell font-medium">
                    {log.equipos
                      ? `${log.equipos.marca} ${log.equipos.modelo}`
                      : "Equipo no encontrado"}
                  </td>
                  <td className="td-cell">
                    {new Date(log.fecha).toLocaleDateString()}
                  </td>
                  <td className="td-cell">{log.detalle}</td>
                  <td className="td-cell">{log.tecnico || "N/A"}</td>
                  <td className="td-cell">
                    <EvidenceDisplay url={log.evidencia_url} />
                  </td>
                  <td className="td-cell space-x-4 whitespace-nowrap">
                    <button
                      onClick={() => handleOpenModal(log)}
                      className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(log.id)}
                      className="text-red-600 hover:text-red-900 text-sm font-medium"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="text-center py-8 text-gray-500">
                  No hay registros de mantenimiento.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={(page) => setCurrentPage(page)}
      />

      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          title={
            editingLog
              ? "Editar Mantenimiento"
              : "Registrar Nuevo Mantenimiento"
          }
        >
          <MantenimientoForm onSuccess={handleSuccess} logToEdit={editingLog} />
        </Modal>
      )}
    </div>
  );
}

export default MantenimientoPage;
