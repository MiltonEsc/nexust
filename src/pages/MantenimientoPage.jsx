// src/pages/MantenimientoPage.jsx

import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useAppContext } from "../context/AppContext";
import Modal from "../components/common/Modal";
import MantenimientoForm from "../components/forms/MantenimientoForm";
import Pagination from "../components/common/Pagination";
import {
  PencilIcon,
  TrashIcon,
  ComputerDesktopIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";

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

      const { data, error, count } = await supabase
        .from("maintenance_logs")
        .select(
          `
          *,
          equipos (marca, modelo, numero_serie)
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
    setEditingLog(log);
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

  const LoadingSkeleton = () => (
    <div className="space-y-2">
      {[...Array(ITEMS_PER_PAGE)].map((_, index) => (
        <div
          key={index}
          className="animate-pulse bg-white p-4 rounded-lg border border-gray-200 flex items-center justify-between"
        >
          <div className="flex items-center gap-4 w-1/4">
            <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
          <div className="h-4 bg-gray-200 rounded w-1/12"></div>
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/12"></div>
          <div className="w-10 h-10 bg-gray-200 rounded-md"></div>
          <div className="flex gap-2 w-1/12 justify-end">
            <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
            <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Historial de Mantenimiento
              </h1>
              <p className="text-gray-600 mt-1">
                Registra y consulta las intervenciones de tus equipos.
              </p>
            </div>
            <button
              onClick={() => handleOpenModal()}
              className="btn-primary inline-flex items-center gap-2"
            >
              <PlusIcon className="w-5 h-5" />
              Registrar Mantenimiento
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-6">
              <LoadingSkeleton />
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-600">Error: {error}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Equipo
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Descripción
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Técnico
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Evidencia
                    </th>
                    <th className="relative px-6 py-4">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {maintenanceLogs.length > 0 ? (
                    maintenanceLogs.map((log, index) => (
                      <tr
                        key={log.id}
                        className={`hover:bg-gray-50 transition-colors duration-200 ${
                          index % 2 === 0 ? "bg-white" : "bg-gray-25"
                        }`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                              <ComputerDesktopIcon className="h-6 w-6 text-blue-600" />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-semibold text-gray-900">
                                {log.equipos
                                  ? `${log.equipos.marca} ${log.equipos.modelo}`
                                  : "Equipo no encontrado"}
                              </div>
                              <div className="text-xs text-gray-500">
                                S/N: {log.equipos?.numero_serie || "N/A"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                          {new Date(log.fecha).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-800 max-w-sm truncate">
                          {log.detalle}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                          {log.tecnico || "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <EvidenceDisplay url={log.evidencia_url} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleOpenModal(log)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                              title="Editar"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(log.id)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                              title="Eliminar"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="6"
                        className="text-center py-16 text-gray-500"
                      >
                        No hay registros de mantenimiento.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {totalPages > 1 && (
          <div className="mt-8">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(page) => setCurrentPage(page)}
            />
          </div>
        )}
      </div>

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
