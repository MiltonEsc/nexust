// src/pages/MantenimientoPage.jsx

import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import Modal from "../components/common/Modal";
import MantenimientoForm from "../components/forms/MantenimientoForm";
import Pagination from "../components/common/Pagination"; // Importamos

const ITEMS_PER_PAGE = 10;

function MantenimientoPage() {
  const [maintenanceLogs, setMaintenanceLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeCompanyId, setActiveCompanyId] = useState(null);

  // Estados de paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const fetchMaintenanceData = async (page) => {
    setLoading(true);
    setError(null);
    try {
      let companyId = activeCompanyId;
      if (!companyId) {
        const { data: companies, error: companyError } = await supabase
          .from("company_users")
          .select("company_id")
          .limit(1);
        if (companyError) throw companyError;
        if (companies && companies.length > 0) {
          companyId = companies[0].company_id;
          setActiveCompanyId(companyId);
        } else {
          throw new Error("Usuario no pertenece a ninguna compañía");
        }
      }

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
  }, [currentPage]);

  const handleSuccess = () => {
    setIsModalOpen(false);
    fetchMaintenanceData(1); // Recargamos y vamos a la primera página
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  if (loading)
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

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="th-cell">Fecha</th>
              <th className="th-cell">Equipo</th>
              <th className="th-cell">Descripción</th>
              <th className="th-cell">Técnico</th>
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
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="text-center py-8 text-gray-500">
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
          activeCompanyId={activeCompanyId}
        />
      </Modal>
    </div>
  );
}

export default MantenimientoPage;
