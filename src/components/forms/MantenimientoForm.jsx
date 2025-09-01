// src/components/forms/MantenimientoForm.jsx

import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";

function MantenimientoForm({ onSuccess, activeCompanyId }) {
  const [formData, setFormData] = useState({
    equipo_id: "",
    fecha: new Date().toISOString().slice(0, 10), // Fecha de hoy por defecto
    descripcion: "",
    tecnico: "",
  });
  const [equipos, setEquipos] = useState([]);
  const [loading, setLoading] = useState(false);

  // useEffect para cargar la lista de equipos para el dropdown
  useEffect(() => {
    const fetchEquipos = async () => {
      if (activeCompanyId) {
        const { data, error } = await supabase
          .from("equipos")
          .select("id, marca, modelo, trazabilidad")
          .eq("company_id", activeCompanyId);
        if (error) console.error("Error fetching equipos:", error);
        else setEquipos(data || []);
      }
    };
    fetchEquipos();
  }, [activeCompanyId]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const equipoSeleccionado = equipos.find(
        (eq) => eq.id === parseInt(formData.equipo_id)
      );
      if (!equipoSeleccionado) throw new Error("Equipo no encontrado.");

      const nuevoLog = {
        accion: "Mantenimiento",
        fecha: formData.fecha,
        detalle: formData.descripcion,
        tecnico: formData.tecnico,
      };

      const nuevaTrazabilidad = [
        ...(equipoSeleccionado.trazabilidad || []),
        nuevoLog,
      ];

      const { error } = await supabase
        .from("equipos")
        .update({ trazabilidad: nuevaTrazabilidad })
        .eq("id", formData.equipo_id);

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
      <h3 className="text-xl font-semibold">Registrar Mantenimiento</h3>
      <div>
        <label>Equipo</label>
        {/* ▼▼▼ ESTILO ACTUALIZADO ▼▼▼ */}
        <select
          name="equipo_id"
          value={formData.equipo_id}
          onChange={handleChange}
          required
          className="input-style"
        >
          <option value="">-- Seleccione un equipo --</option>
          {equipos.map((e) => (
            <option key={e.id} value={e.id}>
              {e.marca} {e.modelo}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label>Fecha de Mantenimiento</label>
        {/* ▼▼▼ ESTILO ACTUALIZADO ▼▼▼ */}
        <input
          type="date"
          name="fecha"
          value={formData.fecha}
          onChange={handleChange}
          required
          className="input-style"
        />
      </div>
      <div>
        <label>Técnico Responsable</label>
        {/* ▼▼▼ ESTILO ACTUALIZADO ▼▼▼ */}
        <input
          type="text"
          name="tecnico"
          value={formData.tecnico}
          onChange={handleChange}
          className="input-style"
        />
      </div>
      <div>
        <label>Descripción del Trabajo</label>
        {/* ▼▼▼ ESTILO ACTUALIZADO ▼▼▼ */}
        <textarea
          name="descripcion"
          value={formData.descripcion}
          onChange={handleChange}
          required
          rows="3"
          className="input-style"
        ></textarea>
      </div>
      <div className="text-right pt-4">
        {/* ▼▼▼ ESTILO ACTUALIZADO ▼▼▼ */}
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </form>
  );
}

export default MantenimientoForm;
