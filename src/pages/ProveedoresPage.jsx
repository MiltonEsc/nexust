// src/pages/ProveedoresPage.jsx

import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import Modal from "../components/common/Modal";
import ProveedorForm from "../components/forms/ProveedorForm";

function ProveedoresPage() {
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [activeCompanyId, setActiveCompanyId] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      let companyId = activeCompanyId;
      if (!companyId) {
        const { data: companies } = await supabase
          .from("company_users")
          .select("company_id")
          .limit(1);
        if (companies && companies.length > 0) {
          companyId = companies[0].company_id;
          setActiveCompanyId(companyId);
        } else {
          throw new Error("Usuario sin compañía activa.");
        }
      }
      const { data, error } = await supabase
        .from("proveedores")
        .select("*")
        .eq("company_id", companyId);
      if (error) throw error;
      setProveedores(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
    fetchData();
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Seguro que quieres eliminar este proveedor?")) {
      const { error } = await supabase
        .from("proveedores")
        .delete()
        .eq("id", id);
      if (error) alert(error.message);
      else fetchData();
    }
  };

  return (
    <div className="p-6 sm:p-8 bg-white rounded-xl shadow-lg max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Proveedores</h1>
        <button onClick={handleAddNew} className="btn-primary">
          Añadir Proveedor
        </button>
      </div>
      {loading && <p>Cargando...</p>}
      {error && <p className="text-red-600">{error}</p>}
      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="th-cell">Nombre</th>
                <th className="th-cell">Contacto</th>
                <th className="th-cell">Teléfono</th>
                <th className="th-cell">Email</th>
                <th className="relative px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {proveedores.map((p) => (
                <tr key={p.id}>
                  <td className="td-cell font-medium">{p.nombre}</td>
                  <td className="td-cell">{p.contacto}</td>
                  <td className="td-cell">{p.telefono}</td>
                  <td className="td-cell">{p.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(p)}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingItem ? "Editar Proveedor" : "Nuevo Proveedor"}
      >
        <ProveedorForm
          itemToEdit={editingItem}
          onSuccess={handleSuccess}
          activeCompanyId={activeCompanyId}
        />
      </Modal>
    </div>
  );
}

export default ProveedoresPage;
