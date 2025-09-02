// src/components/forms/PerifericoForm.jsx

import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";

function PerifericoForm({ itemToEdit, onSuccess, activeCompanyId }) {
  // --- STATE MANAGEMENT ---
  const [formData, setFormData] = useState({
    tipo: "",
    marca: "",
    modelo: "",
    numero_serie: "",
    estado: "Bueno",
    proveedor_id: "",
    numero_factura: "",
    fecha_compra: "",
    fecha_vencimiento_garantia: "",
    costo: 0,
    imagen: "",
  });

  const [imagenFile, setImagenFile] = useState(null);
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(false);

  // --- DATA FETCHING ---
  // Carga los proveedores para el menú desplegable
  useEffect(() => {
    const fetchProveedores = async () => {
      const { data } = await supabase.from("proveedores").select("id, nombre");
      if (data) setProveedores(data);
    };
    fetchProveedores();
  }, []);

  // Llena el formulario cuando se está editando un ítem
  useEffect(() => {
    if (itemToEdit) {
      const formattedItem = {
        ...itemToEdit,
        fecha_compra: itemToEdit.fecha_compra
          ? itemToEdit.fecha_compra.split("T")[0]
          : "",
        fecha_vencimiento_garantia: itemToEdit.fecha_vencimiento_garantia
          ? itemToEdit.fecha_vencimiento_garantia.split("T")[0]
          : "",
      };
      setFormData(formattedItem);
    } else {
      setFormData({
        tipo: "",
        marca: "",
        modelo: "",
        numero_serie: "",
        estado: "Bueno",
        proveedor_id: "",
        numero_factura: "",
        fecha_compra: "",
        fecha_vencimiento_garantia: "",
        costo: 0,
        imagen: "",
      });
    }
  }, [itemToEdit]);

  // --- HANDLER FUNCTIONS ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setImagenFile(e.target.files[0]);
    }
  };

  const uploadFile = async (file) => {
    if (!file) return null;
    const fileName = `${activeCompanyId}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage
      .from("activos")
      .upload(fileName, file);
    if (error) throw error;
    const { data } = supabase.storage.from("activos").getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const imageUrl = await uploadFile(imagenFile);
      const dataToSubmit = {
        ...formData,
        imagen: imageUrl ?? formData.imagen,
        proveedor_id: formData.proveedor_id || null,
      };

      let error;
      if (itemToEdit) {
        const { id, ...dataToUpdate } = dataToSubmit;
        ({ error } = await supabase
          .from("perifericos")
          .update(dataToUpdate)
          .eq("id", itemToEdit.id));
      } else {
        const newRecord = { ...dataToSubmit, company_id: activeCompanyId };
        ({ error } = await supabase.from("perifericos").insert([newRecord]));
      }

      if (error) throw error;
      onSuccess();
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- UI RENDERING ---
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <h4 className="md:col-span-2 text-lg font-medium text-gray-800 border-b pb-2">
          Detalles del Periférico
        </h4>
        <div>
          <label className="block text-sm">Tipo de Periférico</label>
          <input
            type="text"
            name="tipo"
            required
            placeholder="Ej: Monitor, Teclado"
            value={formData.tipo}
            onChange={handleChange}
            className="input-style"
          />
        </div>
        <div>
          <label className="block text-sm">Marca</label>
          <input
            type="text"
            name="marca"
            value={formData.marca}
            onChange={handleChange}
            className="input-style"
          />
        </div>
        <div>
          <label className="block text-sm">Modelo</label>
          <input
            type="text"
            name="modelo"
            value={formData.modelo}
            onChange={handleChange}
            className="input-style"
          />
        </div>
        <div>
          <label className="block text-sm">Número de Serie</label>
          <input
            type="text"
            name="numero_serie"
            value={formData.numero_serie}
            onChange={handleChange}
            className="input-style"
          />
        </div>
        <div>
          <label className="block text-sm">Estado</label>
          <select
            name="estado"
            value={formData.estado}
            onChange={handleChange}
            className="input-style"
          >
            <option>Bueno</option>
            <option>Regular</option>
            <option>Malo</option>
          </select>
        </div>

        <h4 className="md:col-span-2 text-lg font-medium text-gray-800 border-b pb-2 mt-4">
          Información de Compra
        </h4>
        <div>
          <label className="block text-sm">Proveedor</label>
          <select
            name="proveedor_id"
            value={formData.proveedor_id}
            onChange={handleChange}
            className="input-style"
          >
            <option value="">-- Sin Proveedor --</option>
            {proveedores.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm">Número de Factura</label>
          <input
            type="text"
            name="numero_factura"
            value={formData.numero_factura}
            onChange={handleChange}
            className="input-style"
          />
        </div>
        <div>
          <label className="block text-sm">Fecha de Compra</label>
          <input
            type="date"
            name="fecha_compra"
            value={formData.fecha_compra}
            onChange={handleChange}
            className="input-style"
          />
        </div>
        <div>
          <label className="block text-sm">Vencimiento de Garantía</label>
          <input
            type="date"
            name="fecha_vencimiento_garantia"
            value={formData.fecha_vencimiento_garantia}
            onChange={handleChange}
            className="input-style"
          />
        </div>
        <div>
          <label className="block text-sm">Costo</label>
          <input
            type="number"
            name="costo"
            step="0.01"
            placeholder="0.00"
            value={formData.costo}
            onChange={handleChange}
            className="input-style"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm">Imagen del Activo</label>
          <input
            type="file"
            name="imagen"
            onChange={handleFileChange}
            accept="image/*"
            className="input-style-file"
          />
        </div>
      </div>
      <div className="text-right mt-4 pt-4">
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </form>
  );
}

export default PerifericoForm;
