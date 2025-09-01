// src/components/forms/EquipoForm.jsx

import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";

function EquipoForm({ itemToEdit, onSuccess, activeCompanyId }) {
  // --- STATE MANAGEMENT ---
  const [formData, setFormData] = useState({
    marca: "",
    modelo: "",
    numero_serie: "",
    estado: "Bueno",
    ubicacion: "",
    proveedor_id: "",
    numero_factura: "",
    fecha_compra: "",
    fecha_vencimiento_garantia: "",
    costo: 0,
    imagen: "",
    factura_pdf_url: "",
  });

  // Estados separados para manejar los archivos seleccionados
  const [imagenFile, setImagenFile] = useState(null);
  const [facturaFile, setFacturaFile] = useState(null);

  // Estado para la lista de proveedores
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(false);

  // --- DATA FETCHING ---
  // Este useEffect se ejecuta una vez para cargar los proveedores
  useEffect(() => {
    const fetchProveedores = async () => {
      const { data, error } = await supabase
        .from("proveedores")
        .select("id, nombre");
      if (error) {
        console.error("Error fetching proveedores:", error);
      } else {
        setProveedores(data);
      }
    };
    fetchProveedores();
  }, []); // El array vacío asegura que solo se ejecute al montar el componente

  // Este useEffect llena el formulario cuando estamos en modo edición
  useEffect(() => {
    if (itemToEdit) {
      // Formateamos las fechas para que los inputs de tipo 'date' las acepten
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
      // Resetea el formulario para un nuevo ítem
      setFormData({
        marca: "",
        modelo: "",
        numero_serie: "",
        estado: "Bueno",
        ubicacion: "",
        proveedor_id: "",
        numero_factura: "",
        fecha_compra: "",
        fecha_vencimiento_garantia: "",
        costo: 0,
        imagen: "",
        factura_pdf_url: "",
      });
    }
  }, [itemToEdit]);

  // --- HANDLER FUNCTIONS ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (e.target.name === "imagen") {
      setImagenFile(file);
    } else if (e.target.name === "factura_pdf") {
      setFacturaFile(file);
    }
  };

  // Función reutilizable para subir archivos a Supabase Storage
  const uploadFile = async (file, bucket) => {
    if (!file) return null;
    const fileName = `${activeCompanyId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, file);
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. Subir archivos si existen
      const imageUrl = await uploadFile(imagenFile, "activos");
      const facturaUrl = await uploadFile(facturaFile, "facturas");

      // 2. Preparar el objeto de datos para la base de datos
      const dataToSubmit = {
        ...formData,
        // Si se subió un nuevo archivo, usamos su URL. Si no, mantenemos la existente.
        imagen: imageUrl ?? formData.imagen,
        factura_pdf_url: facturaUrl ?? formData.factura_pdf_url,
        // Convertir campos vacíos a null para la base de datos
        proveedor_id: formData.proveedor_id || null,
      };

      let error;
      if (itemToEdit) {
        const { id, ...dataToUpdate } = dataToSubmit;
        ({ error } = await supabase
          .from("equipos")
          .update(dataToUpdate)
          .eq("id", itemToEdit.id));
      } else {
        const newRecord = { ...dataToSubmit, company_id: activeCompanyId };
        ({ error } = await supabase.from("equipos").insert([newRecord]));
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
      <h3 className="text-xl font-semibold mb-4">
        {itemToEdit ? "Editar Equipo" : ""}
      </h3>

      {/* --- Detalles del Equipo --- */}
      <h4 className="text-lg font-medium text-gray-800 border-b pb-2">
        Detalles del Equipo
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label>Marca</label>
          <input
            type="text"
            name="marca"
            value={formData.marca}
            onChange={handleChange}
            required
            className="mt-1 w-full border-gray-300 rounded-md shadow-sm"
          />
        </div>
        <div>
          <label>Modelo</label>
          <input
            type="text"
            name="modelo"
            value={formData.modelo}
            onChange={handleChange}
            required
            className="mt-1 w-full border-gray-300 rounded-md shadow-sm"
          />
        </div>
        <div>
          <label>Número de Serie</label>
          <input
            type="text"
            name="numero_serie"
            value={formData.numero_serie}
            onChange={handleChange}
            required
            className="mt-1 w-full border-gray-300 rounded-md shadow-sm"
          />
        </div>
        <div>
          <label>Estado</label>
          <select
            name="estado"
            value={formData.estado}
            onChange={handleChange}
            className="mt-1 w-full border-gray-300 rounded-md shadow-sm"
          >
            <option>Bueno</option>
            <option>Regular</option>
            <option>Malo</option>
            <option>En reparación</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label>Ubicación</label>
          <input
            type="text"
            name="ubicacion"
            value={formData.ubicacion}
            onChange={handleChange}
            className="mt-1 w-full border-gray-300 rounded-md shadow-sm"
          />
        </div>
      </div>

      {/* --- Información de Compra --- */}
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
            className="mt-1 w-full border-gray-300 rounded-md shadow-sm"
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
          <label>Número de Factura</label>
          <input
            type="text"
            name="numero_factura"
            value={formData.numero_factura}
            onChange={handleChange}
            className="mt-1 w-full border-gray-300 rounded-md shadow-sm"
          />
        </div>
        <div>
          <label>Fecha de Compra</label>
          <input
            type="date"
            name="fecha_compra"
            value={formData.fecha_compra}
            onChange={handleChange}
            className="mt-1 w-full border-gray-300 rounded-md shadow-sm"
          />
        </div>
        <div>
          <label>Vencimiento de Garantía</label>
          <input
            type="date"
            name="fecha_vencimiento_garantia"
            value={formData.fecha_vencimiento_garantia}
            onChange={handleChange}
            className="mt-1 w-full border-gray-300 rounded-md shadow-sm"
          />
        </div>
        <div>
          <label>Costo</label>
          <input
            type="number"
            name="costo"
            step="0.01"
            placeholder="0.00"
            value={formData.costo}
            onChange={handleChange}
            className="mt-1 w-full border-gray-300 rounded-md shadow-sm"
          />
        </div>
        <div></div> {/* Espacio en blanco para alinear */}
        <div>
          <label>Imagen del Activo</label>
          <input
            type="file"
            name="imagen"
            onChange={handleFileChange}
            accept="image/*"
            className="mt-1 w-full text-sm"
          />
        </div>
        <div>
          <label>Factura (PDF)</label>
          <input
            type="file"
            name="factura_pdf"
            onChange={handleFileChange}
            accept="application/pdf"
            className="mt-1 w-full text-sm"
          />
        </div>
      </div>

      <div className="pt-4 text-right">
        <button
          type="submit"
          disabled={loading}
          className="py-2 px-6 font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-sm disabled:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          {loading ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </form>
  );
}

export default EquipoForm;
