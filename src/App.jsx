import { createBrowserRouter, createRoutesFromElements, Routes, Route, useNavigate, useLocation, Outlet, Navigate } from "react-router-dom";
import { AppProvider, useAppContext } from "./context/AppContext";
import ConfirmationModal from "./components/common/ConfirmationModal";

// Layouts & Pages
import AuthPage from "./pages/AuthPage";
import MainLayout from "./components/layout/MainLayout";
import { Toaster } from "react-hot-toast";
import DashboardPage from "./pages/DashboardPage";
import InventarioPage from "./pages/InventarioPage";
import HojasDeVidaPage from "./pages/HojasDeVidaPage";
import RegistroPage from "./pages/RegistroPage";
import ProveedoresPage from "./pages/ProveedoresPage";
import MantenimientoPage from "./pages/MantenimientoPage";
import ReportesPage from "./pages/ReportesPage";
import EmpresasPage from "./pages/EmpresasPage";
import MapasPage from "./pages/MapasPage";
import ComprasPage from "./pages/ComprasPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";

// Componente para manejar la protección de rutas
function ProtectedRoot() {
  const { session, loading } = useAppContext();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        Cargando...
      </div>
    );
  }

  const publicRoutes = ["/login", "/reset-password"];

  if (!session && !publicRoutes.includes(location.pathname)) {
    return <Navigate to="/login" replace />;
  }

  if (session && publicRoutes.includes(location.pathname)) {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: "#363636",
            color: "#fff",
          },
        }}
      />
      <Outlet />
      <ConfirmationModal />
    </>
  );
}

export const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<AppProvider><ProtectedRoot /></AppProvider>}>
      <Route path="/login" element={<AuthPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
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
        <Route path="mapas" element={<MapasPage />} />
        <Route path="reportes" element={<ReportesPage />} />
        <Route path="empresas" element={<EmpresasPage />} />
        <Route path="compras" element={<ComprasPage />} />
      </Route>
    </Route>
  )
);

function App() {
  // Este componente ya no se usa directamente por RouterProvider en main.jsx
  return null;
}

export default App;
