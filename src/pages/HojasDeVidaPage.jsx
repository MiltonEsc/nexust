// src/pages/HojasDeVidaPage.jsx

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAppContext } from "../context/AppContext";
import UserCard from "../components/UserCard";
import UserDetailModal from "../components/modals/UserDetailModal";
import Pagination from "../components/common/Pagination";
import ImportCSVModal from "../components/modals/ImportCSVModal";

const ITEMS_PER_PAGE = 9;

function HojasDeVidaPage() {
  const { activeCompany } = useAppContext();
  const navigate = useNavigate();

  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewingUser, setViewingUser] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const fetchRegistros = async (page, search) => {
    if (!activeCompany) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [registrosRes, countRes] = await Promise.all([
        supabase.rpc("get_registros_paginated_and_filtered", {
          p_company_id: activeCompany.id,
          p_search_term: search,
          p_page_number: page,
          p_page_size: ITEMS_PER_PAGE,
        }),
        supabase.rpc("get_registros_count", {
          p_company_id: activeCompany.id,
          p_search_term: search,
        }),
      ]);

      if (registrosRes.error) throw registrosRes.error;
      if (countRes.error) throw countRes.error;

      setRegistros(registrosRes.data || []);
      setTotalItems(countRes.data || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistros(currentPage, searchTerm);
  }, [currentPage, searchTerm, activeCompany]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleDelete = async (idToDelete) => {
    if (
      window.confirm("¿Estás seguro de que quieres eliminar esta hoja de vida?")
    ) {
      try {
        const { error } = await supabase
          .from("registros")
          .delete()
          .eq("id", idToDelete);
        if (error) throw error;
        fetchRegistros(currentPage, searchTerm);
      } catch (err) {
        alert(`Error al eliminar: ${err.message}`);
      }
    }
  };

  const handleEdit = (registro) =>
    navigate(`/hojas-de-vida/editar/${registro.id}`);
  const handleViewDetails = (registro) => setViewingUser(registro);

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  // ▼▼▼ CORRECCIÓN APLICADA AQUÍ ▼▼▼
  // Ya no hacemos un return temprano para el estado de carga.
  // Lo manejaremos dentro del JSX.

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold">Hojas de Vida</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="btn-success text-sm"
          >
            Importar CSV
          </button>
          <button
            onClick={() => navigate("/hojas-de-vida/nuevo")}
            className="btn-primary"
          >
            Añadir Registro
          </button>
        </div>
      </div>

      <div className="mb-6">
        <input
          type="search"
          placeholder="Buscar por nombre, cargo o cédula..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-style w-full md:w-1/3"
        />
      </div>

      {/* --- NUEVA LÓGICA PARA MOSTRAR ESTADOS DE CARGA Y ERROR --- */}
      {error && <p className="p-4 text-center text-red-600">Error: {error}</p>}

      {loading && <p className="p-4 text-center">Cargando hojas de vida...</p>}

      {!loading && !error && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {registros.length > 0 ? (
              registros.map((registro) => (
                <UserCard
                  key={registro.id}
                  registro={registro}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                  onViewDetails={handleViewDetails}
                />
              ))
            ) : (
              <p className="md:col-span-2 lg:col-span-3 text-center text-gray-500 py-8">
                No se encontraron hojas de vida.
              </p>
            )}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(page) => setCurrentPage(page)}
          />
        </>
      )}

      <UserDetailModal
        registro={viewingUser}
        onClose={() => setViewingUser(null)}
      />

      <ImportCSVModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          setIsImportModalOpen(false);
          fetchRegistros(1, "");
          setCurrentPage(1);
          setSearchTerm("");
        }}
        activeTab="registros"
        activeCompanyId={activeCompany?.id}
      />
    </div>
  );
}

export default HojasDeVidaPage;
