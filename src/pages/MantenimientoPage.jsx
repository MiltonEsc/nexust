// src/pages/MantenimientoPage.jsx

import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useAppContext } from "../context/AppContext";
import Modal from "../components/common/Modal";
import MantenimientoForm from "../components/forms/MantenimientoForm";
import MantenimientoPlanForm from "../components/forms/MantenimientoPlanForm";
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
  const [schedules, setSchedules] = useState([]);
  const [loadingSchedules, setLoadingSchedules] = useState(true);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [scheduleFilter, setScheduleFilter] = useState("all"); // all | overdue | next30

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
      fetchSchedules();
    }
  }, [currentPage, activeCompany]);
  const fetchSchedules = async () => {
    if (!activeCompany) return;
    setLoadingSchedules(true);
    try {
      const { data, error } = await supabase
        .from("maintenance_schedules")
        .select("*, equipos(id, marca, modelo, numero_serie)")
        .eq("company_id", activeCompany.id)
        .order("next_date", { ascending: true });
      if (error) throw error;
      const today = new Date();
      const in30 = new Date();
      in30.setDate(in30.getDate() + 30);

      let filtered = data || [];
      if (scheduleFilter === "overdue") {
        filtered = filtered.filter((s) => new Date(s.next_date) < today && s.active);
      } else if (scheduleFilter === "next30") {
        filtered = filtered.filter((s) => {
          const d = new Date(s.next_date);
          return d >= today && d <= in30 && s.active;
        });
      }
      setSchedules(filtered);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingSchedules(false);
    }
  };

  const openScheduleModal = (schedule = null) => {
    setEditingSchedule(schedule);
    setScheduleModalOpen(true);
  };

  const closeScheduleModal = () => {
    setEditingSchedule(null);
    setScheduleModalOpen(false);
  };

  const handleScheduleSuccess = () => {
    closeScheduleModal();
    fetchSchedules();
  };

  const toggleScheduleActive = async (schedule) => {
    const { error } = await supabase
      .from("maintenance_schedules")
      .update({ active: !schedule.active })
      .eq("id", schedule.id);
    if (!error) fetchSchedules();
  };

  const scheduleToFrequencyText = (s) => {
    const map = {
      daily: "Diario",
      weekly: "Semanal",
      monthly: "Mensual",
      quarterly: "Trimestral",
      semiannual: "Semestral",
      annual: "Anual",
      custom: `${s.frequency_days} días`,
    };
    return map[s.periodicity] || "N/A";
  };

  const createLogFromSchedule = async (s) => {
    try {
      const { error } = await supabase.from("maintenance_logs").insert({
        company_id: activeCompany.id,
        equipo_id: s.equipo_id,
        fecha: new Date().toISOString().slice(0, 10),
        detalle: `OT generada desde plan: ${s.title}`,
        tecnico: s.responsible || null,
      });
      if (error) throw error;

      // Reprogramar próxima fecha
      const next = new Date(s.next_date);
      switch (s.periodicity) {
        case "daily":
          next.setDate(next.getDate() + 1);
          break;
        case "weekly":
          next.setDate(next.getDate() + 7);
          break;
        case "monthly":
          next.setMonth(next.getMonth() + 1);
          break;
        case "quarterly":
          next.setMonth(next.getMonth() + 3);
          break;
        case "semiannual":
          next.setMonth(next.getMonth() + 6);
          break;
        case "annual":
          next.setFullYear(next.getFullYear() + 1);
          break;
        case "custom":
        default:
          next.setDate(next.getDate() + (s.frequency_days || 0));
      }

      await supabase
        .from("maintenance_schedules")
        .update({ next_date: next.toISOString().slice(0, 10) })
        .eq("id", s.id);

      fetchMaintenanceData(currentPage);
      fetchSchedules();
    } catch (e) {
      alert(e.message);
    }
  };

  // Notificaciones in-app simples al cargar (overdue / next 7 días)
  useEffect(() => {
    const notifyUpcoming = async () => {
      if (!activeCompany) return;
      const { data } = await supabase
        .from("maintenance_schedules")
        .select("id, title, next_date, active")
        .eq("company_id", activeCompany.id)
        .eq("active", true);
      const today = new Date();
      const in7 = new Date();
      in7.setDate(in7.getDate() + 7);
      const overdue = (data || []).filter((s) => new Date(s.next_date) < today);
      const soon = (data || []).filter((s) => {
        const d = new Date(s.next_date);
        return d >= today && d <= in7;
      });
      if (overdue.length > 0) {
        console.warn(`Planes vencidos: ${overdue.length}`);
      }
      if (soon.length > 0) {
        console.info(`Planes próximos (7 días): ${soon.length}`);
      }
    };
    notifyUpcoming();
  }, [activeCompany]);

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
        {/* Planes de mantenimiento */}
        <div className="mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Planes de mantenimiento</h2>
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1 text-sm">
                  <button
                    onClick={() => { setScheduleFilter("all"); fetchSchedules(); }}
                    className={`px-3 py-1.5 rounded-md ${scheduleFilter === "all" ? "bg-blue-600 text-white" : "border border-gray-300"}`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => { setScheduleFilter("overdue"); fetchSchedules(); }}
                    className={`px-3 py-1.5 rounded-md ${scheduleFilter === "overdue" ? "bg-blue-600 text-white" : "border border-yellow-300 text-yellow-800"}`}
                  >
                    Vencidos
                  </button>
                  <button
                    onClick={() => { setScheduleFilter("next30"); fetchSchedules(); }}
                    className={`px-3 py-1.5 rounded-md ${scheduleFilter === "next30" ? "bg-blue-600 text-white" : "border border-green-300 text-green-800"}`}
                  >
                    Próx. 30 días
                  </button>
                </div>
                <button onClick={() => openScheduleModal()} className="btn-primary inline-flex items-center gap-2">
                  <PlusIcon className="w-5 h-5" /> Crear plan
                </button>
              </div>
            </div>
            {loadingSchedules ? (
              <div className="p-6 text-gray-500">Cargando...</div>
            ) : schedules.length === 0 ? (
              <div className="p-6 text-gray-500">No hay planes de mantenimiento.</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {schedules.map((s) => (
                  <div key={s.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                        <ComputerDesktopIcon className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{s.title}</div>
                        <div className="text-sm text-gray-600">
                          {s.equipos
                            ? `${s.equipos.marca} ${s.equipos.modelo} • S/N: ${s.equipos.numero_serie}`
                            : "Plan general"}
                          {" • Próxima: "}
                          {new Date(s.next_date).toLocaleDateString()} {" • Frecuencia: "}
                          {scheduleToFrequencyText(s)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => createLogFromSchedule(s)}
                        className="px-3 py-1.5 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
                      >
                        Generar OT
                      </button>
                      <button
                        onClick={() => openScheduleModal(s)}
                        className="px-3 py-1.5 text-sm rounded-md border border-gray-300 hover:bg-gray-50"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => toggleScheduleActive(s)}
                        className={`px-3 py-1.5 text-sm rounded-md ${s.active ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"}`}
                      >
                        {s.active ? "Desactivar" : "Activar"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
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

      {scheduleModalOpen && (
        <Modal
          isOpen={scheduleModalOpen}
          onClose={closeScheduleModal}
          title={editingSchedule ? "Editar Plan de Mantenimiento" : "Crear Plan de Mantenimiento"}
        >
          <MantenimientoPlanForm planToEdit={editingSchedule} onSuccess={handleScheduleSuccess} />
        </Modal>
      )}
    </div>
  );
}

export default MantenimientoPage;
