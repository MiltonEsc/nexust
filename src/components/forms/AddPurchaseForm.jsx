import React, { useState } from "react";
import { supabase } from "../../supabaseClient";
import { useAppContext } from "../../context/AppContext";

function AddPurchaseForm({ onSuccess, onCancel }) {
    const { activeCompany } = useAppContext();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        fecha_ingreso: new Date().toISOString().split("T")[0],
        descripcion: "",
        cantidad: 1,
        cantidad_stock: 1,
        marca: "",
        modelo: "",
        serial: "",
        proveedor: "",
        numero_proveedor: "",
        area_destino: "",
        usuario_asignado: "",
        orden_compra: "",
        valor: 0,
        vida_util: "",
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase
                .from("compras")
                .insert([
                    {
                        ...formData,
                        company_id: activeCompany.id,
                    },
                ]);

            if (error) throw error;
            onSuccess();
        } catch (error) {
            alert("Error al guardar la compra: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Fila 1 */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Fecha Ingreso</label>
                    <input
                        type="date"
                        name="fecha_ingreso"
                        required
                        value={formData.fecha_ingreso}
                        onChange={handleChange}
                        className="input-style"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Descripción Item</label>
                    <input
                        type="text"
                        name="descripcion"
                        required
                        value={formData.descripcion}
                        onChange={handleChange}
                        className="input-style"
                        placeholder="Ej: Laptop Dell Latitude"
                    />
                </div>

                {/* Fila 2 */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Cantidad</label>
                    <input
                        type="number"
                        name="cantidad"
                        min="1"
                        value={formData.cantidad}
                        onChange={handleChange}
                        className="input-style"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Cantidad Stock</label>
                    <input
                        type="number"
                        name="cantidad_stock"
                        min="0"
                        value={formData.cantidad_stock}
                        onChange={handleChange}
                        className="input-style"
                    />
                </div>

                {/* Fila 3 */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Marca</label>
                    <input
                        type="text"
                        name="marca"
                        value={formData.marca}
                        onChange={handleChange}
                        className="input-style"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Modelo</label>
                    <input
                        type="text"
                        name="modelo"
                        value={formData.modelo}
                        onChange={handleChange}
                        className="input-style"
                    />
                </div>

                {/* Fila 4 */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Serial</label>
                    <input
                        type="text"
                        name="serial"
                        value={formData.serial}
                        onChange={handleChange}
                        className="input-style"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Vida Útil</label>
                    <input
                        type="text"
                        name="vida_util"
                        value={formData.vida_util}
                        onChange={handleChange}
                        className="input-style"
                        placeholder="Ej: 3 años"
                    />
                </div>

                {/* Fila 5 - Proveedor */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Proveedor</label>
                    <input
                        type="text"
                        name="proveedor"
                        value={formData.proveedor}
                        onChange={handleChange}
                        className="input-style"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Número Proveedor</label>
                    <input
                        type="text"
                        name="numero_proveedor"
                        value={formData.numero_proveedor}
                        onChange={handleChange}
                        className="input-style"
                    />
                </div>

                {/* Fila 6 - Asignación */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Área Destino</label>
                    <input
                        type="text"
                        name="area_destino"
                        value={formData.area_destino}
                        onChange={handleChange}
                        className="input-style"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Usuario Asignado</label>
                    <input
                        type="text"
                        name="usuario_asignado"
                        value={formData.usuario_asignado}
                        onChange={handleChange}
                        className="input-style"
                    />
                </div>

                {/* Fila 7 - Financiero */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Orden de Compra</label>
                    <input
                        type="text"
                        name="orden_compra"
                        value={formData.orden_compra}
                        onChange={handleChange}
                        className="input-style"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Valor</label>
                    <input
                        type="number"
                        name="valor"
                        min="0"
                        step="0.01"
                        value={formData.valor}
                        onChange={handleChange}
                        className="input-style"
                    />
                </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <button
                    type="button"
                    onClick={onCancel}
                    className="btn-secondary"
                    disabled={loading}
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    className="btn-primary"
                    disabled={loading}
                >
                    {loading ? "Guardando..." : "Guardar Compra"}
                </button>
            </div>
        </form>
    );
}

export default AddPurchaseForm;
