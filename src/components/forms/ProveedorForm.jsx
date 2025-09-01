// src/components/forms/ProveedorForm.jsx

import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";

function ProveedorForm({ itemToEdit, onSuccess, activeCompanyId }) {
  const [formData, setFormData] = useState({
    nombre: "",
    contacto: "",
    telefono: "",
    email: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (itemToEdit) {
      setFormData(itemToEdit);
    } else {
      setFormData({ nombre: "", contacto: "", telefono: "", email: "" });
    }
  }, [itemToEdit]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let error;
      if (itemToEdit) {
        const { id, ...dataToUpdate } = formData;
        ({ error } = await supabase
          .from("proveedores")
          .update(dataToUpdate)
          .eq("id", itemToEdit.id));
      } else {
        const newRecord = { ...formData, company_id: activeCompanyId };
        ({ error } = await supabase.from("proveedores").insert([newRecord]));
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
      <h3 className="text-xl font-semibold">
        {itemToEdit ? "Editar Proveedor" : "Añadir Nuevo Proveedor"}
      </h3>
      <div>
        <label className="block text-sm">Nombre del Proveedor</label>
        {/* ▼▼▼ ESTILO ACTUALIZADO ▼▼▼ */}
        <input
          type="text"
          name="nombre"
          value={formData.nombre}
          onChange={handleChange}
          required
          className="input-style"
        />
      </div>
      <div>
        <label className="block text-sm">Contacto</label>
        {/* ▼▼▼ ESTILO ACTUALIZADO ▼▼▼ */}
        <input
          type="text"
          name="contacto"
          value={formData.contacto}
          onChange={handleChange}
          className="input-style"
        />
      </div>
      <div>
        <label className="block text-sm">Teléfono</label>
        {/* ▼▼▼ ESTILO ACTUALIZADO ▼▼▼ */}
        <input
          type="tel"
          name="telefono"
          value={formData.telefono}
          onChange={handleChange}
          className="input-style"
        />
      </div>
      <div>
        <label className="block text-sm">Email</label>
        {/* ▼▼▼ ESTILO ACTUALIZADO ▼▼▼ */}
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          className="input-style"
        />
      </div>
      <div className="text-right mt-4 pt-4">
        {/* ▼▼▼ ESTILO ACTUALIZADO ▼▼▼ */}
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </form>
  );
}

export default ProveedorForm;
