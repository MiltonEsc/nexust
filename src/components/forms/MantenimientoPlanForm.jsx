import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { useAppContext } from "../../context/AppContext";

const PERIODICITIES = [
  { value: "daily", label: "Diario" },
  { value: "weekly", label: "Semanal" },
  { value: "monthly", label: "Mensual" },
  { value: "quarterly", label: "Trimestral" },
  { value: "semiannual", label: "Semestral" },
  { value: "annual", label: "Anual" },
  { value: "custom", label: "Personalizado (días)" },
];

function MantenimientoPlanForm({ planToEdit, onSuccess }) {
  const { activeCompany, showNotification } = useAppContext();
  const [equipos, setEquipos] = useState([]);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    equipo_id: null,
    title: "",
    periodicity: "monthly",
    frequency_days: 0,
    next_date: new Date().toISOString().slice(0, 10),
    responsible: "",
    notes: "",
    active: true,
  });

  useEffect(() => {
    const fetchEquipos = async () => {
      if (!activeCompany) return;
      const { data, error } = await supabase
        .from("equipos")
        .select("id, marca, modelo, numero_serie")
        .eq("company_id", activeCompany.id)
        .order("id", { ascending: false });
      if (!error) setEquipos(data || []);
    };
    fetchEquipos();
  }, [activeCompany]);

  useEffect(() => {
    if (planToEdit) {
      setForm({
        equipo_id: planToEdit.equipo_id,
        title: planToEdit.title || "",
        periodicity: planToEdit.periodicity || "monthly",
        frequency_days: planToEdit.frequency_days || 0,
        next_date: planToEdit.next_date,
        responsible: planToEdit.responsible || "",
        notes: planToEdit.notes || "",
        active: planToEdit.active,
      });
    }
  }, [planToEdit]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!activeCompany) return;
    setSaving(true);
    try {
      const payload = {
        company_id: activeCompany.id,
        ...form,
      };
      if (payload.periodicity !== "custom") {
        payload.frequency_days = 0;
      }
      let result;
      if (planToEdit?.id) {
        result = await supabase
          .from("maintenance_schedules")
          .update(payload)
          .eq("id", planToEdit.id)
          .select()
          .maybeSingle();
      } else {
        result = await supabase
          .from("maintenance_schedules")
          .insert(payload)
          .select()
          .maybeSingle();
      }
      if (result.error) throw result.error;
      showNotification("Plan guardado", "success");
      onSuccess?.();
    } catch (err) {
      showNotification(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Equipo (opcional)
          </label>
          <select
            name="equipo_id"
            value={form.equipo_id || ""}
            onChange={(e) =>
              setForm((p) => ({ ...p, equipo_id: e.target.value || null }))
            }
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="">— Plan general —</option>
            {equipos.map((eq) => (
              <option key={eq.id} value={eq.id}>{`
                ${eq.marca || ""} ${eq.modelo || ""} (S/N: ${eq.numero_serie || "N/A"})
              `}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Título
          </label>
          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Periodicidad
          </label>
          <select
            name="periodicity"
            value={form.periodicity}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          >
            {PERIODICITIES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {form.periodicity === "custom" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Frecuencia (días)
            </label>
            <input
              type="number"
              name="frequency_days"
              value={form.frequency_days}
              min={1}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Próxima fecha
          </label>
          <input
            type="date"
            name="next_date"
            value={form.next_date}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Responsable
          </label>
          <input
            name="responsible"
            value={form.responsible}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notas
        </label>
        <textarea
          name="notes"
          value={form.notes}
          onChange={handleChange}
          rows={4}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="active"
          type="checkbox"
          name="active"
          checked={form.active}
          onChange={handleChange}
        />
        <label htmlFor="active" className="text-sm text-gray-700">
          Activo
        </label>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="btn-primary"
        >
          {saving ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </form>
  );
}

export default MantenimientoPlanForm;


