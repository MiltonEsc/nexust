import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../supabaseClient";
import { useAppContext } from "../context/AppContext";

import Modal from "../components/common/Modal";
import AddPurchaseForm from "../components/forms/AddPurchaseForm";
import ImportCSVModal from "../components/modals/ImportCSVModal";

function ComprasPage() {
    const { activeCompany, showConfirm, showNotification } = useAppContext();
    const [compras, setCompras] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [filters, setFilters] = useState({
        proveedor: "",
        area: "",
        fechaDesde: "",
        fechaHasta: ""
    });
    const [columnVisibility, setColumnVisibility] = useState({ compras: {} });
    const [sortState, setSortState] = useState([]);
    const [compactMode, setCompactMode] = useState(false);
    const [selectedItems, setSelectedItems] = useState([]);

    useEffect(() => {
        if (activeCompany) {
            fetchCompras();
        }
    }, [activeCompany]);

    useEffect(() => {
        setSelectedItems([]);
    }, [searchTerm, filters]);

    const fetchCompras = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("compras")
            .select("*")
            .eq("company_id", activeCompany.id)
            .order("fecha_ingreso", { ascending: false });

        if (error) {
            console.error("Error fetching compras:", error);
        } else {
            setCompras(data || []);
        }
        setLoading(false);
    };


    const columnConfig = useMemo(() => ([
        { key: "id", label: "ID", sortable: true },
        { key: "fecha", label: "Fecha Ingreso", sortable: true },
        { key: "descripcion", label: "Descripcion", sortable: true },
        { key: "cantidad", label: "Cant.", sortable: true },
        { key: "stock", label: "Stock", sortable: true },
        { key: "marca_modelo", label: "Marca/Modelo", sortable: true },
        { key: "serial", label: "Serial", sortable: true },
        { key: "proveedor", label: "Proveedor", sortable: true },
        { key: "orden", label: "# Compra", sortable: true },
        { key: "destino", label: "Destino/Usuario", sortable: true },
        { key: "valor", label: "Valor", sortable: true },
        { key: "vida_util", label: "Vida Util", sortable: true }
    ]), []);

    useEffect(() => {
        if (Object.keys(columnVisibility.compras || {}).length > 0) return;
        const defaults = {};
        columnConfig.forEach(col => { defaults[col.key] = true; });
        setColumnVisibility(prev => ({ ...prev, compras: defaults }));
    }, [columnConfig]);

    const visibleColumns = useMemo(() => {
        const visibility = columnVisibility.compras || {};
        return columnConfig.filter(col => {
            if (col.key == "id" || col.key == "descripcion") return true;
            return visibility[col.key] != false;
        });
    }, [columnConfig, columnVisibility]);

    const getSortValue = (compra, key) => {
        switch (key) {
            case "id": return compra.id || 0;
            case "fecha": return compra.fecha_ingreso || "";
            case "descripcion": return compra.descripcion || "";
            case "cantidad": return compra.cantidad || 0;
            case "stock": return compra.cantidad_stock || 0;
            case "marca_modelo": return `${compra.marca || ""} ${compra.modelo || ""}`.trim();
            case "serial": return compra.serial || "";
            case "proveedor": return compra.proveedor || "";
            case "orden": return compra.orden_compra || "";
            case "destino": return `${compra.area_destino || ""} ${compra.usuario_asignado || ""}`.trim();
            case "valor": return compra.valor || 0;
            case "vida_util": return compra.vida_util || 0;
            default: return "";
        }
    };

    const filteredCompras = useMemo(() => {
        const search = searchTerm.trim().toLowerCase();
        return (compras || []).filter(compra => {
            if (filters.proveedor && !(compra.proveedor || "").toLowerCase().includes(filters.proveedor.toLowerCase())) return false;
            if (filters.area && !(compra.area_destino || "").toLowerCase().includes(filters.area.toLowerCase())) return false;
            if (filters.fechaDesde && (!compra.fecha_ingreso || compra.fecha_ingreso < filters.fechaDesde)) return false;
            if (filters.fechaHasta && (!compra.fecha_ingreso || compra.fecha_ingreso > filters.fechaHasta)) return false;
            if (!search) return true;
            const haystack = [
                compra.descripcion,
                compra.marca,
                compra.modelo,
                compra.serial,
                compra.proveedor,
                compra.usuario_asignado,
                compra.area_destino,
                compra.orden_compra
            ].join(" ").toLowerCase();
            return haystack.includes(search);
        });
    }, [compras, searchTerm, filters]);

    const sortedCompras = useMemo(() => {
        if (!sortState.length) return filteredCompras;
        const sorted = [...filteredCompras];
        sorted.sort((a, b) => {
            for (const sort of sortState) {
                const aVal = getSortValue(a, sort.key);
                const bVal = getSortValue(b, sort.key);
                if (aVal < bVal) return sort.direction === "asc" ? -1 : 1;
                if (aVal > bVal) return sort.direction === "asc" ? 1 : -1;
            }
            return 0;
        });
        return sorted;
    }, [filteredCompras, sortState]);

    const toggleSort = (key, isMulti) => {
        setSortState(prev => {
            const existing = prev.find(s => s.key === key);
            if (isMulti) {
                if (!existing) return [...prev, { key, direction: "asc" }];
                if (existing.direction === "asc") {
                    return prev.map(s => s.key === key ? { ...s, direction: "desc" } : s);
                }
                return prev.filter(s => s.key !== key);
            }
            if (!existing) return [{ key, direction: "asc" }];
            if (existing.direction === "asc") return [{ key, direction: "desc" }];
            return [];
        });
    };

    const handleBulkDelete = () => {
        if (selectedItems.length === 0) return;
        const deleteAction = async () => {
            const { error } = await supabase
                .from("compras")
                .delete()
                .in("id", selectedItems);
            if (error) {
                showNotification(error.message, "error");
                return;
            }
            showNotification("Items eliminados correctamente.", "success");
            setSelectedItems([]);
            fetchCompras();
        };

        showConfirm(
            "Confirmar Eliminacion",
            `Vas a eliminar ${selectedItems.length} items. Esta accion no se puede deshacer.`,
            deleteAction
        );
    };

    const handleExportSelected = () => {
        if (selectedItems.length === 0) {
            showNotification("No hay items seleccionados para exportar.", "info");
            return;
        }
        const rows = sortedCompras.filter(item => selectedItems.includes(item.id));
        const headers = visibleColumns.map(col => col.label);
        const csvRows = [headers.join(",")];

        rows.forEach(item => {
            const values = visibleColumns.map(col => {
                const value = getSortValue(item, col.key);
                const safe = String(value ?? "").replace(/"/g, '""');
                return `"${safe}"`;
            });
            csvRows.push(values.join(","));
        });

        const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "compras_seleccion.csv";
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Compras TIC</h1>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowImportModal(true)}
                        className="btn-secondary"
                    >
                        Importar CSV
                    </button>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="btn-primary"
                    >
                        + Agregar Compra
                    </button>
                </div>
            </div>

            
            <div className="mb-4 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                <div className="relative flex-1 max-w-md">
                    <input
                        type="search"
                        placeholder="Buscar compras..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="block w-full pl-3 pr-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setCompactMode(!compactMode)}
                        className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                            compactMode
                                ? "bg-gray-900 text-white border-gray-900"
                                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-100"
                        }`}
                    >
                        {compactMode ? "Compacto" : "Comodo"}
                    </button>
                </div>
            </div>

            <div className="mb-6 bg-white border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Proveedor</label>
                        <input
                            type="text"
                            value={filters.proveedor}
                            onChange={(e) => setFilters(prev => ({ ...prev, proveedor: e.target.value }))}
                            className="w-full px-3 py-2 border rounded-md text-sm bg-white"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Area destino</label>
                        <input
                            type="text"
                            value={filters.area}
                            onChange={(e) => setFilters(prev => ({ ...prev, area: e.target.value }))}
                            className="w-full px-3 py-2 border rounded-md text-sm bg-white"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha desde</label>
                        <input
                            type="date"
                            value={filters.fechaDesde}
                            onChange={(e) => setFilters(prev => ({ ...prev, fechaDesde: e.target.value }))}
                            className="w-full px-3 py-2 border rounded-md text-sm bg-white"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha hasta</label>
                        <input
                            type="date"
                            value={filters.fechaHasta}
                            onChange={(e) => setFilters(prev => ({ ...prev, fechaHasta: e.target.value }))}
                            className="w-full px-3 py-2 border rounded-md text-sm bg-white"
                        />
                    </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                    <span className="text-xs font-semibold text-gray-600">Columnas:</span>
                    {columnConfig.map(col => (
                        <label key={col.key} className="flex items-center gap-2 text-xs text-gray-700">
                            <input
                                type="checkbox"
                                disabled={col.key === "id" || col.key === "descripcion"}
                                checked={columnVisibility.compras?.[col.key] !== false}
                                onChange={(e) => {
                                    setColumnVisibility(prev => ({
                                        ...prev,
                                        compras: { ...prev.compras, [col.key]: e.target.checked }
                                    }));
                                }}
                            />
                            {col.label}
                        </label>
                    ))}
                </div>
            </div>

            {selectedItems.length > 0 && (
                <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm text-blue-900 font-semibold">{selectedItems.length} seleccionados</div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleExportSelected}
                            className="px-3 py-2 rounded-md bg-white border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50"
                        >
                            Exportar seleccion
                        </button>
                        <button
                            onClick={handleBulkDelete}
                            className="px-3 py-2 rounded-md bg-red-600 text-white text-sm font-semibold hover:bg-red-700"
                        >
                            Eliminar seleccion
                        </button>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-20">
                                <input
                                    type="checkbox"
                                    checked={sortedCompras.length > 0 && sortedCompras.every(c => selectedItems.includes(c.id))}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedItems(sortedCompras.map(c => c.id));
                                        } else {
                                            setSelectedItems([]);
                                        }
                                    }}
                                />
                            </th>
                            {visibleColumns.map(col => {
                                const sortInfo = sortState.find(s => s.key === col.key);
                                const stickyClass = col.key === "id"
                                    ? "sticky left-10 bg-gray-50 z-20"
                                    : col.key === "descripcion"
                                        ? "sticky left-28 bg-gray-50 z-20"
                                        : "";
                                return (
                                    <th
                                        key={col.key}
                                        className={`px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider ${stickyClass} ${
                                            col.sortable ? "cursor-pointer select-none" : ""
                                        }`}
                                        onClick={(e) => col.sortable && toggleSort(col.key, e.shiftKey)}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span>{col.label}</span>
                                            {sortInfo && (
                                                <span className="text-[10px]">{sortInfo.direction === "asc" ? "ASC" : "DESC"}</span>
                                            )}
                                        </div>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr>
                                <td colSpan={visibleColumns.length + 1} className="px-6 py-4 text-center text-sm text-gray-500">Cargando...</td>
                            </tr>
                        ) : sortedCompras.length === 0 ? (
                            <tr>
                                <td colSpan={visibleColumns.length + 1} className="px-6 py-4 text-center text-sm text-gray-500">No hay compras registradas.</td>
                            </tr>
                        ) : (
                            sortedCompras.map((compra) => (
                                <tr key={compra.id} className="hover:bg-gray-50">
                                    <td className="px-4 whitespace-nowrap sticky left-0 bg-white z-10">
                                        <input
                                            type="checkbox"
                                            checked={selectedItems.includes(compra.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedItems([...selectedItems, compra.id]);
                                                } else {
                                                    setSelectedItems(selectedItems.filter(id => id !== compra.id));
                                                }
                                            }}
                                        />
                                    </td>
                                    {visibleColumns.map(col => {
                                        const stickyClass = col.key === "id"
                                            ? "sticky left-10 bg-white z-10"
                                            : col.key === "descripcion"
                                                ? "sticky left-28 bg-white z-10"
                                                : "";
                                        const rowPadding = compactMode ? "py-2" : "py-4";
                                        let content = null;
                                        switch (col.key) {
                                            case "id":
                                                content = compra.id;
                                                break;
                                            case "fecha":
                                                content = compra.fecha_ingreso ? new Date(compra.fecha_ingreso).toLocaleDateString() : "-";
                                                break;
                                            case "descripcion":
                                                content = (
                                                    <div className="max-w-xs truncate" title={compra.descripcion}>{compra.descripcion}</div>
                                                );
                                                break;
                                            case "cantidad":
                                                content = compra.cantidad;
                                                break;
                                            case "stock":
                                                content = compra.cantidad_stock;
                                                break;
                                            case "marca_modelo":
                                                content = `${compra.marca || ""} ${compra.modelo || ""}`.trim();
                                                break;
                                            case "serial":
                                                content = compra.serial || "-";
                                                break;
                                            case "proveedor":
                                                content = (
                                                    <div>
                                                        <div>{compra.proveedor}</div>
                                                        <div className="text-xs text-gray-500">#{compra.numero_proveedor || ""}</div>
                                                    </div>
                                                );
                                                break;
                                            case "orden":
                                                content = compra.orden_compra || "-";
                                                break;
                                            case "destino":
                                                content = (
                                                    <div>
                                                        <div>{compra.area_destino}</div>
                                                        <div className="text-xs text-gray-500">{compra.usuario_asignado}</div>
                                                    </div>
                                                );
                                                break;
                                            case "valor":
                                                content = `$${Number(compra.valor || 0).toLocaleString()}`;
                                                break;
                                            case "vida_util":
                                                content = compra.vida_util;
                                                break;
                                            default:
                                                content = "";
                                        }
                                        return (
                                            <td key={`${compra.id}-${col.key}`} className={`px-6 ${rowPadding} whitespace-nowrap text-sm text-gray-900 ${stickyClass}`}>
                                                {content}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <Modal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                title="Registrar Nueva Compra"
            >
                <AddPurchaseForm
                    onSuccess={() => {
                        setShowAddModal(false);
                        fetchCompras();
                    }}
                    onCancel={() => setShowAddModal(false)}
                />
            </Modal>

            {activeCompany && (
                <ImportCSVModal
                    isOpen={showImportModal}
                    onClose={() => setShowImportModal(false)}
                    onSuccess={() => {
                        setShowImportModal(false);
                        fetchCompras();
                    }}
                    activeTab="compras"
                    activeCompanyId={activeCompany.id}
                />
            )}
        </div>
    );
}

export default ComprasPage;
