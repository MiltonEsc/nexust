import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useAppContext } from "../context/AppContext";

import Modal from "../components/common/Modal";
import AddPurchaseForm from "../components/forms/AddPurchaseForm";
import ImportCSVModal from "../components/modals/ImportCSVModal";

function ComprasPage() {
    const { activeCompany } = useAppContext();
    const [compras, setCompras] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);

    useEffect(() => {
        if (activeCompany) {
            fetchCompras();
        }
    }, [activeCompany]);

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

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Ingreso</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cant.</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Marca/Modelo</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Serial</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proveedor</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"># Compra</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destino/Usuario</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vida Útil</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr>
                                <td colSpan="11" className="px-6 py-4 text-center text-sm text-gray-500">Cargando...</td>
                            </tr>
                        ) : compras.length === 0 ? (
                            <tr>
                                <td colSpan="11" className="px-6 py-4 text-center text-sm text-gray-500">No hay compras registradas.</td>
                            </tr>
                        ) : (
                            compras.map((compra) => (
                                <tr key={compra.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {compra.fecha_ingreso ? new Date(compra.fecha_ingreso).toLocaleDateString() : "-"}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate" title={compra.descripcion}>
                                        {compra.descripcion}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{compra.cantidad}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{compra.cantidad_stock}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {compra.marca} {compra.modelo}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{compra.serial || "-"}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        <div>{compra.proveedor}</div>
                                        <div className="text-xs text-gray-500">#{compra.numero_proveedor || ""}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{compra.orden_compra || "-"}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        <div>{compra.area_destino}</div>
                                        <div className="text-xs text-gray-500">{compra.usuario_asignado}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        ${Number(compra.valor || 0).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{compra.vida_util}</td>
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
