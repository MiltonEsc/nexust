// src/components/forms/MantenimientoForm.jsx

import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { useAppContext } from "../../context/AppContext";

// El formulario ahora recibe el log a editar a través de la prop 'logToEdit'
function MantenimientoForm({ onSuccess, logToEdit }) {
  const { activeCompany } = useAppContext();
  const [formData, setFormData] = useState({
    equipo_id: "",
    fecha: new Date().toISOString().slice(0, 10),
    descripcion: "",
    tecnico: "",
  });
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [equipos, setEquipos] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchEquipos = async () => {
      if (!activeCompany) return;
      const { data, error } = await supabase
        .from("equipos")
        .select("id, marca, modelo")
        .eq("company_id", activeCompany.id);
      if (error) console.error("Error fetching equipos:", error);
      else setEquipos(data || []);
    };
    fetchEquipos();
  }, [activeCompany]);

  // Si pasamos un 'logToEdit', llenamos el formulario con sus datos
  useEffect(() => {
    if (logToEdit) {
      setFormData({
        equipo_id: logToEdit.equipo_id,
        fecha: new Date(logToEdit.fecha).toISOString().slice(0, 10),
        descripcion: logToEdit.detalle || "",
        tecnico: logToEdit.tecnico || "",
      });
    }
  }, [logToEdit]);

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
      let evidenceUrl = logToEdit?.evidencia_url || null; // Mantenemos la evidencia existente si no se sube una nueva
      if (evidenceFile) {
        const fileName = `${activeCompany.id}/evidencias/${Date.now()}-${
          evidenceFile.name
        }`;
        const { error: uploadError } = await supabase.storage
          .from("activos")
          .upload(fileName, evidenceFile);
        if (uploadError) throw uploadError;
        const { data } = supabase.storage
          .from("activos")
          .getPublicUrl(fileName);
        evidenceUrl = data.publicUrl;
      }

      const dataToSubmit = {
        company_id: activeCompany.id,
        equipo_id: formData.equipo_id,
        fecha: formData.fecha,
        detalle: formData.descripcion,
        tecnico: formData.tecnico,
        evidencia_url: evidenceUrl,
      };

      let error;
      if (logToEdit) {
        // Modo Edición: Actualizamos el registro existente en la tabla 'maintenance_logs'
        ({ error } = await supabase
          .from("maintenance_logs")
          .update(dataToSubmit)
          .eq("id", logToEdit.id));
      } else {
        // Modo Creación: Insertamos un nuevo registro en la tabla 'maintenance_logs'
        ({ error } = await supabase
          .from("maintenance_logs")
          .insert(dataToSubmit));
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
      {/* El campo de equipo se deshabilita en modo edición para no cambiar el log a otro equipo */}
      <div>
        <label>Equipo</label>
        <select
          name="equipo_id"
          value={formData.equipo_id}
          onChange={handleChange}
          required
          disabled={!!logToEdit} // Deshabilitado en modo edición
          className="input-style disabled:bg-gray-100 disabled:cursor-not-allowed"
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
          className="input-style-file"
        />
        {logToEdit && logToEdit.evidencia_url && (
          <p className="text-xs text-gray-500 mt-1">
            Archivo actual:{" "}
            <a
              href={logToEdit.evidencia_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Ver Evidencia
            </a>
            . Sube un nuevo archivo para reemplazarlo.
          </p>
        )}
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
