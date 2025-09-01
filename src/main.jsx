// src/main.jsx

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom"; // 1. Importar BrowserRouter
import App from "./App.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {/* 2. Envolver <App /> con <BrowserRouter> */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
