// src/components/common/Pagination.jsx

import React from "react";

function Pagination({ currentPage, totalPages, onPageChange }) {
  // Si solo hay una página (o ninguna), no mostramos los controles.
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex justify-center items-center space-x-4 mt-6 py-4">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Anterior
      </button>

      <span className="text-sm font-medium text-gray-700">
        Página {currentPage} de {totalPages}
      </span>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Siguiente
      </button>
    </div>
  );
}

export default Pagination;
