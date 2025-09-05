import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Monitor,
  Package,
  Zap,
  DollarSign,
  Calendar,
  Activity,
  Filter,
  Download,
  RefreshCw,
} from "lucide-react";
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
      valorTotalActivos: 0,
      costoMantenimiento: 0,
      equiposObsoletos: 0,
      alertasActivas: 0,
    },
    estadoEquipos: [],
    tendenciasMensuales: [],
    distribucionTipos: [],
    licenciasPorVencer: [],
    garantiasPorVencer: [],
    actividadReciente: [],
    depreciacionActivos: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState("30d");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!activeCompany) {
      setLoading(false);
      return;
    }
    fetchDashboardData();
  }, [activeCompany, selectedTimeRange]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Obtener datos base en paralelo
      const [
        equiposRes,
        registrosRes,
        softwareRes,
        perifericosRes,
        depreciacionRes,
      ] = await Promise.all([
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
        supabase.rpc("get_assets_with_depreciation", {
          p_company_id: activeCompany.id,
        }),
      ]);

      const equipos = equiposRes.data || [];
      const registros = registrosRes.data || [];
      const software = softwareRes.data || [];
      const perifericos = perifericosRes.data || [];
      const depreciacion = depreciacionRes.data || [];

      // Calcular estadísticas principales
      const stats = calculateStats(
        equipos,
        registros,
        software,
        perifericos,
        depreciacion
      );

      // Procesar datos para gráficos
      const estadoEquipos = processEquipoStatus(equipos);
      const tendenciasMensuales = processTrends(equipos);
      const distribucionTipos = processTypeDistribution(equipos, perifericos);

      // Calcular vencimientos
      const { licenciasPorVencer, garantiasPorVencer } = processExpirations(
        software,
        equipos,
        perifericos
      );

      // Actividad reciente
      const actividadReciente = processRecentActivity(equipos, registros);

      setDashboardData({
        stats,
        estadoEquipos,
        tendenciasMensuales,
        distribucionTipos,
        licenciasPorVencer,
        garantiasPorVencer,
        actividadReciente,
        depreciacionActivos: depreciacion,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (
    equipos,
    registros,
    software,
    perifericos,
    depreciacion
  ) => {
    const totalEquipos = equipos.length;
    const totalUsuarios = registros.length;
    const enReparacion = equipos.filter(
      (e) => e.estado === "En reparación"
    ).length;

    // Licencias disponibles
    const totalLicenciasStock = software.reduce(
      (sum, s) => sum + (s.stock || 0),
      0
    );
    const licenciasAsignadas = registros.flatMap(
      (r) => r.software_ids || []
    ).length;
    const licenciasDisponibles = totalLicenciasStock - licenciasAsignadas;

    // Valor total de activos
    const valorTotalActivos = [
      ...equipos.filter((e) => e.costo).map((e) => e.costo),
      ...perifericos.filter((p) => p.costo).map((p) => p.costo),
      ...software.filter((s) => s.costo).map((s) => s.costo),
    ].reduce((sum, cost) => sum + parseFloat(cost), 0);

    // Equipos obsoletos (más de 5 años)
    const fechaLimite = new Date();
    fechaLimite.setFullYear(fechaLimite.getFullYear() - 5);
    const equiposObsoletos = equipos.filter(
      (e) => e.fecha_compra && new Date(e.fecha_compra) < fechaLimite
    ).length;

    // Costos de mantenimiento (últimos 3 meses)
    const fechaMantenimiento = new Date();
    fechaMantenimiento.setMonth(fechaMantenimiento.getMonth() - 3);

    let costoMantenimiento = 0;
    equipos.forEach((equipo) => {
      if (equipo.trazabilidad) {
        const mantenimientos = equipo.trazabilidad.filter(
          (log) =>
            log.accion === "Mantenimiento" &&
            new Date(log.fecha) >= fechaMantenimiento
        );
        // Estimamos costo promedio por mantenimiento
        costoMantenimiento += mantenimientos.length * 50000; // $50k promedio
      }
    });

    // Alertas activas
    const hoy = new Date();
    const limite90 = new Date();
    limite90.setDate(hoy.getDate() + 90);

    const licenciasVencimiento = software.filter((s) => {
      const fechaVencimiento = new Date(s.fecha_vencimiento);
      return (
        s.fecha_vencimiento &&
        fechaVencimiento >= hoy &&
        fechaVencimiento <= limite90
      );
    }).length;

    const garantiasVencimiento = [...equipos, ...perifericos].filter((item) => {
      const fechaVencimiento = new Date(item.fecha_vencimiento_garantia);
      return (
        item.fecha_vencimiento_garantia &&
        fechaVencimiento >= hoy &&
        fechaVencimiento <= limite90
      );
    }).length;

    const alertasActivas =
      licenciasVencimiento +
      garantiasVencimiento +
      enReparacion +
      equiposObsoletos;

    return {
      totalEquipos,
      totalUsuarios,
      enReparacion,
      licenciasDisponibles,
      valorTotalActivos,
      costoMantenimiento,
      equiposObsoletos,
      alertasActivas,
    };
  };

  const processEquipoStatus = (equipos) => {
    const estados = ["Bueno", "Regular", "Malo", "En reparación"];
    const colores = {
      Bueno: "#10B981",
      Regular: "#F59E0B",
      Malo: "#EF4444",
      "En reparación": "#8B5CF6",
    };

    return estados.map((estado) => {
      const count = equipos.filter((e) => e.estado === estado).length;
      const percentage =
        equipos.length > 0 ? (count / equipos.length) * 100 : 0;
      return {
        estado,
        count,
        percentage,
        color: colores[estado],
      };
    });
  };

  const processTrends = (equipos) => {
    const meses = [
      "Ene",
      "Feb",
      "Mar",
      "Abr",
      "May",
      "Jun",
      "Jul",
      "Ago",
      "Sep",
      "Oct",
      "Nov",
      "Dic",
    ];
    const fechaActual = new Date();
    const tendencias = [];

    for (let i = 4; i >= 0; i--) {
      const fecha = new Date(
        fechaActual.getFullYear(),
        fechaActual.getMonth() - i,
        1
      );
      const mesIndex = fecha.getMonth();
      const año = fecha.getFullYear();

      // Equipos comprados hasta esa fecha
      const equiposHastaFecha = equipos.filter(
        (e) => e.fecha_compra && new Date(e.fecha_compra) <= fecha
      ).length;

      // Mantenimientos en ese mes
      const mantenimientosEnMes = equipos.reduce((count, equipo) => {
        if (!equipo.trazabilidad) return count;
        return (
          count +
          equipo.trazabilidad.filter((log) => {
            const logFecha = new Date(log.fecha);
            return (
              log.accion === "Mantenimiento" &&
              logFecha.getMonth() === mesIndex &&
              logFecha.getFullYear() === año
            );
          }).length
        );
      }, 0);

      // Costos estimados del mes
      const costosEstimados = mantenimientosEnMes * 50000;

      tendencias.push({
        mes: meses[mesIndex],
        equipos: equiposHastaFecha,
        mantenimientos: mantenimientosEnMes,
        costos: costosEstimados,
      });
    }

    return tendencias;
  };

  const processTypeDistribution = (equipos, perifericos) => {
    // Agrupar equipos por marca/tipo
    const tiposEquipos = {};
    equipos.forEach((equipo) => {
      const tipo = equipo.marca || "Sin marca";
      tiposEquipos[tipo] = (tiposEquipos[tipo] || 0) + 1;
    });

    // Agrupar periféricos por tipo
    const tiposPerif = {};
    perifericos.forEach((periferico) => {
      const tipo = periferico.tipo || "Otro";
      tiposPerif[tipo] = (tiposPerif[tipo] || 0) + 1;
    });

    // Combinar y obtener los top 4
    const todosTipos = { ...tiposEquipos };
    Object.keys(tiposPerif).forEach((tipo) => {
      todosTipos[tipo] = (todosTipos[tipo] || 0) + tiposPerif[tipo];
    });

    return Object.entries(todosTipos)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([tipo, cantidad]) => {
        // Calcular valor promedio
        const equiposDelTipo = equipos.filter((e) => e.marca === tipo);
        const perifsDelTipo = perifericos.filter((p) => p.tipo === tipo);
        const valor = [
          ...equiposDelTipo.map((e) => e.costo || 0),
          ...perifsDelTipo.map((p) => p.costo || 0),
        ].reduce((sum, cost) => sum + parseFloat(cost), 0);

        return { tipo, cantidad, valor };
      });
  };

  const processExpirations = (software, equipos, perifericos) => {
    const hoy = new Date();
    const limite = new Date();
    limite.setDate(hoy.getDate() + 90);

    const licenciasPorVencer = software
      .filter((s) => {
        const fechaVencimiento = new Date(s.fecha_vencimiento);
        return (
          s.fecha_vencimiento &&
          fechaVencimiento >= hoy &&
          fechaVencimiento <= limite
        );
      })
      .map((s) => ({
        ...s,
        dias: Math.ceil(
          (new Date(s.fecha_vencimiento) - hoy) / (1000 * 60 * 60 * 24)
        ),
        criticidad:
          Math.ceil(
            (new Date(s.fecha_vencimiento) - hoy) / (1000 * 60 * 60 * 24)
          ) <= 15
            ? "alta"
            : "media",
      }))
      .sort((a, b) => a.dias - b.dias);

    const garantiasPorVencer = [...equipos, ...perifericos]
      .filter((item) => {
        const fechaVencimiento = new Date(item.fecha_vencimiento_garantia);
        return (
          item.fecha_vencimiento_garantia &&
          fechaVencimiento >= hoy &&
          fechaVencimiento <= limite
        );
      })
      .map((item) => ({
        ...item,
        dias: Math.ceil(
          (new Date(item.fecha_vencimiento_garantia) - hoy) /
            (1000 * 60 * 60 * 24)
        ),
      }))
      .sort((a, b) => a.dias - b.dias);

    return { licenciasPorVencer, garantiasPorVencer };
  };

  const processRecentActivity = (equipos, registros) => {
    const allLogs = [...equipos, ...registros]
      .flatMap((item) =>
        (item.trazabilidad || []).map((log) => ({
          ...log,
          itemName: item.nombre || `${item.marca} ${item.modelo}`,
          id: `${item.id}-${log.fecha}`,
        }))
      )
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
      .slice(0, 5);

    return allLogs;
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  const StatCard = ({
    title,
    value,
    change,
    changeType,
    icon: Icon,
    color = "blue",
  }) => (
    <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          <p className={`text-3xl font-bold text-${color}-600`}>{value}</p>
          {change && (
            <div
              className={`flex items-center mt-2 text-sm ${
                changeType === "increase" ? "text-green-600" : "text-red-600"
              }`}
            >
              {changeType === "increase" ? (
                <TrendingUp size={16} />
              ) : (
                <TrendingDown size={16} />
              )}
              <span className="ml-1">{change}</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg bg-${color}-100`}>
          <Icon size={24} className={`text-${color}-600`} />
        </div>
      </div>
    </div>
  );

  const AlertCard = ({ items, title, type = "warning" }) => (
    <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg text-gray-800">{title}</h3>
        <div
          className={`p-2 rounded-lg ${
            type === "warning" ? "bg-yellow-100" : "bg-red-100"
          }`}
        >
          <AlertTriangle
            size={20}
            className={type === "warning" ? "text-yellow-600" : "text-red-600"}
          />
        </div>
      </div>
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {items.length > 0 ? (
          items.map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex-1">
                <p className="font-medium text-gray-800 text-sm">
                  {item.nombre || `${item.marca} ${item.modelo}`}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Vence:{" "}
                  {new Date(
                    item.fecha_vencimiento || item.fecha_vencimiento_garantia
                  ).toLocaleDateString()}
                </p>
              </div>
              <div
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  item.dias <= 15
                    ? "bg-red-100 text-red-800"
                    : item.dias <= 30
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-blue-100 text-blue-800"
                }`}
              >
                {item.dias}d
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">
            No hay elementos próximos a vencer
          </p>
        )}
      </div>
    </div>
  );

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Cargando dashboard...</span>
      </div>
    );

  if (error)
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <AlertTriangle className="mx-auto text-red-600 mb-2" size={32} />
        <p className="text-red-800 font-medium">Error al cargar el dashboard</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
      </div>
    );

  const {
    stats,
    estadoEquipos,
    tendenciasMensuales,
    distribucionTipos,
    licenciasPorVencer,
    garantiasPorVencer,
    actividadReciente,
  } = dashboardData;

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Header con controles */}
      <div className="flex items-center justify-between bg-white rounded-xl p-6 shadow-lg">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Dashboard de Inventario
          </h1>
          <p className="text-gray-500 mt-1">Resumen general de activos IT</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">Últimos 7 días</option>
            <option value="30d">Últimos 30 días</option>
            <option value="90d">Últimos 90 días</option>
            <option value="1y">Último año</option>
          </select>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={`mr-2 ${refreshing ? "animate-spin" : ""}`}
            />
            {refreshing ? "Actualizando..." : "Actualizar"}
          </button>
        </div>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Equipos"
          value={stats.totalEquipos}
          icon={Monitor}
          color="blue"
        />
        <StatCard
          title="Usuarios Activos"
          value={stats.totalUsuarios}
          icon={Users}
          color="green"
        />
        <StatCard
          title="Valor Total Activos"
          value={
            stats.valorTotalActivos > 1000000
              ? `$${(stats.valorTotalActivos / 1000000).toFixed(1)}M`
              : `$${(stats.valorTotalActivos / 1000).toFixed(0)}K`
          }
          icon={DollarSign}
          color="purple"
        />
        <StatCard
          title="Alertas Activas"
          value={stats.alertasActivas}
          icon={AlertTriangle}
          color="red"
        />
      </div>

      {/* Gráficos principales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Estado de Equipos */}
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <h3 className="font-semibold text-lg mb-4 text-gray-800">
            Estado de Equipos
          </h3>
          {estadoEquipos.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={estadoEquipos}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="estado" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#8884d8" // Puedes usar un color base para la línea
                  strokeWidth={2}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No hay datos disponibles
            </div>
          )}
        </div>

        {/* Tendencias Mensuales */}
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <h3 className="font-semibold text-lg mb-4 text-gray-800">
            Tendencias Mensuales
          </h3>
          {tendenciasMensuales.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={tendenciasMensuales}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="equipos"
                  stroke="#3B82F6"
                  strokeWidth={3}
                  name="Equipos"
                />
                <Line
                  type="monotone"
                  dataKey="mantenimientos"
                  stroke="#EF4444"
                  strokeWidth={3}
                  name="Mantenimientos"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No hay datos de tendencias
            </div>
          )}
        </div>
      </div>

      {/* Distribución y Costos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <h3 className="font-semibold text-lg mb-4 text-gray-800">
            Distribución por Tipo
          </h3>
          {distribucionTipos.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={distribucionTipos}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="tipo" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="cantidad" fill="#10B981" name="Cantidad" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No hay datos de distribución
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg">
          <h3 className="font-semibold text-lg mb-4 text-gray-800">
            Costos Mensuales
          </h3>
          {tendenciasMensuales.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={tendenciasMensuales}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip
                  formatter={(value) => [
                    `$${value.toLocaleString()}`,
                    "Costos",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="costos"
                  stroke="#8B5CF6"
                  fill="#8B5CF6"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No hay datos de costos
            </div>
          )}
        </div>
      </div>

      {/* Alertas y Vencimientos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AlertCard
          title="Licencias por Vencer (90 días)"
          items={licenciasPorVencer}
          type="warning"
        />
        <AlertCard
          title="Garantías por Vencer (90 días)"
          items={garantiasPorVencer}
          type="warning"
        />
      </div>

      {/* Métricas secundarias */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="En Reparación"
          value={stats.enReparacion}
          icon={Clock}
          color="orange"
        />
        <StatCard
          title="Licencias Disponibles"
          value={stats.licenciasDisponibles}
          icon={Package}
          color="green"
        />
        <StatCard
          title="Equipos Obsoletos"
          value={stats.equiposObsoletos}
          icon={AlertTriangle}
          color="red"
        />
        <StatCard
          title="Costo Mantenimiento"
          value={
            stats.costoMantenimiento > 1000000
              ? `$${(stats.costoMantenimiento / 1000000).toFixed(1)}M`
              : `$${(stats.costoMantenimiento / 1000).toFixed(0)}K`
          }
          icon={DollarSign}
          color="purple"
        />
      </div>

      {/* Actividad Reciente */}
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg text-gray-800">
            Actividad Reciente
          </h3>
          <Activity className="text-blue-600" size={20} />
        </div>
        <div className="space-y-3">
          {actividadReciente.length > 0 ? (
            actividadReciente.map((log) => (
              <div
                key={log.id}
                className="flex items-start p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div
                  className={`p-2 rounded-full mr-4 ${
                    log.accion === "Mantenimiento"
                      ? "bg-blue-100"
                      : log.accion === "Asignación"
                      ? "bg-green-100"
                      : "bg-purple-100"
                  }`}
                >
                  {log.accion === "Mantenimiento" ? (
                    <Zap size={16} className="text-blue-600" />
                  ) : log.accion === "Asignación" ? (
                    <CheckCircle size={16} className="text-green-600" />
                  ) : (
                    <Activity size={16} className="text-purple-600" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-800">
                      {log.accion}: {log.detalle}
                    </p>
                    <span className="text-xs text-gray-500">
                      {new Date(log.fecha).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{log.itemName}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">
              No hay actividad reciente registrada
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
