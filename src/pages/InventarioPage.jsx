// src/pages/InventarioPage.jsx

import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../supabaseClient";
import { useAppContext } from "../context/AppContext";
import Modal from "../components/common/Modal";
import EquipoForm from "../components/forms/EquipoForm";
import SoftwareForm from "../components/forms/SoftwareForm";
import PerifericoForm from "../components/forms/PerifericoForm";
import ConsumibleForm from "../components/forms/ConsumibleForm"; // Importar el nuevo formulario
import AssetDetailModal from "../components/modals/AssetDetailModal";
import ImportCSVModal from "../components/modals/ImportCSVModal";
import Pagination from "../components/common/Pagination";
import SimpleInventoryList from "../components/common/SimpleInventoryList";
import QRScanButton from "../components/qr/QRScanButton";
import QRGeneratorModal from "../components/modals/QRGeneratorModal";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  DocumentArrowUpIcon,
  DocumentArrowDownIcon,
  ComputerDesktopIcon,
  CommandLineIcon,
  CubeIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ArrowPathIcon,
  FunnelIcon,
  Squares2X2Icon,
  ListBulletIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationCircleIcon,
  ArchiveBoxIcon, // Icono para consumibles
} from "@heroicons/react/24/outline";

const ITEMS_PER_PAGE = 10;

function InventarioPage() {
  const { activeCompany, showNotification, showConfirm } = useAppContext();

  const [activeTab, setActiveTab] = useState("equipos");
  const [items, setItems] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewingItem, setViewingItem] = useState(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState("table");
  const [scannedAsset, setScannedAsset] = useState(null);
  const [isQRGeneratorOpen, setIsQRGeneratorOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);

  const fetchData = async (tab, search, page, isRefresh = false) => {
    if (!activeCompany) {
      setLoading(false);
      setItems([]);
      return;
    }

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    const from = (page - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    try {
      const companyId = activeCompany.id;
      let selectString = "*, proveedores(nombre)";

      if (tab === "equipos") {
        selectString = `*, 
                     proveedores(nombre), 
                     registros:registro_id(nombre), 
                     trazabilidad,
                     maintenance_logs!equipo_id(id, fecha, detalle, tecnico, evidencia_url, created_at)`;
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
          consumibles: `nombre.ilike.%${search}%,categoria.ilike.%${search}%`,
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
      setRefreshing(false);
    }
  };

  const handleRefresh = () =>
    fetchData(activeTab, searchTerm, currentPage, true);

  const fetchMaintenanceForEquipo = async (equipoId) => {
    try {
      const { data, error } = await supabase
        .from("maintenance_logs")
        .select(`id, fecha, detalle, tecnico, evidencia_url, created_at`)
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

  // Calcular paginación
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
    if (activeTab === "equipos") {
      const maintenanceLogs = await fetchMaintenanceForEquipo(item.id);
      itemWithMaintenance.maintenance_logs = maintenanceLogs;
    }
    setViewingItem(itemWithMaintenance);
  };

  const handleAssetFoundFromQR = async (asset) => {
    try {
      let itemWithMaintenance = { ...asset };
      if (asset.tipo_activo === "equipos") {
        const maintenanceLogs = await fetchMaintenanceForEquipo(asset.id);
        itemWithMaintenance.maintenance_logs = maintenanceLogs;
      }
      setViewingItem(itemWithMaintenance);
    } catch (e) {
      // fallback simple
      setViewingItem(asset);
    }
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
        // Si es el último elemento de la página y no es la primera página, ir a la anterior
        if (items.length === 1 && currentPage > 1) {
          setCurrentPage(currentPage - 1);
        } else {
          // Recargar la página actual
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
    // Lógica de exportación
  };

  const getTabConfig = () => {
    const configs = {
      equipos: {
        title: "Equipos",
        icon: ComputerDesktopIcon,
        buttonText: "Equipo",
        color: "blue",
      },
      software: {
        title: "Software",
        icon: CommandLineIcon,
        buttonText: "Software",
        color: "green",
      },
      perifericos: {
        title: "Periféricos",
        icon: CubeIcon,
        buttonText: "Periférico",
        color: "purple",
      },
      consumibles: {
        title: "Consumibles",
        icon: ArchiveBoxIcon,
        buttonText: "Consumible",
        color: "amber",
      },
    };
    return configs[activeTab] || configs.equipos;
  };

  const getStatusBadge = (estado) => {
    const statusConfig = {
      Activo: { color: "green", icon: CheckCircleIcon },
      Inactivo: { color: "red", icon: XCircleIcon },
      Mantenimiento: { color: "yellow", icon: ExclamationCircleIcon },
      Disponible: { color: "green", icon: CheckCircleIcon },
    };

    const config = statusConfig[estado] || {
      color: "gray",
      icon: ExclamationCircleIcon,
    };
    const Icon = config.icon;

    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium
        ${
          config.color === "green"
            ? "bg-green-50 text-green-700 border border-green-200"
            : ""
        }
        ${
          config.color === "red"
            ? "bg-red-50 text-red-700 border border-red-200"
            : ""
        }
        ${
          config.color === "yellow"
            ? "bg-yellow-50 text-yellow-700 border border-yellow-200"
            : ""
        }
        ${
          config.color === "gray"
            ? "bg-gray-50 text-gray-700 border border-gray-200"
            : ""
        }
      `}
      >
        <Icon className="w-3 h-3" />
        {estado}
      </span>
    );
  };

  const LoadingSkeleton = () => (
    <div className="space-y-4">
      {[...Array(ITEMS_PER_PAGE)].map((_, index) => (
        <div
          key={index}
          className="animate-pulse bg-white rounded-lg border border-gray-200 p-4"
        >
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/3"></div>
            </div>
            <div className="flex space-x-2">
              <div className="w-16 h-8 bg-gray-200 rounded"></div>
              <div className="w-16 h-8 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const EmptyState = () => {
    const config = getTabConfig();
    const Icon = config.icon;

    return (
      <div className="text-center py-16">
        <div
          className={`mx-auto w-24 h-24 bg-${config.color}-50 rounded-full flex items-center justify-center mb-6`}
        >
          <Icon className={`w-12 h-12 text-${config.color}-400`} />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {searchTerm
            ? "No se encontraron resultados"
            : `No hay ${config.title.toLowerCase()}`}
        </h3>
        <p className="text-gray-500 mb-6 max-w-md mx-auto">
          {searchTerm
            ? `No encontramos ${config.title.toLowerCase()} que coincidan con "${searchTerm}".`
            : `Comienza agregando ${config.title.toLowerCase()} a tu inventario.`}
        </p>
        {!searchTerm && (
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleAddNew}
              className={`btn-primary inline-flex items-center gap-2`}
            >
              <PlusIcon className="w-5 h-5" />
              Añadir {config.buttonText}
            </button>
          </div>
        )}
      </div>
    );
  };

  const TableView = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
            {activeTab === "equipos" && (
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Activo
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Asignado A
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Proveedor
                </th>
                <th className="relative px-6 py-4">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            )}
            {activeTab === "software" && (
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Software
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Versión
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Proveedor
                </th>
                <th className="relative px-6 py-4">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            )}
            {activeTab === "perifericos" && (
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Periférico
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Marca
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Proveedor
                </th>
                <th className="relative px-6 py-4">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            )}
            {activeTab === "consumibles" && (
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Consumible
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Categoría
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Proveedor
                </th>
                <th className="relative px-6 py-4">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            )}
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map((item, index) => (
              <tr
                key={item.id}
                className={`hover:bg-gray-50 transition-colors duration-200 ${
                  index % 2 === 0 ? "bg-white" : "bg-gray-25"
                }`}
              >
                {activeTab === "equipos" && (
                  <>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-12 w-12">
                          <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                            <ComputerDesktopIcon className="h-6 w-6 text-blue-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-semibold text-gray-900">
                            {item.marca} {item.modelo}
                          </div>
                          <div className="text-xs text-gray-500">
                            S/N: {item.numero_serie}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(item.estado)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.registros ? (
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8 bg-indigo-100 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-indigo-800">
                              {item.registros.nombre.charAt(0)}
                            </span>
                          </div>
                          <span className="ml-2">{item.registros.nombre}</span>
                        </div>
                      ) : (
                        getStatusBadge("Disponible")
                      )}
                    </td>
                  </>
                )}
                {activeTab === "software" && (
                  <>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-12 w-12">
                          <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                            <CommandLineIcon className="h-6 w-6 text-green-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-semibold text-gray-900">
                            {item.nombre}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-md">
                        v{item.version}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="font-semibold">{item.stock}</span>{" "}
                      licencias
                    </td>
                  </>
                )}
                {activeTab === "perifericos" && (
                  <>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-12 w-12">
                          <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
                            <CubeIcon className="h-6 w-6 text-purple-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-semibold text-gray-900">
                            {item.tipo}
                          </div>
                          <div className="text-xs text-gray-500">
                            {item.modelo}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.marca}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(item.estado)}
                    </td>
                  </>
                )}
                {activeTab === "consumibles" && (
                  <>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-12 w-12 rounded-lg bg-amber-100 flex items-center justify-center">
                          <ArchiveBoxIcon className="h-6 w-6 text-amber-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-semibold text-gray-900">
                            {item.nombre}
                          </div>
                          <div className="text-xs text-gray-500">
                            ID: {item.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.categoria || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span
                        className={`font-semibold ${
                          item.cantidad <= item.stock_minimo
                            ? "text-red-600"
                            : "text-gray-900"
                        }`}
                      >
                        {item.cantidad}
                      </span>
                      <span className="text-xs text-gray-500">
                        {" "}
                        (min: {item.stock_minimo})
                      </span>
                    </td>
                  </>
                )}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {item.proveedores?.nombre || "N/A"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    {activeTab !== "consumibles" && (
                      <button
                        onClick={() => handleViewDetails(item)}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-200"
                        title="Ver detalles"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(item)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                      title="Editar"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
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
    </div>
  );

  const config = getTabConfig();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Gestión de Inventario TIC
              </h1>
              <p className="text-gray-600">
                {activeCompany
                  ? `Empresa: ${activeCompany.name}`
                  : "Selecciona una empresa"}
                {totalItems > 0 &&
                  ` • ${totalItems} elemento${totalItems !== 1 ? "s" : ""}`}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <QRScanButton
                className="w-full sm:w-auto"
                onAssetFound={handleAssetFoundFromQR}
              />
              <button
                onClick={() => setIsQRGeneratorOpen(true)}
                className="btn-secondary inline-flex items-center justify-center gap-2"
              >
                Generar QR
              </button>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="btn-secondary inline-flex items-center justify-center gap-2"
              >
                <ArrowPathIcon
                  className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`}
                />
                {refreshing ? "Actualizando..." : "Actualizar"}
              </button>
              <button
                onClick={handleImportCSV}
                className="btn-success inline-flex items-center justify-center gap-2"
              >
                <DocumentArrowUpIcon className="w-5 h-5" />
                Importar
              </button>
              <button
                onClick={handleExportCSV}
                className="btn-secondary inline-flex items-center justify-center gap-2"
              >
                <DocumentArrowDownIcon className="w-5 h-5" />
                Exportar
              </button>
              <button
                onClick={handleAddNew}
                className="btn-primary inline-flex items-center justify-center gap-2"
              >
                <PlusIcon className="w-5 h-5" />
                Añadir {config.buttonText}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-8">
        {/* Tabs */}
        <div className="mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1">
            <nav className="flex space-x-1">
              {["equipos", "software", "perifericos", "consumibles"].map(
                (tab) => {
                  const tabConfig = {
                    equipos: { title: "Equipos", icon: ComputerDesktopIcon },
                    software: { title: "Software", icon: CommandLineIcon },
                    perifericos: { title: "Periféricos", icon: CubeIcon },
                    consumibles: {
                      title: "Consumibles",
                      icon: ArchiveBoxIcon,
                    },
                  };
                  const TabIcon = tabConfig[tab].icon;

                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                        activeTab === tab
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      <TabIcon className="w-4 h-4" />
                      {tabConfig[tab].title}
                    </button>
                  );
                }
              )}
            </nav>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="search"
              placeholder={`Buscar ${config.title.toLowerCase()}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg bg-white 
                       placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 
                       focus:border-transparent transition-all duration-200 text-sm shadow-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                setViewMode(viewMode === "table" ? "cards" : "table")
              }
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title={`Cambiar a vista ${
                viewMode === "table" ? "tarjetas" : "tabla"
              }`}
            >
              {viewMode === "table" ? (
                <Squares2X2Icon className="w-5 h-5" />
              ) : (
                <ListBulletIcon className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        {error ? (
          <div className="bg-white rounded-xl shadow-sm border border-red-200 p-16 text-center">
            <div className="mx-auto w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-6">
              <XCircleIcon className="w-12 h-12 text-red-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Error al cargar datos
            </h3>
            <p className="text-gray-500 mb-6">{error}</p>
            <button onClick={handleRefresh} className="btn-primary">
              Reintentar
            </button>
          </div>
        ) : loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <LoadingSkeleton />
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <EmptyState />
          </div>
        ) : (
          <>
            {viewMode === "table" ? (
              <TableView />
            ) : (
              <SimpleInventoryList
                items={items}
                onView={handleViewDetails}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onSelect={(item) => {
                  const isSelected = selectedItems.includes(item.id);
                  if (isSelected) {
                    setSelectedItems(selectedItems.filter(id => id !== item.id));
                  } else {
                    setSelectedItems([...selectedItems, item.id]);
                  }
                }}
                selectedItems={selectedItems}
                loading={loading}
                error={error}
                emptyMessage={`No hay ${config.title.toLowerCase()} para mostrar`}
              />
            )}
            
            {/* Paginación - se muestra siempre que haya más de una página */}
            {totalPages > 1 && (
              <div className="mt-8">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={(page) => setCurrentPage(page)}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={`${editingItem ? "Editar" : "Añadir"} ${config.buttonText}`}
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
        {activeTab === "consumibles" && (
          <ConsumibleForm itemToEdit={editingItem} onSuccess={handleSuccess} />
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

      <QRGeneratorModal
        isOpen={isQRGeneratorOpen}
        onClose={() => setIsQRGeneratorOpen(false)}
        assets={items}
        activeTab={activeTab}
      />
    </div>
  );
}

export default InventarioPage;
