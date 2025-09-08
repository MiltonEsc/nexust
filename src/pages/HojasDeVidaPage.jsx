// src/pages/HojasDeVidaPage.jsx

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAppContext } from "../context/AppContext";
import UserCard from "../components/UserCard";
import UserDetailModal from "../components/modals/UserDetailModal";
import Pagination from "../components/common/Pagination";
import ImportCSVModal from "../components/modals/ImportCSVModal";
import QRScanButton from "../components/qr/QRScanButton";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  DocumentArrowUpIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

const ITEMS_PER_PAGE = 9;

function HojasDeVidaPage() {
  const { activeCompany } = useAppContext();
  const navigate = useNavigate();

  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewingUser, setViewingUser] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [scannedAsset, setScannedAsset] = useState(null);

  const fetchRegistros = async (page, search, isRefresh = false) => {
    if (!activeCompany) {
      setLoading(false);
      return;
    }

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
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
      setRefreshing(false);
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
  const handleRefresh = () => fetchRegistros(currentPage, searchTerm, true);

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  const handleAssetFoundFromQR = (asset) => {
    // Si el QR corresponde a un equipo, podríamos filtrar y resaltar al usuario asignado
    if (asset.tipo_activo === "equipos" && asset.registros?.nombre) {
      setSearchTerm(asset.registros.nombre);
    }
  };

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(ITEMS_PER_PAGE)].map((_, index) => (
        <div key={index} className="animate-pulse">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 rounded"></div>
              <div className="h-3 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  // Empty state component
  const EmptyState = () => (
    <div className="text-center py-16">
      <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
        <UserGroupIcon className="w-12 h-12 text-gray-400" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        {searchTerm ? "No se encontraron resultados" : "No hay hojas de vida"}
      </h3>
      <p className="text-gray-500 mb-6 max-w-md mx-auto">
        {searchTerm
          ? `No encontramos hojas de vida que coincidan con "${searchTerm}". Intenta con otros términos de búsqueda.`
          : "Comienza agregando hojas de vida a tu base de datos o importa un archivo CSV con la información."}
      </p>
      {!searchTerm && (
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => navigate("/hojas-de-vida/nuevo")}
            className="btn-primary inline-flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            Añadir Registro
          </button>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="btn-success inline-flex items-center gap-2"
          >
            <DocumentArrowUpIcon className="w-5 h-5" />
            Importar CSV
          </button>
        </div>
      )}
    </div>
  );

  // Error state component
  const ErrorState = () => (
    <div className="text-center py-16">
      <div className="mx-auto w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-6">
        <ExclamationTriangleIcon className="w-12 h-12 text-red-500" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        Error al cargar los datos
      </h3>
      <p className="text-gray-500 mb-6 max-w-md mx-auto">
        Ocurrió un error al intentar cargar las hojas de vida: {error}
      </p>
      <button
        onClick={handleRefresh}
        className="btn-primary inline-flex items-center gap-2"
      >
        <ArrowPathIcon className="w-5 h-5" />
        Intentar de nuevo
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Gestión de Hojas de Vida
              </h1>
              <p className="text-gray-600">
                {activeCompany
                  ? `Empresa: ${activeCompany.name}`
                  : "Selecciona una empresa"}
                {totalItems > 0 &&
                  ` • ${totalItems} registro${
                    totalItems !== 1 ? "s" : ""
                  } total${totalItems !== 1 ? "es" : ""}`}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <QRScanButton
                className="w-full sm:w-auto"
                onAssetFound={handleAssetFoundFromQR}
              />
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="btn-secondary inline-flex items-center justify-center gap-2 lg:w-auto"
              >
                <ArrowPathIcon
                  className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`}
                />
                {refreshing ? "Actualizando..." : "Actualizar"}
              </button>
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="btn-success inline-flex items-center justify-center gap-2 lg:w-auto"
              >
                <DocumentArrowUpIcon className="w-5 h-5" />
                Importar CSV
              </button>
              <button
                onClick={() => navigate("/hojas-de-vida/nuevo")}
                className="btn-primary inline-flex items-center justify-center gap-2 lg:w-auto"
              >
                <PlusIcon className="w-5 h-5" />
                Añadir Registro
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-8">
        {/* Search Section */}
        <div className="mb-8">
          <div className="relative max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="search"
              placeholder="Buscar por nombre, cargo o cédula..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg 
                       bg-white placeholder-gray-500 focus:outline-none focus:ring-2 
                       focus:ring-blue-500 focus:border-transparent transition-all duration-200
                       text-sm shadow-sm"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 
                         hover:text-gray-600 transition-colors"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {error ? (
            <ErrorState />
          ) : loading ? (
            <div className="p-6">
              <LoadingSkeleton />
            </div>
          ) : registros.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="p-6">
              {/* Results Header */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Resultados
                  </h2>
                  {searchTerm && (
                    <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                      "{searchTerm}"
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1} -{" "}
                  {Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} de{" "}
                  {totalItems}
                </p>
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {registros.map((registro) => (
                  <UserCard
                    key={registro.id}
                    registro={registro}
                    onDelete={handleDelete}
                    onEdit={handleEdit}
                    onViewDetails={handleViewDetails}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="border-t border-gray-100 pt-6">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={(page) => setCurrentPage(page)}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
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
