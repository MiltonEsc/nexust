// src/components/common/Dropdown.jsx

import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";

function Dropdown({ title, children, isActive }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Efecto para cerrar el dropdown si se hace clic fuera de él
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="relative dropdown" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`dropdown-toggle nav-link flex items-center gap-1 ${
          isActive ? "active" : ""
        }`}
      >
        <span>{title}</span>
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M19 9l-7 7-7-7"
          ></path>
        </svg>
      </button>

      {/* El panel del dropdown se muestra u oculta basado en el estado 'isOpen' */}
      {isOpen && (
        <div
          className="dropdown-panel absolute mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-30"
          onClick={() => setIsOpen(false)} // Cierra el menú al hacer clic en un item
        >
          {children}
        </div>
      )}
    </div>
  );
}

export default Dropdown;
