// src/components/forms/SoftwareForm.jsx

import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";

function SoftwareForm({ itemToEdit, onSuccess, activeCompanyId }) {
  // Estado para los campos del formulario de software
  const [formData, setFormData] = useState({
    nombre: "",
    version: "",
    stock: 1,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (itemToEdit) {
      setFormData(itemToEdit);
    } else {
      setFormData({ nombre: "", version: "", stock: 1 });
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
          .from("software")
          .update(dataToUpdate)
          .eq("id", itemToEdit.id));
      } else {
        const newRecord = { ...formData, company_id: activeCompanyId };
        ({ error } = await supabase.from("software").insert([newRecord]));
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
        {itemToEdit ? "Editar Software" : "Añadir Nuevo Software"}
      </h3>
      <div>
        <label>Nombre del Software</label>
        <input
          type="text"
          name="nombre"
          value={formData.nombre}
          onChange={handleChange}
          required
          className="mt-1 w-full border-gray-300 rounded-md shadow-sm"
        />
      </div>
      <div>
        <label>Versión</label>
        <input
          type="text"
          name="version"
          value={formData.version}
          onChange={handleChange}
          className="mt-1 w-full border-gray-300 rounded-md shadow-sm"
        />
      </div>
      <div>
        <label>Licencias (Stock)</label>
        <input
          type="number"
          name="stock"
          value={formData.stock}
          onChange={handleChange}
          required
          min="0"
          className="mt-1 w-full border-gray-300 rounded-md shadow-sm"
        />
      </div>
      <div className="text-right">
        <button
          type="submit"
          disabled={loading}
          className="py-2 px-6 text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:bg-indigo-400"
        >
          {loading ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </form>
  );
}

export default SoftwareForm;
