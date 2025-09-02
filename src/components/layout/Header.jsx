// src/components/layout/Header.jsx

import React from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import Dropdown from "../common/Dropdown";
import { useAppContext } from "../../context/AppContext";

function Header() {
  const { session, companies, activeCompany, selectCompany } = useAppContext();
  const location = useLocation();
  const { pathname } = location;

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // ▼▼▼ CORRECCIÓN APLICADA AQUÍ ▼▼▼
  const handleCompanyChange = (e) => {
    selectCompany(e.target.value);
    // Se eliminó la línea "window.location.reload();"
  };

  const gestionRoutes = ["/hojas-de-vida", "/inventario", "/mantenimiento"];
  const adminRoutes = ["/empresas", "/proveedores", "/hojas-de-vida/nuevo"];

  return (
    <header className="bg-white shadow-md sticky top-0 z-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-3">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-gray-900 flex-shrink-0">
              Gestión de Activos TIC
            </h1>
            {activeCompany && (
              <select
                onChange={handleCompanyChange}
                value={activeCompany ? activeCompany.id : ""} // Aseguramos un valor controlado
                className="hidden sm:block bg-gray-50 border-gray-300 text-sm rounded-lg w-full max-w-xs p-2"
              >
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <nav className="hidden md:flex items-center space-x-1 text-gray-600 font-medium text-sm">
            <Link
              to="/"
              className={`nav-link ${pathname === "/" ? "active" : ""}`}
            >
              Dashboard
            </Link>

            <Dropdown
              title="Gestión"
              isActive={gestionRoutes.some((route) =>
                pathname.startsWith(route)
              )}
            >
              <Link
                to="/hojas-de-vida"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Hojas de Vida
              </Link>
              <Link
                to="/inventario"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Inventario
              </Link>
              <Link
                to="/mantenimiento"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Mantenimiento
              </Link>
            </Dropdown>

            <Dropdown
              title="Administración"
              isActive={adminRoutes.some((route) => pathname.startsWith(route))}
            >
              <Link
                to="/empresas"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Empresas
              </Link>
              <Link
                to="/proveedores"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Proveedores
              </Link>
              <Link
                to="/hojas-de-vida/nuevo"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Registrar Usuario
              </Link>
            </Dropdown>

            <Link
              to="/reportes"
              className={`nav-link ${pathname === "/reportes" ? "active" : ""}`}
            >
              Reportes
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700 hidden sm:block">
              {session?.user?.email}
            </span>
            <button
              onClick={handleLogout}
              className="py-2 px-3 text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
