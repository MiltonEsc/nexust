// src/components/forms/EquipoForm.jsx

import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { useAppContext } from "../../context/AppContext";

function EquipoForm({ itemToEdit, onSuccess }) {
  const { activeCompany } = useAppContext();
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
    vida_util: 5, // Un valor por defecto común
    valor_residual: 0,
    imagen: "",
    factura_pdf_url: "",
  });

  const [imagenFile, setImagenFile] = useState(null);
  const [facturaFile, setFacturaFile] = useState(null);
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchProveedores = async () => {
      if (!activeCompany) return;
      const { data, error } = await supabase
        .from("proveedores")
        .select("id, nombre")
        .eq("company_id", activeCompany.id);
      if (error) {
        console.error("Error fetching proveedores:", error);
      } else {
        setProveedores(data || []);
      }
    };
    fetchProveedores();
  }, [activeCompany]);

  useEffect(() => {
    if (itemToEdit) {
      const formattedItem = {
        ...itemToEdit,
        fecha_compra: itemToEdit.fecha_compra
          ? itemToEdit.fecha_compra.split("T")[0]
          : "",
        fecha_vencimiento_garantia: itemToEdit.fecha_vencimiento_garantia
          ? itemToEdit.fecha_vencimiento_garantia.split("T")[0]
          : "",
        proveedor_id:
          itemToEdit.proveedor_id ||
          (itemToEdit.proveedores ? itemToEdit.proveedores.id : ""),
      };
      setFormData(formattedItem);
    } else {
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
        vida_util: 5,
        valor_residual: 0,
        imagen: "",
        factura_pdf_url: "",
      });
    }
  }, [itemToEdit]);

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

  const uploadFile = async (file, bucketFolder) => {
    if (!file || !activeCompany) return null;
    const fileName = `${activeCompany.id}/${bucketFolder}/${Date.now()}-${
      file.name
    }`;
    const { error: uploadError } = await supabase.storage
      .from("activos")
      .upload(fileName, file);
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from("activos").getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const imageUrl = await uploadFile(imagenFile, "imagenes_equipos");
      const facturaUrl = await uploadFile(facturaFile, "facturas_equipos");

      const dataToSubmit = {
        ...formData,
        imagen: imageUrl ?? formData.imagen,
        factura_pdf_url: facturaUrl ?? formData.factura_pdf_url,
        proveedor_id: formData.proveedor_id || null,

        // ▼▼▼ AQUÍ ESTÁ LA CORRECCIÓN ▼▼▼
        // Si los campos de fecha están vacíos, los convertimos a null.
        fecha_compra: formData.fecha_compra || null,
        fecha_vencimiento_garantia: formData.fecha_vencimiento_garantia || null,
      };

      // Limpiamos los datos anidados que no son columnas reales antes de enviar.
      delete dataToSubmit.proveedores;
      delete dataToSubmit.registros;

      let error;
      if (itemToEdit) {
        const { id, ...dataToUpdate } = dataToSubmit;
        ({ error } = await supabase
          .from("equipos")
          .update(dataToUpdate)
          .eq("id", itemToEdit.id));
      } else {
        const newRecord = { ...dataToSubmit, company_id: activeCompany.id };
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-xl font-semibold mb-4">
        {itemToEdit ? "Editar Equipo" : "Añadir Equipo"}
      </h3>

      <h4 className="text-lg font-medium text-gray-800 border-b pb-2">
        Detalles del Equipo
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label>Marca</label>
          <input
            type="text"
            name="marca"
            value={formData.marca}
            onChange={handleChange}
            required
            className="input-style"
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
            className="input-style"
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
            className="input-style"
          />
        </div>
        <div className="md:col-span-2">
          <label>Ubicación</label>
          <input
            type="text"
            name="ubicacion"
            value={formData.ubicacion}
            onChange={handleChange}
            className="input-style"
          />
        </div>
        <div>
          <label>Estado Físico</label>
          <select
            name="estado"
            value={formData.estado}
            onChange={handleChange}
            className="input-style"
          >
            <option>Bueno</option>
            <option>Regular</option>
            <option>Malo</option>
          </select>
        </div>
      </div>

      <h4 className="text-lg font-medium text-gray-800 border-b pb-2 mt-4">
        Información de Compra y Financiera
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <label>Número de Factura</label>
          <input
            type="text"
            name="numero_factura"
            value={formData.numero_factura}
            onChange={handleChange}
            className="input-style"
          />
        </div>
        <div>
          <label>Fecha de Compra</label>
          <input
            type="date"
            name="fecha_compra"
            value={formData.fecha_compra}
            onChange={handleChange}
            className="input-style"
          />
        </div>
        <div>
          <label>Vencimiento de Garantía</label>
          <input
            type="date"
            name="fecha_vencimiento_garantia"
            value={formData.fecha_vencimiento_garantia}
            onChange={handleChange}
            className="input-style"
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
            className="input-style"
          />
        </div>
        <div>
          <label>Vida Útil (Años)</label>
          <input
            type="number"
            name="vida_util"
            placeholder="Ej: 5"
            value={formData.vida_util}
            onChange={handleChange}
            className="input-style"
          />
        </div>
        <div className="md:col-span-3">
          <label>Valor Residual</label>
          <input
            type="number"
            name="valor_residual"
            step="0.01"
            placeholder="0.00"
            value={formData.valor_residual}
            onChange={handleChange}
            className="input-style"
          />
        </div>

        <div className="md:col-span-3 grid grid-cols-2 gap-4 pt-2">
          <div>
            <label>Imagen del Activo</label>
            <input
              type="file"
              name="imagen"
              onChange={handleFileChange}
              accept="image/*"
              className="input-style-file"
            />
          </div>
          <div>
            <label>Factura (PDF)</label>
            <input
              type="file"
              name="factura_pdf"
              onChange={handleFileChange}
              accept="application/pdf"
              className="input-style-file"
            />
          </div>
        </div>
      </div>

      <div className="pt-4 text-right">
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </form>
  );
}

export default EquipoForm;
