import React, { useEffect } from "react"; // <-- CORRECCIÓN APLICADA AQUÍ
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { AppProvider, useAppContext } from "./context/AppContext";

// Layouts & Pages
import AuthPage from "./pages/AuthPage";
import MainLayout from "./components/layout/MainLayout";
import DashboardPage from "./pages/DashboardPage";
import InventarioPage from "./pages/InventarioPage";
import HojasDeVidaPage from "./pages/HojasDeVidaPage";
import RegistroPage from "./pages/RegistroPage";
import ProveedoresPage from "./pages/ProveedoresPage";
import MantenimientoPage from "./pages/MantenimientoPage";
import ReportesPage from "./pages/ReportesPage";
import EmpresasPage from "./pages/EmpresasPage";

// Componente interno para manejar las redirecciones y la lógica de rutas
function AppRoutes() {
  const { session, loading } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading) {
      if (session && location.pathname === "/login") {
        navigate("/");
      } else if (!session && location.pathname !== "/login") {
        navigate("/login");
      }
    }
  }, [session, loading, navigate, location.pathname]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        Cargando...
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<AuthPage />} />
      <Route path="/" element={<MainLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="inventario" element={<InventarioPage />} />
        <Route path="hojas-de-vida" element={<HojasDeVidaPage />} />
        <Route path="hojas-de-vida/nuevo" element={<RegistroPage />} />
        <Route
          path="hojas-de-vida/editar/:registroId"
          element={<RegistroPage />}
        />
        <Route path="proveedores" element={<ProveedoresPage />} />
        <Route path="mantenimiento" element={<MantenimientoPage />} />
        <Route path="reportes" element={<ReportesPage />} />
        <Route path="empresas" element={<EmpresasPage />} />
      </Route>
    </Routes>
  );
}

// El componente principal ahora solo configura el Proveedor de Contexto
function App() {
  return (
    <AppProvider>
      <AppRoutes />
    </AppProvider>
  );
}

export default App;
