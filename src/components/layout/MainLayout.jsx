// src/components/layout/MainLayout.jsx

import React from "react";
import { Outlet } from "react-router-dom"; // 1. Importar Outlet
import Header from "./Header";

function MainLayout({ session }) {
  return (
    <div id="app-container">
      <Header session={session} />
      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        {/* 2. Outlet actúa como un placeholder para el componente de la ruta activa */}
        <Outlet />
      </main>
    </div>
  );
}

export default MainLayout;
