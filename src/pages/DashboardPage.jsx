// src/pages/DashboardPage.jsx

import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useAppContext } from "../context/AppContext";

function DashboardPage() {
  const { activeCompany } = useAppContext();
  const [dashboardData, setDashboardData] = useState({
    stats: {
      totalEquipos: 0,
      totalUsuarios: 0,
      enReparacion: 0,
      licenciasDisponibles: 0,
    },
    estadoEquipos: [],
    licenciasPorVencer: [],
    garantiasPorVencer: [],
    actividadReciente: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!activeCompany) {
      setLoading(false);
      return; // Si no hay compañía activa, no hacemos nada
    }

    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // 1. Obtenemos todos los datos necesarios en paralelo
        const [equiposRes, registrosRes, softwareRes, perifericosRes] =
          await Promise.all([
            supabase
              .from("equipos")
              .select("*, trazabilidad")
              .eq("company_id", activeCompany.id),
            supabase
              .from("registros")
              .select("*")
              .eq("company_id", activeCompany.id),
            supabase
              .from("software")
              .select("*")
              .eq("company_id", activeCompany.id),
            supabase
              .from("perifericos")
              .select("*")
              .eq("company_id", activeCompany.id),
          ]);

        const equipos = equiposRes.data || [];
        const registros = registrosRes.data || [];
        const software = softwareRes.data || [];
        const perifericos = perifericosRes.data || [];

        // --- 2. Procesamos los datos ---

        // STATS
        const totalEquipos = equipos.length;
        const totalUsuarios = registros.length;
        const enReparacion = equipos.filter(
          (e) => e.estado === "En reparación"
        ).length;
        const totalLicenciasStock = software.reduce(
          (sum, s) => sum + (s.stock || 0),
          0
        );
        const licenciasAsignadas = registros.flatMap(
          (r) => r.software_ids || []
        ).length;
        const licenciasDisponibles = totalLicenciasStock - licenciasAsignadas;

        // ESTADO DE EQUIPOS
        const estados = ["Bueno", "Regular", "Malo", "En reparación"];
        const estadoEquiposData = estados.map((estado) => {
          const count = equipos.filter((e) => e.estado === estado).length;
          return {
            estado,
            count,
            percentage: totalEquipos > 0 ? (count / totalEquipos) * 100 : 0,
          };
        });

        // LISTAS DE VENCIMIENTO
        const hoy = new Date();
        const limite = new Date();
        limite.setDate(hoy.getDate() + 90);

        const licenciasPorVencer = software.filter((s) => {
          const fechaVencimiento = new Date(s.fecha_vencimiento);
          return (
            s.fecha_vencimiento &&
            fechaVencimiento >= hoy &&
            fechaVencimiento <= limite
          );
        });

        const garantiasPorVencer = [...equipos, ...perifericos].filter(
          (item) => {
            const fechaVencimiento = new Date(item.fecha_vencimiento_garantia);
            return (
              item.fecha_vencimiento_garantia &&
              fechaVencimiento >= hoy &&
              fechaVencimiento <= limite
            );
          }
        );

        // ACTIVIDAD RECIENTE
        const allLogs = [...equipos, ...registros]
          .flatMap((item) =>
            (item.trazabilidad || []).map((log) => ({
              ...log,
              itemName: item.nombre || `${item.marca} ${item.modelo}`,
              id: `${item.id}-${log.fecha}`, // ID único para la key de React
            }))
          )
          .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
          .slice(0, 5); // Tomamos los 5 más recientes

        // 3. Actualizamos el estado con los datos procesados
        setDashboardData({
          stats: {
            totalEquipos,
            totalUsuarios,
            enReparacion,
            licenciasDisponibles,
          },
          estadoEquipos: estadoEquiposData,
          licenciasPorVencer,
          garantiasPorVencer,
          actividadReciente: allLogs,
        });
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [activeCompany]);

  if (loading)
    return (
      <div className="text-center p-8">Cargando datos del dashboard...</div>
    );
  if (error)
    return <div className="text-center p-8 text-red-600">Error: {error}</div>;

  const {
    stats,
    estadoEquipos,
    licenciasPorVencer,
    garantiasPorVencer,
    actividadReciente,
  } = dashboardData;
  const statusColors = {
    Bueno: "bg-green-500",
    Regular: "bg-yellow-500",
    Malo: "bg-orange-500",
    "En reparación": "bg-red-500",
  };

  return (
    <div className="space-y-6">
      {/* --- Stat Cards --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <p className="text-sm font-medium text-gray-500">Equipos Totales</p>
          <p className="text-3xl font-bold text-gray-900">
            {stats.totalEquipos}
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <p className="text-sm font-medium text-gray-500">Usuarios Activos</p>
          <p className="text-3xl font-bold text-gray-900">
            {stats.totalUsuarios}
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <p className="text-sm font-medium text-gray-500">
            Licencias Disponibles
          </p>
          <p className="text-3xl font-bold text-green-600">
            {stats.licenciasDisponibles}
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <p className="text-sm font-medium text-gray-500">
            Activos en Reparación
          </p>
          <p className="text-3xl font-bold text-red-600">
            {stats.enReparacion}
          </p>
        </div>
      </div>

      {/* --- Gráficos y Listas --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h3 className="font-semibold text-lg mb-4">Estado de Equipos</h3>
          <div className="space-y-3">
            {estadoEquipos.map(({ estado, count, percentage }) => (
              <div key={estado} className="flex items-center">
                <span className="w-28 text-sm text-gray-600">{estado}</span>
                <div className="flex-1 bg-gray-200 rounded-full h-4">
                  <div
                    className={`${statusColors[estado]} h-4 rounded-full`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
                <span className="w-12 text-right text-sm font-medium">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h3 className="font-semibold text-lg mb-4">
            Licencias Próximas a Vencer (90 días)
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {licenciasPorVencer.length > 0 ? (
              licenciasPorVencer.map((lic) => (
                <div
                  key={lic.id}
                  className="flex justify-between items-center text-sm"
                >
                  <p>{lic.nombre}</p>
                  <p className="font-medium text-yellow-600">
                    Vence:{" "}
                    {new Date(lic.fecha_vencimiento).toLocaleDateString()}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">
                No hay licencias próximas a vencer.
              </p>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h3 className="font-semibold text-lg mb-4">
            Garantías Próximas a Vencer (90 días)
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {garantiasPorVencer.length > 0 ? (
              garantiasPorVencer.map((item) => (
                <div
                  key={`${item.id}-${item.numero_serie || item.tipo}`}
                  className="flex justify-between items-center text-sm"
                >
                  <p>
                    {item.marca} {item.modelo || item.tipo}
                  </p>
                  <p className="font-medium text-yellow-600">
                    Vence:{" "}
                    {new Date(
                      item.fecha_vencimiento_garantia
                    ).toLocaleDateString()}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">
                No hay garantías próximas a vencer.
              </p>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h3 className="font-semibold text-lg mb-4">Actividad Reciente</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {actividadReciente.length > 0 ? (
              actividadReciente.map((log) => (
                <div key={log.id} className="text-sm border-b pb-2">
                  <p>
                    <span className="font-semibold">{log.accion}:</span>{" "}
                    {log.detalle}{" "}
                    <span className="text-gray-500">(en {log.itemName})</span>
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(log.fecha).toLocaleString()}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">
                No hay actividad reciente.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
