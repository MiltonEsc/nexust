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
  const [evidenceFile, setEvidenceFile] = useState(null);
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

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setEvidenceFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let evidenceUrl = null;
      // Subir el archivo a Supabase Storage si existe
      if (evidenceFile) {
        const fileName = `${activeCompanyId}/evidencias/${Date.now()}-${
          evidenceFile.name
        }`;
        const { error: uploadError } = await supabase.storage
          .from("activos") // Puedes usar un bucket 'evidencias' si lo prefieres
          .upload(fileName, evidenceFile);
        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from("activos")
          .getPublicUrl(fileName);
        evidenceUrl = data.publicUrl;
      }

      const equipoSeleccionado = equipos.find(
        (eq) => eq.id === parseInt(formData.equipo_id)
      );
      if (!equipoSeleccionado) throw new Error("Equipo no encontrado.");

      const nuevoLog = {
        accion: "Mantenimiento",
        fecha: formData.fecha,
        detalle: formData.descripcion,
        tecnico: formData.tecnico,
        evidencia_url: evidenceUrl, // Guardamos la URL de la evidencia
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
      <div>
        <label>Equipo</label>
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
        <textarea
          name="descripcion"
          value={formData.descripcion}
          onChange={handleChange}
          required
          rows="3"
          className="input-style"
        ></textarea>
      </div>
      <div>
        <label>Evidencia (Imagen o PDF)</label>
        <input
          type="file"
          name="evidencia"
          onChange={handleFileChange}
          accept="image/*,application/pdf"
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>
      <div className="text-right pt-4">
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </form>
  );
}

export default MantenimientoForm;
