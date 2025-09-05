// src/pages/ProveedoresPage.jsx

import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useAppContext } from "../context/AppContext";
import Modal from "../components/common/Modal";
import ProveedorForm from "../components/forms/ProveedorForm";
import Pagination from "../components/common/Pagination";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  BuildingOffice2Icon,
} from "@heroicons/react/24/outline";

const ITEMS_PER_PAGE = 10;

function ProveedoresPage() {
  const { activeCompany } = useAppContext();
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const fetchData = async (page) => {
    if (!activeCompany) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    const from = (page - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    try {
      const { data, error, count } = await supabase
        .from("proveedores")
        .select("*", { count: "exact" })
        .eq("company_id", activeCompany.id)
        .range(from, to);

      if (error) throw error;
      setProveedores(data || []);
      setTotalItems(count || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(currentPage);
  }, [currentPage, activeCompany]);

  const handleSuccess = () => {
    handleCloseModal();
    if (!editingItem) {
      setCurrentPage(1);
    }
    fetchData(editingItem ? currentPage : 1);
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Seguro que quieres eliminar este proveedor?")) {
      const { error } = await supabase
        .from("proveedores")
        .delete()
        .eq("id", id);
      if (error) alert(error.message);
      else fetchData(currentPage);
    }
  };

  const handleAddNew = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };
  const handleEdit = (item) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };
  const handleCloseModal = () => setIsModalOpen(false);

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
          <div className="h-4 bg-gray-200 rounded w-1/6"></div>
          <div className="h-4 bg-gray-200 rounded w-1/6"></div>
          <div className="h-4 bg-gray-200 rounded w-1/6"></div>
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
                Gestión de Proveedores
              </h1>
              <p className="text-gray-600 mt-1">
                Administra tus proveedores y su información de contacto.
              </p>
            </div>
            <button
              onClick={handleAddNew}
              className="btn-primary inline-flex items-center gap-2"
            >
              <PlusIcon className="w-5 h-5" />
              Añadir Proveedor
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
                      Nombre
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Contacto
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Teléfono
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="relative px-6 py-4">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {proveedores.map((p, index) => (
                    <tr
                      key={p.id}
                      className={`hover:bg-gray-50 transition-colors duration-200 ${
                        index % 2 === 0 ? "bg-white" : "bg-gray-25"
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-12 w-12 rounded-lg bg-indigo-100 flex items-center justify-center">
                            <BuildingOffice2Icon className="h-6 w-6 text-indigo-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-semibold text-gray-900">
                              {p.nombre}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                        {p.contacto}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                        {p.telefono}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                        {p.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleEdit(p)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                            title="Editar"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                            title="Eliminar"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
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

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingItem ? "Editar Proveedor" : "Nuevo Proveedor"}
      >
        <ProveedorForm
          itemToEdit={editingItem}
          onSuccess={handleSuccess}
          activeCompanyId={activeCompany?.id}
        />
      </Modal>
    </div>
  );
}

export default ProveedoresPage;
