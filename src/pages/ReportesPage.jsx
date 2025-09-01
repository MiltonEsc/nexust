// src/pages/ReportesPage.jsx

import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import BarChart from "../components/charts/BarChart";

function ReportesPage() {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAndProcessData = async () => {
      try {
        setLoading(true);
        // 1. Obtenemos todos los datos necesarios en paralelo
        const [proveedoresRes, equiposRes, softwareRes, perifericosRes] =
          await Promise.all([
            supabase.from("proveedores").select("id, nombre"),
            supabase.from("equipos").select("proveedor_id, costo"),
            supabase.from("software").select("proveedor_id, costo"),
            supabase.from("perifericos").select("proveedor_id, costo"),
          ]);

        if (
          proveedoresRes.error ||
          equiposRes.error ||
          softwareRes.error ||
          perifericosRes.error
        ) {
          throw new Error("Error al obtener los datos para el reporte.");
        }

        const proveedores = proveedoresRes.data;
        // Unimos todos los activos en un solo array
        const todosLosActivos = [
          ...(equiposRes.data || []),
          ...(softwareRes.data || []),
          ...(perifericosRes.data || []),
        ];

        // 2. Procesamos los datos para calcular el costo por proveedor
        const costoPorProveedor = proveedores
          .map((proveedor) => {
            const costoTotal = todosLosActivos
              .filter((activo) => activo.proveedor_id === proveedor.id)
              .reduce(
                (sum, activo) => sum + (parseFloat(activo.costo) || 0),
                0
              );

            return {
              nombre: proveedor.nombre,
              costo: costoTotal,
            };
          })
          .filter((p) => p.costo > 0); // Solo mostramos proveedores con costos asociados

        // 3. Formateamos los datos para Chart.js
        setChartData({
          labels: costoPorProveedor.map((p) => p.nombre),
          data: costoPorProveedor.map((p) => p.costo),
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAndProcessData();
  }, []);

  return (
    <div className="p-6 sm:p-8 space-y-8">
      <h1 className="text-3xl font-bold">Reportes y Análisis</h1>

      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h3 className="font-semibold text-lg mb-4">Costo por Proveedor</h3>
        <div className="h-96 w-full">
          {loading && <p>Cargando datos del gráfico...</p>}
          {error && <p className="text-red-600">{error}</p>}
          {chartData && <BarChart chartData={chartData} />}
        </div>
      </div>

      {/* Aquí podrías añadir más gráficos en el futuro */}
    </div>
  );
}

export default ReportesPage;
