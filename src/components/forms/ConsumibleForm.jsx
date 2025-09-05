// src/components/forms/ConsumibleForm.jsx

import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { useAppContext } from "../../context/AppContext";

function ConsumibleForm({ itemToEdit, onSuccess }) {
  const { activeCompany } = useAppContext();
  const [formData, setFormData] = useState({
    nombre: "",
    categoria: "",
    cantidad: 1,
    stock_minimo: 5,
    proveedor_id: "",
    costo: 0,
    fecha_compra: "",
    numero_factura: "",
    ubicacion: "",
    imagen: "",
  });

  const [imagenFile, setImagenFile] = useState(null);
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchProveedores = async () => {
      if (!activeCompany) return;
      const { data, error } = await supabase
        .from("proveedores")
        .select("id, nombre")
        .eq("company_id", activeCompany.id);
      if (error) console.error("Error fetching proveedores:", error);
      else setProveedores(data || []);
    };
    fetchProveedores();
  }, [activeCompany]);

  useEffect(() => {
    if (itemToEdit) {
      const formattedItem = {
        ...itemToEdit,
        fecha_compra: itemToEdit.fecha_compra?.split("T")[0] || "",
        proveedor_id: itemToEdit.proveedor_id || "",
      };
      setFormData(formattedItem);
    } else {
      // Reset to default for new item
      setFormData({
        nombre: "",
        categoria: "",
        cantidad: 1,
        stock_minimo: 5,
        proveedor_id: "",
        costo: 0,
        fecha_compra: "",
        numero_factura: "",
        ubicacion: "",
        imagen: "",
      });
    }
  }, [itemToEdit]);

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
    if (!file || !activeCompany) return null;
    const fileName = `${activeCompany.id}/consumibles/${Date.now()}-${
      file.name
    }`;
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
        fecha_compra: formData.fecha_compra || null,
      };
      delete dataToSubmit.proveedores;

      let error;
      if (itemToEdit) {
        const { id, ...dataToUpdate } = dataToSubmit;
        ({ error } = await supabase
          .from("consumibles")
          .update(dataToUpdate)
          .eq("id", itemToEdit.id));
      } else {
        const newRecord = { ...dataToSubmit, company_id: activeCompany.id };
        ({ error } = await supabase.from("consumibles").insert([newRecord]));
      }

      if (error) throw error;
      onSuccess();
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-xl font-semibold mb-4">
        {itemToEdit ? "Editar Consumible" : "Añadir Consumible"}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label>Nombre del Consumible</label>
          <input
            type="text"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            required
            className="input-style"
            placeholder="Ej: Tóner HP LaserJet 415A"
          />
        </div>
        <div>
          <label>Categoría</label>
          <input
            type="text"
            name="categoria"
            value={formData.categoria}
            onChange={handleChange}
            className="input-style"
            placeholder="Ej: Tóners, Papelería, Cables"
          />
        </div>
        <div>
          <label>Cantidad en Stock</label>
          <input
            type="number"
            name="cantidad"
            value={formData.cantidad}
            onChange={handleChange}
            required
            min="0"
            className="input-style"
          />
        </div>
        <div>
          <label>Stock Mínimo de Alerta</label>
          <input
            type="number"
            name="stock_minimo"
            value={formData.stock_minimo}
            onChange={handleChange}
            required
            min="0"
            className="input-style"
          />
        </div>
        <div>
          <label>Ubicación</label>
          <input
            type="text"
            name="ubicacion"
            value={formData.ubicacion}
            onChange={handleChange}
            className="input-style"
            placeholder="Ej: Bodega 1, Estante A-2"
          />
        </div>
      </div>

      <h4 className="text-lg font-medium text-gray-800 border-b pb-2 mt-4">
        Información de Compra
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label>Proveedor</label>
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
          <label>Costo Unitario</label>
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
        <div>
          <label>Fecha de Última Compra</label>
          <input
            type="date"
            name="fecha_compra"
            value={formData.fecha_compra}
            onChange={handleChange}
            className="input-style"
          />
        </div>
        <div>
          <label>Número de Factura</label>
          <input
            type="text"
            name="numero_factura"
            value={formData.numero_factura}
            onChange={handleChange}
            className="input-style"
          />
        </div>
        <div className="md:col-span-2">
          <label>Imagen del Producto</label>
          <input
            type="file"
            name="imagen"
            onChange={handleFileChange}
            accept="image/*"
            className="input-style-file"
          />
        </div>
      </div>

      <div className="pt-4 text-right">
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "Guardando..." : "Guardar Consumible"}
        </button>
      </div>
    </form>
  );
}

export default ConsumibleForm;
