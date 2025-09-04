// src/pages/InventarioPage.jsx

import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useAppContext } from "../context/AppContext";
import Modal from "../components/common/Modal";
import EquipoForm from "../components/forms/EquipoForm";
import SoftwareForm from "../components/forms/SoftwareForm";
import PerifericoForm from "../components/forms/PerifericoForm";
import AssetDetailModal from "../components/modals/AssetDetailModal";
import ImportCSVModal from "../components/modals/ImportCSVModal";
import Pagination from "../components/common/Pagination";

const ITEMS_PER_PAGE = 10;

function InventarioPage() {
  // Obtenemos todo lo que necesitamos de nuestro contexto global
  const { activeCompany, showNotification, showConfirm } = useAppContext();

  const [activeTab, setActiveTab] = useState("equipos");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewingItem, setViewingItem] = useState(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // En la función fetchData, necesitas modificar la línea donde defines selectString

  const fetchData = async (tab, search, page) => {
    if (!activeCompany) {
      setLoading(false);
      setItems([]);
      return;
    }
    setLoading(true);
    setError(null);
    const from = (page - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    try {
      const companyId = activeCompany.id;

      // --- CORRECCIÓN DEL BUG DE HISTORIAL Y MANTENIMIENTOS ---
      // Nos aseguramos de pedir siempre la columna 'trazabilidad'.
      let selectString = "*, proveedores(nombre), trazabilidad";

      // Y si la pestaña es 'equipos', añadimos también la relación con 'registros' Y 'maintenance_logs'.
      if (tab === "equipos") {
        selectString = `*, 
                     proveedores(nombre), 
                     registros:registro_id(nombre), 
                     trazabilidad,
                     maintenance_logs!equipo_id(
                       id,
                       fecha,
                       detalle,
                       tecnico,
                       evidencia_url,
                       created_at
                     )`;
      }

      let query = supabase
        .from(tab)
        .select(selectString, { count: "exact" })
        .eq("company_id", companyId)
        .order("id", { ascending: false });

      if (search) {
        const searchColumns = {
          equipos: `marca.ilike.%${search}%,modelo.ilike.%${search}%,numero_serie.ilike.%${search}%`,
          software: `nombre.ilike.%${search}%,version.ilike.%${search}%`,
          perifericos: `tipo.ilike.%${search}%,marca.ilike.%${search}%,modelo.ilike.%${search}%`,
        };
        query = query.or(searchColumns[tab]);
      }

      query = query.range(from, to);
      const { data, error, count } = await query;
      if (error) throw error;
      setItems(data || []);
      setTotalItems(count || 0);
    } catch (err) {
      setError(err.message);
      showNotification(`Error al cargar datos: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };
  const fetchMaintenanceForEquipo = async (equipoId) => {
    try {
      const { data, error } = await supabase
        .from("maintenance_logs")
        .select(
          `
        id,
        fecha,
        detalle,
        tecnico,
        evidencia_url,
        created_at
      `
        )
        .eq("equipo_id", equipoId)
        .order("fecha", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error("Error al cargar mantenimientos:", err);
      return [];
    }
  };
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm]);
  useEffect(() => {
    if (activeCompany) {
      fetchData(activeTab, searchTerm, currentPage);
    }
  }, [activeTab, searchTerm, currentPage, activeCompany]);

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  const handleAddNew = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };
  const handleEdit = (item) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };
  const handleViewDetails = async (item) => {
    let itemWithMaintenance = { ...item };

    // Si es un equipo, cargar sus mantenimientos
    if (activeTab === "equipos") {
      const maintenanceLogs = await fetchMaintenanceForEquipo(item.id);
      itemWithMaintenance.maintenance_logs = maintenanceLogs;
    }

    setViewingItem(itemWithMaintenance);
  };
  const handleCloseModal = () => setIsModalOpen(false);

  const handleSuccess = () => {
    handleCloseModal();
    showNotification(
      `Activo ${editingItem ? "actualizado" : "creado"} con éxito.`,
      "success"
    );
    fetchData(activeTab, searchTerm, currentPage);
  };

  const handleImportCSV = () => setIsImportModalOpen(true);

  const handleDelete = (idToDelete) => {
    const deleteAction = async () => {
      const { error } = await supabase
        .from(activeTab)
        .delete()
        .eq("id", idToDelete);
      if (error) {
        showNotification(error.message, "error");
      } else {
        showNotification("Ítem eliminado correctamente.", "success");
        if (items.length === 1 && currentPage > 1) {
          setCurrentPage(currentPage - 1);
        } else {
          fetchData(activeTab, searchTerm, currentPage);
        }
      }
    };

    showConfirm(
      "Confirmar Eliminación",
      "¿Estás seguro de que quieres eliminar este ítem de forma permanente?",
      deleteAction
    );
  };

  const handleExportCSV = () => {
    if (items.length === 0) {
      showNotification("No hay datos para exportar.", "info");
      return;
    }
    // ... (El resto de la lógica de exportación se mantiene)
  };

  const getModalTitle = () => {
    const action = editingItem ? "Editar" : "Añadir";
    if (activeTab === "equipos") return `${action} Equipo`;
    if (activeTab === "software") return `${action} Software`;
    if (activeTab === "perifericos") return `${action} Periférico`;
    return "Formulario";
  };

  const getButtonText = () => {
    if (activeTab === "equipos") return "Equipo";
    if (activeTab === "software") return "Software";
    if (activeTab === "perifericos") return "Periférico";
    return "Ítem";
  };

  return (
    <div className="p-6 sm:p-8 bg-white rounded-xl shadow-lg max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-2xl font-semibold">Gestión de Inventario</h2>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={handleImportCSV}
            className="btn-success w-full sm:w-auto text-sm"
          >
            Importar CSV
          </button>
          <button
            onClick={handleExportCSV}
            className="btn-secondary w-full sm:w-auto text-sm"
          >
            Exportar CSV
          </button>
          <button
            onClick={handleAddNew}
            className="btn-primary w-full sm:w-auto flex-shrink-0"
          >
            Añadir {getButtonText()}
          </button>
        </div>
      </div>

      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-4" aria-label="Tabs">
          <button
            onClick={() => setActiveTab("equipos")}
            className={`tab-link ${activeTab === "equipos" ? "active" : ""}`}
          >
            Equipos
          </button>
          <button
            onClick={() => setActiveTab("software")}
            className={`tab-link ${activeTab === "software" ? "active" : ""}`}
          >
            Software
          </button>
          <button
            onClick={() => setActiveTab("perifericos")}
            className={`tab-link ${
              activeTab === "perifericos" ? "active" : ""
            }`}
          >
            Periféricos
          </button>
        </nav>
      </div>

      <div className="mb-4">
        <input
          type="search"
          placeholder="Buscar..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-style w-full sm:w-1/3"
        />
      </div>

      <div>
        {loading && <p className="text-center p-4">Cargando...</p>}
        {error && (
          <p className="text-red-600 text-center p-4">Error: {error}</p>
        )}
        {!loading && !error && (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  {activeTab === "equipos" && (
                    <tr>
                      {" "}
                      <th className="th-cell">Activo</th>{" "}
                      <th className="th-cell">Estado</th>{" "}
                      <th className="th-cell">Asignado A</th>{" "}
                      <th className="relative px-6 py-3"></th>{" "}
                    </tr>
                  )}
                  {activeTab === "software" && (
                    <tr>
                      {" "}
                      <th className="th-cell">Nombre</th>{" "}
                      <th className="th-cell">Versión</th>{" "}
                      <th className="th-cell">Stock</th>{" "}
                      <th className="relative px-6 py-3"></th>{" "}
                    </tr>
                  )}
                  {activeTab === "perifericos" && (
                    <tr>
                      {" "}
                      <th className="th-cell">Tipo</th>{" "}
                      <th className="th-cell">Marca</th>{" "}
                      <th className="th-cell">Modelo</th>{" "}
                      <th className="th-cell">Estado</th>{" "}
                      <th className="relative px-6 py-3"></th>{" "}
                    </tr>
                  )}
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.length > 0 ? (
                    items.map((item) => (
                      <tr key={item.id}>
                        {activeTab === "equipos" && (
                          <>
                            <td className="td-cell font-medium">
                              {" "}
                              {item.marca} {item.modelo}{" "}
                              <p className="text-xs text-gray-500">
                                {" "}
                                S/N: {item.numero_serie}{" "}
                              </p>{" "}
                            </td>
                            <td className="td-cell">{item.estado}</td>
                            <td className="td-cell">
                              {" "}
                              {item.registros ? (
                                <span>{item.registros.nombre}</span>
                              ) : (
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                  {" "}
                                  Disponible{" "}
                                </span>
                              )}{" "}
                            </td>
                          </>
                        )}
                        {activeTab === "software" && (
                          <>
                            <td className="td-cell font-medium">
                              {item.nombre}
                            </td>
                            <td className="td-cell">{item.version}</td>
                            <td className="td-cell">{item.stock}</td>
                          </>
                        )}
                        {activeTab === "perifericos" && (
                          <>
                            <td className="td-cell font-medium">{item.tipo}</td>
                            <td className="td-cell">{item.marca}</td>
                            <td className="td-cell">{item.modelo}</td>
                            <td className="td-cell">{item.estado}</td>
                          </>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleViewDetails(item)}
                            className="text-gray-600 hover:text-indigo-900 mr-4"
                          >
                            {" "}
                            Detalles{" "}
                          </button>
                          <button
                            onClick={() => handleEdit(item)}
                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                          >
                            {" "}
                            Editar{" "}
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            {" "}
                            Eliminar{" "}
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      {" "}
                      <td
                        colSpan="5"
                        className="text-center py-8 text-gray-500"
                      >
                        {" "}
                        No hay registros.{" "}
                      </td>{" "}
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
          </>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={getModalTitle()}
        maxWidth="max-w-4xl"
      >
        {activeTab === "equipos" && (
          <EquipoForm itemToEdit={editingItem} onSuccess={handleSuccess} />
        )}
        {activeTab === "software" && (
          <SoftwareForm itemToEdit={editingItem} onSuccess={handleSuccess} />
        )}
        {activeTab === "perifericos" && (
          <PerifericoForm itemToEdit={editingItem} onSuccess={handleSuccess} />
        )}
      </Modal>

      <AssetDetailModal
        asset={viewingItem}
        onClose={() => setViewingItem(null)}
      />

      <ImportCSVModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          setIsImportModalOpen(false);
          showNotification("Importación completada con éxito.", "success");
          fetchData(activeTab, searchTerm, 1);
          setCurrentPage(1);
        }}
        activeTab={activeTab}
      />
    </div>
  );
}

export default InventarioPage;
// En la función fetchData, necesitas modificar la línea donde defines selectString

const fetchData = async (tab, search, page) => {
  if (!activeCompany) {
    setLoading(false);
    setItems([]);
    return;
  }
  setLoading(true);
  setError(null);
  const from = (page - 1) * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;

  try {
    const companyId = activeCompany.id;

    // --- CORRECCIÓN DEL BUG DE HISTORIAL Y MANTENIMIENTOS ---
    // Nos aseguramos de pedir siempre la columna 'trazabilidad'.
    let selectString = "*, proveedores(nombre), trazabilidad";

    // Y si la pestaña es 'equipos', añadimos también la relación con 'registros' Y 'maintenance_logs'.
    if (tab === "equipos") {
      selectString = `*, 
                     proveedores(nombre), 
                     registros:registro_id(nombre), 
                     trazabilidad,
                     maintenance_logs!equipo_id(
                       id,
                       fecha,
                       detalle,
                       tecnico,
                       evidencia_url,
                       created_at
                     )`;
    }

    let query = supabase
      .from(tab)
      .select(selectString, { count: "exact" })
      .eq("company_id", companyId)
      .order("id", { ascending: false });

    if (search) {
      const searchColumns = {
        equipos: `marca.ilike.%${search}%,modelo.ilike.%${search}%,numero_serie.ilike.%${search}%`,
        software: `nombre.ilike.%${search}%,version.ilike.%${search}%`,
        perifericos: `tipo.ilike.%${search}%,marca.ilike.%${search}%,modelo.ilike.%${search}%`,
      };
      query = query.or(searchColumns[tab]);
    }
    
    query = query.range(from, to);
    const { data, error, count } = await query;
    if (error) throw error;
    setItems(data || []);
    setTotalItems(count || 0);
  } catch (err) {
    setError(err.message);
    showNotification(`Error al cargar datos: ${err.message}`, "error");
  } finally {
    setLoading(false);
  }
};