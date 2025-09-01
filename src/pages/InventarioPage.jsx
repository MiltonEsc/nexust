import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import Modal from "../components/common/Modal";
import EquipoForm from "../components/forms/EquipoForm";
import SoftwareForm from "../components/forms/SoftwareForm";
import PerifericoForm from "../components/forms/PerifericoForm";

function InventarioPage() {
  const [activeTab, setActiveTab] = useState("equipos");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [activeCompanyId, setActiveCompanyId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchData = async (tab, search) => {
    setLoading(true);
    setError(null);
    setItems([]);
    try {
      let companyId = activeCompanyId;
      if (!companyId) {
        const { data: companies, error: companyError } = await supabase
          .from("company_users")
          .select("company_id")
          .eq("status", "accepted")
          .limit(1);
        if (companyError) throw companyError;
        if (companies && companies.length > 0) {
          companyId = companies[0].company_id;
          setActiveCompanyId(companyId);
        } else {
          throw new Error("El usuario no pertenece a ninguna compañía activa.");
        }
      }

      // Añadimos la relación con 'registros' solo para la pestaña de 'equipos'
      const selectString = tab === "equipos" ? "*, registros(nombre)" : "*";
      let query = supabase
        .from(tab)
        .select(selectString)
        .eq("company_id", companyId);

      if (search) {
        const searchColumns = {
          equipos: `marca.ilike.%${search}%,modelo.ilike.%${search}%,numero_serie.ilike.%${search}%`,
          software: `nombre.ilike.%${search}%,version.ilike.%${search}%`,
          perifericos: `tipo.ilike.%${search}%,marca.ilike.%${search}%,modelo.ilike.%${search}%`,
        };
        query = query.or(searchColumns[tab]);
      }

      const { data, error } = await query;
      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(activeTab, searchTerm);
  }, [activeTab, searchTerm]);

  // --- Handlers ---
  const handleAddNew = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };
  const handleEdit = (item) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };
  const handleCloseModal = () => setIsModalOpen(false);
  const handleSuccess = () => {
    handleCloseModal();
    fetchData(activeTab, searchTerm);
  };
  const handleDelete = async (idToDelete) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar este ítem?")) {
      const { error } = await supabase
        .from(activeTab)
        .delete()
        .eq("id", idToDelete);
      if (error) {
        alert(error.message);
      } else {
        fetchData(activeTab, searchTerm);
      }
    }
  };

  const handleImportCSV = () =>
    alert(`Funcionalidad para Importar CSV de '${activeTab}' no implementada.`);
  const handleExportCSV = () =>
    alert(`Funcionalidad para Exportar CSV de '${activeTab}' no implementada.`);

  // --- Funciones auxiliares ---
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
        {/* --- SECCIÓN DE BOTONES COMPLETA --- */}
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
                              item.registros.nombre
                            ) : (
                              <span className="text-green-600">Disponible</span>
                            )}
                          </td>
                        </>
                      )}
                      {activeTab === "software" && (
                        <>
                          <td className="td-cell font-medium">{item.nombre}</td>
                          <td className="td-cell">{item.version}</td>
                          <td className="td-cell">{item.stock}</td>
                        </>
                      )}
                      {activeTab === "perifericos" && (
                        <>
                          <td className="td-cell font-medium">{item.tipo}</td>
                          <td className="td-cell">{item.marca}</td>
                          <td className="td-cell">{item.modelo}</td>
                        </>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() =>
                            alert(`Detalles de ${item.id} no implementado`)
                          }
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
                    <td colSpan="5" className="text-center py-8 text-gray-500">
                      No hay registros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={getModalTitle()}
      >
        {activeTab === "equipos" && (
          <EquipoForm
            itemToEdit={editingItem}
            onSuccess={handleSuccess}
            activeCompanyId={activeCompanyId}
          />
        )}
        {activeTab === "software" && (
          <SoftwareForm
            itemToEdit={editingItem}
            onSuccess={handleSuccess}
            activeCompanyId={activeCompanyId}
          />
        )}
        {activeTab === "perifericos" && (
          <PerifericoForm
            itemToEdit={editingItem}
            onSuccess={handleSuccess}
            activeCompanyId={activeCompanyId}
          />
        )}
      </Modal>
    </div>
  );
}

export default InventarioPage;
