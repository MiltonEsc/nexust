// src/components/forms/CompanyForm.jsx

import React, { useState } from "react";
import { supabase } from "../../supabaseClient";

function CompanyForm({ onSuccess }) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    // Llamamos a la función RPC que creaste en tu base de datos
    const { error } = await supabase.rpc("create_company_and_add_owner", {
      company_name: name,
    });
    setLoading(false);

    if (error) {
      alert(error.message);
    } else {
      onSuccess(); // Llama a la función para cerrar el modal y recargar los datos
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label>Nombre de la Empresa</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="input-style"
        />
      </div>
      <div className="text-right">
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "Creando..." : "Crear Empresa"}
        </button>
      </div>
    </form>
  );
}

export default CompanyForm;
