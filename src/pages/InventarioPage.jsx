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
  const { activeCompany } = useAppContext();

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

      let selectString = "*, proveedores(nombre)";
      if (tab === "equipos") {
        selectString = "*, proveedores(nombre), registros:registro_id(nombre)";
      }

      let query = supabase
        .from(tab)
        .select(selectString, { count: "exact" })
        .eq("company_id", companyId);

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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm]);

  useEffect(() => {
    fetchData(activeTab, searchTerm, currentPage);
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
  const handleViewDetails = (item) => setViewingItem(item);
  const handleCloseModal = () => setIsModalOpen(false);
  const handleSuccess = () => {
    handleCloseModal();
    fetchData(activeTab, searchTerm, currentPage);
  };
  const handleImportCSV = () => setIsImportModalOpen(true);

  const handleDelete = async (idToDelete) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar este ítem?")) {
      const { error } = await supabase
        .from(activeTab)
        .delete()
        .eq("id", idToDelete);
      if (error) {
        alert(error.message);
      } else {
        fetchData(activeTab, searchTerm, currentPage);
      }
    }
  };

  const handleExportCSV = () => {
    if (items.length === 0) {
      alert("No hay datos para exportar.");
      return;
    }
    let headers = [];
    let rows = [];
    if (activeTab === "equipos") {
      headers = [
        "ID",
        "Marca",
        "Modelo",
        "Numero Serie",
        "Estado",
        "Asignado a",
        "Proveedor",
        "Costo",
        "Fecha Compra",
      ];
      rows = items.map((item) => [
        item.id,
        item.marca,
        item.modelo,
        item.numero_serie,
        item.estado,
        item.registros ? item.registros.nombre : "Disponible",
        item.proveedores ? item.proveedores.nombre : "N/A",
        item.costo,
        item.fecha_compra
          ? new Date(item.fecha_compra).toLocaleDateString()
          : "N/A",
      ]);
    } else if (activeTab === "software") {
      headers = [
        "ID",
        "Nombre",
        "Version",
        "Stock",
        "Proveedor",
        "Costo",
        "Fecha Compra",
      ];
      rows = items.map((item) => [
        item.id,
        item.nombre,
        item.version,
        item.stock,
        item.proveedores ? item.proveedores.nombre : "N/A",
        item.costo,
        item.fecha_compra
          ? new Date(item.fecha_compra).toLocaleDateString()
          : "N/A",
      ]);
    } else if (activeTab === "perifericos") {
      headers = [
        "ID",
        "Tipo",
        "Marca",
        "Modelo",
        "Numero Serie",
        "Estado",
        "Proveedor",
        "Costo",
        "Fecha Compra",
      ];
      rows = items.map((item) => [
        item.id,
        item.tipo,
        item.marca,
        item.modelo,
        item.numero_serie,
        item.estado,
        item.proveedores ? item.proveedores.nombre : "N/A",
        item.costo,
        item.fecha_compra
          ? new Date(item.fecha_compra).toLocaleDateString()
          : "N/A",
      ]);
    }
    const escapeCSV = (str) => {
      if (str === null || str === undefined) return "";
      const string = String(str);
      if (
        string.includes(",") ||
        string.includes('"') ||
        string.includes("\n")
      ) {
        return `"${string.replace(/"/g, '""')}"`;
      }
      return string;
    };
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map(escapeCSV).join(",")),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      const filename = `inventario_${activeTab}_${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
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
                      <th className="th-cell">Activo</th>
                      <th className="th-cell">Estado</th>
                      <th className="th-cell">Asignado A</th>
                      <th className="relative px-6 py-3"></th>
                    </tr>
                  )}
                  {activeTab === "software" && (
                    <tr>
                      <th className="th-cell">Nombre</th>
                      <th className="th-cell">Versión</th>
                      <th className="th-cell">Stock</th>
                      <th className="relative px-6 py-3"></th>
                    </tr>
                  )}
                  {activeTab === "perifericos" && (
                    <tr>
                      <th className="th-cell">Tipo</th>
                      <th className="th-cell">Marca</th>
                      <th className="th-cell">Modelo</th>
                      <th className="th-cell">Estado</th>
                      <th className="relative px-6 py-3"></th>
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
                              {item.marca} {item.modelo}
                              <p className="text-xs text-gray-500">
                                S/N: {item.numero_serie}
                              </p>
                            </td>
                            <td className="td-cell">{item.estado}</td>
                            <td className="td-cell">
                              {item.registros ? (
                                <span>{item.registros.nombre}</span>
                              ) : (
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                  Disponible
                                </span>
                              )}
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
                            Detalles
                          </button>
                          <button
                            onClick={() => handleEdit(item)}
                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="5"
                        className="text-center py-8 text-gray-500"
                      >
                        No hay registros o no perteneces a una compañía activa.
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
          fetchData(activeTab, searchTerm, currentPage);
        }}
        activeTab={activeTab}
        activeCompanyId={activeCompany?.id}
      />
    </div>
  );
}

export default InventarioPage;
