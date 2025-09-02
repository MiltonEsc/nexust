// src/components/forms/RegistroForm.jsx

import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { useNavigate } from "react-router-dom";

function RegistroForm({ registroToEdit, onSuccess }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nombre: "",
    cargo: "",
    departamento: "",
    cedula: "",
    fecha_ingreso: "",
    induccion_tic: false,
    cuentas_creadas: "",
    equipo_id: "",
    software_ids: [],
    perifericos_ids: [],
  });

  const [inventario, setInventario] = useState({
    equipos: [],
    software: [],
    perifericos: [],
  });
  const [loading, setLoading] = useState(false);
  const [activeCompanyId, setActiveCompanyId] = useState(null);

  useEffect(() => {
    const fetchInventario = async () => {
      const { data: companies } = await supabase
        .from("company_users")
        .select("company_id")
        .limit(1);

      if (companies && companies.length > 0) {
        const companyId = companies[0].company_id;
        setActiveCompanyId(companyId);

        // --- LÓGICA DE EQUIPOS MEJORADA ---
        // 1. Empezamos la consulta para obtener equipos de la compañía.
        let equiposQuery = supabase
          .from("equipos")
          .select("id, marca, modelo")
          .eq("company_id", companyId);

        // 2. Filtramos para mostrar solo los disponibles (registro_id es NULL)
        // O el equipo que ya está asignado a ESTE usuario que estamos editando.
        if (registroToEdit && registroToEdit.equipo_id) {
          equiposQuery = equiposQuery.or(
            `registro_id.is.null,id.eq.${registroToEdit.equipo_id}`
          );
        } else {
          equiposQuery = equiposQuery.is("registro_id", null);
        }

        const [equiposRes, softwareRes, perifericosRes] = await Promise.all([
          equiposQuery, // Usamos la consulta que acabamos de construir
          supabase
            .from("software")
            .select("id, nombre")
            .eq("company_id", companyId),
          supabase
            .from("perifericos")
            .select("id, tipo, marca")
            .eq("company_id", companyId),
        ]);

        setInventario({
          equipos: equiposRes.data || [],
          software: softwareRes.data || [],
          perifericos: perifericosRes.data || [],
        });
      }
    };
    fetchInventario();
  }, [registroToEdit]); // Se recarga si cambiamos de usuario a editar

  useEffect(() => {
    if (registroToEdit) {
      setFormData({
        ...registroToEdit,
        equipo_id: registroToEdit.equipo_id || "",
        software_ids: registroToEdit.software_ids || [],
        perifericos_ids: registroToEdit.perifericos_ids || [],
        fecha_ingreso: registroToEdit.fecha_ingreso
          ? registroToEdit.fecha_ingreso.split("T")[0]
          : "",
      });
    }
  }, [registroToEdit]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleMultiSelectChange = (e) => {
    const { name, options } = e.target;
    const selectedIds = Array.from(options)
      .filter((opt) => opt.selected)
      .map((opt) => Number(opt.value));
    setFormData((prev) => ({ ...prev, [name]: selectedIds }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Obtenemos el ID del equipo que tenía ANTES de la edición
      const oldEquipoId = registroToEdit?.equipo_id;
      const newEquipoId = formData.equipo_id || null;

      const dataToSubmit = {
        ...formData,
        equipo_id: newEquipoId,
        company_id: activeCompanyId,
      };

      // Guardar el registro de usuario (crear o actualizar)
      let registroResult;
      if (registroToEdit) {
        const { id, trazabilidad, ...updateData } = dataToSubmit; // Excluimos trazabilidad para no sobreescribirla
        registroResult = await supabase
          .from("registros")
          .update(updateData)
          .eq("id", registroToEdit.id)
          .select()
          .single();
      } else {
        registroResult = await supabase
          .from("registros")
          .insert([dataToSubmit])
          .select()
          .single();
      }

      if (registroResult.error) throw registroResult.error;
      const savedRegistro = registroResult.data;

      // --- ACTUALIZAR LA TABLA DE EQUIPOS ---
      // Si el equipo ha cambiado...
      if (oldEquipoId !== newEquipoId) {
        // 1. Liberar el equipo antiguo (si había uno)
        if (oldEquipoId) {
          await supabase
            .from("equipos")
            .update({ registro_id: null })
            .eq("id", oldEquipoId);
        }
        // 2. Asignar el equipo nuevo (si se seleccionó uno)
        if (newEquipoId) {
          await supabase
            .from("equipos")
            .update({ registro_id: savedRegistro.id })
            .eq("id", newEquipoId);
        }
      }

      onSuccess();
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6"
    >
      {/* Columna Izquierda: Datos del Usuario */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-800">Datos del Usuario</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Nombre y Apellido
          </label>
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
          <label className="block text-sm font-medium text-gray-700">
            Cargo
          </label>
          <input
            type="text"
            name="cargo"
            value={formData.cargo}
            onChange={handleChange}
            required
            className="input-style"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Departamento
          </label>
          <input
            type="text"
            name="departamento"
            value={formData.departamento}
            onChange={handleChange}
            className="input-style"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Cédula
          </label>
          <input
            type="text"
            name="cedula"
            value={formData.cedula}
            onChange={handleChange}
            required
            className="input-style"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Fecha de Ingreso
          </label>
          <input
            type="date"
            name="fecha_ingreso"
            value={formData.fecha_ingreso}
            onChange={handleChange}
            required
            className="input-style"
          />
        </div>
      </div>

      {/* Columna Derecha: Cuentas y Activos */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-800">Cuentas y Activos</h3>
        <div className="flex items-start pt-2">
          <div className="flex items-center h-5">
            <input
              id="induccion_tic"
              name="induccion_tic"
              type="checkbox"
              checked={formData.induccion_tic}
              onChange={handleChange}
              className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
            />
          </div>
          <div className="ml-3 text-sm">
            <label
              htmlFor="induccion_tic"
              className="font-medium text-gray-700"
            >
              Recibió Inducción TIC
            </label>
            <p className="text-gray-500 text-xs">
              Marcar si el usuario completó la inducción inicial.
            </p>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Cuentas de Usuario Creadas
          </label>
          <textarea
            name="cuentas_creadas"
            value={formData.cuentas_creadas}
            onChange={handleChange}
            rows="3"
            className="input-style"
            placeholder="Listar una cuenta por línea..."
          ></textarea>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Equipo Principal
          </label>
          <select
            name="equipo_id"
            value={formData.equipo_id}
            onChange={handleChange}
            className="input-style"
          >
            <option value="">-- Sin asignar equipo --</option>
            {inventario.equipos.map((e) => (
              <option key={e.id} value={e.id}>
                {e.marca} {e.modelo}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Software <span className="text-xs text-gray-500">(Ctrl+Click)</span>
          </label>
          <select
            name="software_ids"
            value={formData.software_ids}
            onChange={handleMultiSelectChange}
            multiple
            className="input-style h-24"
          >
            {inventario.software.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Periféricos{" "}
            <span className="text-xs text-gray-500">(Ctrl+Click)</span>
          </label>
          <select
            name="perifericos_ids"
            value={formData.perifericos_ids}
            onChange={handleMultiSelectChange}
            multiple
            className="input-style h-24"
          >
            {inventario.perifericos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.tipo} - {p.marca}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Botones de Acción */}
      <div className="md:col-span-2 text-right space-x-3">
        <button
          type="button"
          onClick={() => navigate("/hojas-de-vida")}
          className="btn-secondary"
        >
          Cancelar
        </button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "Guardando..." : "Guardar Registro"}
        </button>
      </div>
    </form>
  );
}

export default RegistroForm;
