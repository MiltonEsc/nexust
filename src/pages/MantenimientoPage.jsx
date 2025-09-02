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
  const [isModalOpen, setIsModalOpen] = useState(false);

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
      const companyId = activeCompany.id;

      // Llamamos a las funciones RPC en paralelo
      const [logsRes, countRes] = await Promise.all([
        supabase.rpc("get_paginated_maintenance_logs", {
          p_company_id: companyId,
          p_page_number: page,
          p_page_size: ITEMS_PER_PAGE,
        }),
        supabase.rpc("get_total_maintenance_logs_count", {
          p_company_id: companyId,
        }),
      ]);

      if (logsRes.error) throw logsRes.error;
      if (countRes.error) throw countRes.error;

      setMaintenanceLogs(logsRes.data || []);
      setTotalItems(countRes.data || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaintenanceData(currentPage);
  }, [currentPage, activeCompany]);

  const handleSuccess = () => {
    setIsModalOpen(false);
    // Si la página actual no es la 1, la cambiamos para ver el nuevo registro
    if (currentPage !== 1) {
      setCurrentPage(1);
    } else {
      fetchMaintenanceData(1);
    }
  };

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

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
        <button onClick={() => setIsModalOpen(true)} className="btn-primary">
          Registrar Mantenimiento
        </button>
      </div>

      <div className={`overflow-x-auto ${loading ? "opacity-50" : ""}`}>
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="th-cell">Fecha</th>
              <th className="th-cell">Equipo</th>
              <th className="th-cell">Descripción</th>
              <th className="th-cell">Técnico</th>
              <th className="th-cell">Evidencia</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {maintenanceLogs.length > 0 ? (
              maintenanceLogs.map((log) => (
                <tr key={log.log_id}>
                  <td className="td-cell">
                    {new Date(log.fecha).toLocaleDateString()}
                  </td>
                  <td className="td-cell font-medium">{log.equipo_info}</td>
                  <td className="td-cell">{log.detalle}</td>
                  <td className="td-cell">{log.tecnico || "N/A"}</td>
                  <td className="td-cell">
                    <EvidenceDisplay url={log.evidencia_url} />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="text-center py-8 text-gray-500">
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

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Registrar Nuevo Mantenimiento"
      >
        <MantenimientoForm
          onSuccess={handleSuccess}
          activeCompanyId={activeCompany?.id}
        />
      </Modal>
    </div>
  );
}

export default MantenimientoPage;
