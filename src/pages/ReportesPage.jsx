// src/pages/ReportesPage.jsx

import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useAppContext } from "../context/AppContext";
import BarChart from "../components/charts/BarChart";
import DoughnutChart from "../components/charts/DoughnutChart";

function ReportesPage() {
  const { activeCompany } = useAppContext();
  const [reportData, setReportData] = useState({
    costoTotal: 0,
    costoPromedioUsuario: 0,
    costoPorTipo: null,
    costoPorProveedor: null,
  });
  const [depreciationData, setDepreciationData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Formateador para moneda
  const formatCurrency = (value) => {
    if (value === null || value === undefined) return "N/A";
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(value);
  };

  useEffect(() => {
    if (!activeCompany) {
      setLoading(false);
      return;
    }

    const fetchAllReports = async () => {
      setLoading(true);
      setError(null);
      try {
        const { id: companyId } = activeCompany;

        // Ejecutamos todas las consultas de reportes en paralelo para mayor eficiencia
        const [costReportRes, depreciationRes] = await Promise.all([
          // Promesa para los datos de costos
          Promise.all([
            supabase
              .from("proveedores")
              .select("id, nombre")
              .eq("company_id", companyId),
            supabase
              .from("equipos")
              .select("proveedor_id, costo")
              .eq("company_id", companyId),
            supabase
              .from("software")
              .select("proveedor_id, costo")
              .eq("company_id", companyId),
            supabase
              .from("perifericos")
              .select("proveedor_id, costo")
              .eq("company_id", companyId),
            supabase
              .from("registros")
              .select("*", { count: "exact", head: true })
              .eq("company_id", companyId),
          ]),
          // Promesa para los datos de depreciación
          supabase.rpc("get_assets_with_depreciation", {
            p_company_id: companyId,
          }),
        ]);

        // --- Procesamiento de Reporte de Costos ---
        const [
          proveedoresRes,
          equiposRes,
          softwareRes,
          perifericosRes,
          registrosRes,
        ] = costReportRes;

        const proveedores = proveedoresRes.data || [];
        const equipos = equiposRes.data || [];
        const software = softwareRes.data || [];
        const perifericos = perifericosRes.data || [];
        const totalUsuarios = registrosRes.count || 0;

        const costoEquipos = equipos.reduce(
          (sum, item) => sum + (Number(item.costo) || 0),
          0
        );
        const costoSoftware = software.reduce(
          (sum, item) => sum + (Number(item.costo) || 0),
          0
        );
        const costoPerifericos = perifericos.reduce(
          (sum, item) => sum + (Number(item.costo) || 0),
          0
        );

        const costoTotal = costoEquipos + costoSoftware + costoPerifericos;
        const costoPromedioUsuario =
          totalUsuarios > 0 ? costoTotal / totalUsuarios : 0;

        const todosLosActivos = [...equipos, ...software, ...perifericos];
        const costoPorProveedor = proveedores
          .map((proveedor) => {
            const costoTotal = todosLosActivos
              .filter((activo) => activo.proveedor_id === proveedor.id)
              .reduce((sum, activo) => sum + (Number(activo.costo) || 0), 0);
            return { nombre: proveedor.nombre, costo: costoTotal };
          })
          .filter((p) => p.costo > 0);

        setReportData({
          costoTotal,
          costoPromedioUsuario,
          costoPorTipo: {
            labels: ["Equipos", "Software", "Periféricos"],
            data: [costoEquipos, costoSoftware, costoPerifericos],
          },
          costoPorProveedor: {
            labels: costoPorProveedor.map((p) => p.nombre),
            data: costoPorProveedor.map((p) => p.costo),
          },
        });

        // --- Procesamiento de Reporte de Depreciación ---
        if (depreciationRes.error) throw depreciationRes.error;
        setDepreciationData(depreciationRes.data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAllReports();
  }, [activeCompany]);

  if (loading)
    return <div className="text-center p-8">Cargando reportes...</div>;
  if (error)
    return <div className="text-center p-8 text-red-600">Error: {error}</div>;

  return (
    <div className="p-6 sm:p-8 space-y-8">
      <h1 className="text-3xl font-bold">Reportes y Análisis</h1>

      {/* Tarjetas de Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <p className="text-sm font-medium text-gray-500">
            Costo Total del Inventario
          </p>
          <p className="text-3xl font-bold text-gray-900">
            {formatCurrency(reportData.costoTotal)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <p className="text-sm font-medium text-gray-500">
            Costo Promedio por Usuario
          </p>
          <p className="text-3xl font-bold text-gray-900">
            {formatCurrency(reportData.costoPromedioUsuario)}
          </p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h3 className="font-semibold text-lg mb-4">
            Costo por Tipo de Activo
          </h3>
          <div className="h-80 w-full">
            {reportData.costoPorTipo && (
              <DoughnutChart chartData={reportData.costoPorTipo} />
            )}
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h3 className="font-semibold text-lg mb-4">Costo por Proveedor</h3>
          <div className="h-80 w-full">
            {reportData.costoPorProveedor && (
              <BarChart chartData={reportData.costoPorProveedor} />
            )}
          </div>
        </div>
      </div>

      {/* Reporte de Depreciación de Activos */}
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h3 className="font-semibold text-lg mb-4">
          Reporte de Depreciación de Activos
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="th-cell">Activo</th>
                <th className="th-cell">Costo Original</th>
                <th className="th-cell">Deprec. Anual</th>
                <th className="th-cell">Deprec. Acumulada</th>
                <th className="th-cell text-right font-bold">
                  Valor Actual en Libros
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {depreciationData.length > 0 ? (
                depreciationData.map((asset) => (
                  <tr key={asset.id}>
                    <td className="td-cell font-medium">
                      {asset.activo}
                      <p className="text-xs text-gray-500">
                        Comprado:{" "}
                        {new Date(asset.fecha_compra).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="td-cell">{formatCurrency(asset.costo)}</td>
                    <td className="td-cell">
                      {formatCurrency(asset.depreciacion_anual)}
                    </td>
                    <td className="td-cell text-red-600">
                      {formatCurrency(asset.depreciacion_acumulada)}
                    </td>
                    <td className="td-cell text-right font-bold text-green-700">
                      {formatCurrency(asset.valor_actual)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-gray-500">
                    No hay equipos con datos suficientes para calcular la
                    depreciación.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default ReportesPage;
