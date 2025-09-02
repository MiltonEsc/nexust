// src/components/modals/ImportCSVModal.jsx

import React, { useState } from "react";
import { supabase } from "../../supabaseClient";
import Modal from "../common/Modal";

function ImportCSVModal({
  isOpen,
  onClose,
  onSuccess,
  activeTab,
  activeCompanyId,
}) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = (e) => {
    // Resetea el estado cuando se selecciona un nuevo archivo
    setFile(e.target.files[0]);
    setError("");
  };

  const processCSV = () => {
    if (!file) {
      setError("Por favor, selecciona un archivo CSV.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      setLoading(true);
      setError("");
      const text = e.target.result;
      const lines = text.split(/\r\n|\n/).filter((line) => line.trim() !== "");
      if (lines.length < 2) {
        setError("El archivo CSV está vacío o solo contiene la cabecera.");
        setLoading(false);
        return;
      }

      const headers = lines[0].split(",").map((h) => h.trim());
      const rows = lines.slice(1).map((line) => {
        const values = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
        return values.map((v) => v.replace(/^"|"$/g, ""));
      });

      const dataToInsert = rows.map((row) => {
        const obj = { company_id: activeCompanyId };
        headers.forEach((header, index) => {
          let value = row[index] || null;
          if (value === "") value = null;
          if (value && header.startsWith("fecha_")) {
            const date = new Date(value);
            value = isNaN(date) ? null : date.toISOString();
          }
          if (value && (header === "costo" || header === "stock")) {
            value = parseFloat(value) || 0;
          }
          if (value && header === "induccion_tic") {
            value = value.toLowerCase() === "true" || value === "1";
          }
          obj[header] = value;
        });
        return obj;
      });

      try {
        const { error: insertError } = await supabase
          .from(activeTab)
          .insert(dataToInsert);
        if (insertError) throw insertError;

        alert(`¡Éxito! Se importaron ${dataToInsert.length} registros.`);
        onSuccess();
      } catch (err) {
        setError(
          `Error al importar: ${err.message}. Asegúrate de que las columnas del CSV coinciden con la plantilla.`
        );
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadSample = () => {
    let sampleHeaders = "";
    let sampleData = "";

    // Lógica para generar la plantilla correcta
    switch (activeTab) {
      case "registros":
        sampleHeaders =
          "nombre,cargo,departamento,cedula,fecha_ingreso,induccion_tic";
        sampleData =
          "Juan Perez,Desarrollador,Tecnología,12345678,2023-05-20,true\nMaria Lopez,Diseñadora,Marketing,87654321,2023-08-10,false";
        break;
      case "equipos":
        sampleHeaders =
          "marca,modelo,numero_serie,estado,ubicacion,numero_factura,fecha_compra,fecha_vencimiento_garantia,costo";
        sampleData =
          "HP,ProBook 440 G8,S/N12345,Bueno,Oficina Principal,F-001,2023-01-15,2025-01-14,1200.50";
        break;
      case "perifericos":
        sampleHeaders =
          "tipo,marca,modelo,numero_serie,estado,numero_factura,fecha_compra,fecha_vencimiento_garantia,costo";
        sampleData =
          "Monitor,Dell,UltraSharp U2419H,S/N-MON1,Bueno,F-003,2023-02-20,2026-02-19,350.00";
        break;
      case "software":
        sampleHeaders =
          "nombre,version,stock,numero_factura,fecha_compra,fecha_vencimiento,costo";
        sampleData =
          "Microsoft Office,2021,50,F-S001,2023-01-01,2025-01-01,5000.00";
        break;
    }

    const csvContent = `${sampleHeaders}\n${sampleData}`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `plantilla_importacion_${activeTab}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getHeadersForTab = () => {
    switch (activeTab) {
      case "registros":
        return "nombre,cargo,departamento,cedula,fecha_ingreso,induccion_tic";
      case "equipos":
        return "marca,modelo,numero_serie,estado,ubicacion,numero_factura,fecha_compra,fecha_vencimiento_garantia,costo";
      case "perifericos":
        return "tipo,marca,modelo,numero_serie,estado,numero_factura,fecha_compra,fecha_vencimiento_garantia,costo";
      case "software":
        return "nombre,version,stock,numero_factura,fecha_compra,fecha_vencimiento,costo";
      default:
        return "Cargando...";
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Importar ${activeTab}`}>
      <div className="space-y-4">
        <div>
          <h4 className="font-semibold">Instrucciones:</h4>
          <p className="text-sm text-gray-600">
            Asegúrate que tu archivo CSV tenga las siguientes columnas en este
            orden exacto:
          </p>
          <code className="text-xs bg-gray-100 p-2 rounded-md block mt-2 whitespace-pre-wrap">
            {getHeadersForTab()}
          </code>
          <button
            onClick={handleDownloadSample}
            className="text-sm text-blue-600 hover:underline mt-2"
          >
            Descargar plantilla de ejemplo
          </button>
        </div>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="text-right pt-4">
          <button
            onClick={processCSV}
            className="btn-primary"
            disabled={loading || !file}
          >
            {loading ? "Importando..." : "Importar Archivo"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default ImportCSVModal;
