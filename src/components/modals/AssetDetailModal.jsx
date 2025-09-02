// src/components/modals/AssetDetailModal.jsx

import React from "react";
import Modal from "../common/Modal";

// Componente pequeño para mostrar la evidencia (reutilizamos la lógica)
const EvidenceDisplay = ({ url }) => {
  if (!url) {
    return <span className="text-gray-400">N/A</span>;
  }

  const isPdf = url.toLowerCase().endsWith(".pdf");

  if (isPdf) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:underline"
      >
        Ver PDF
      </a>
    );
  }

  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      <img
        src={url}
        alt="Evidencia de trazabilidad"
        className="h-10 w-10 object-cover rounded-md hover:opacity-80 transition-opacity"
      />
    </a>
  );
};

function AssetDetailModal({ asset, onClose }) {
  if (!asset) return null;

  const formatCurrency = (value) => {
    if (value === null || value === undefined) return "N/A";
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const title = `Detalles de ${asset.nombre || asset.marca || asset.tipo}`;

  // Determinamos si el activo es de tipo software basándonos en una propiedad única como 'stock'.
  const isSoftware = asset.stock !== undefined;

  return (
    <Modal
      isOpen={!!asset}
      onClose={onClose}
      title={title}
      maxWidth="max-w-4xl"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <img
            src={
              asset.imagen ||
              "https://placehold.co/400x300/e2e8f0/cbd5e0?text=Sin+Imagen"
            }
            alt={`Imagen de ${title}`}
            className="rounded-lg shadow-md w-full object-cover"
          />
        </div>

        <div className="md:col-span-2 space-y-2 text-sm">
          <h4 className="font-semibold text-lg border-b pb-1">
            Información General
          </h4>

          {/* Renderizado condicional basado en si es software o no */}
          {isSoftware ? (
            <>
              <p>
                <strong>Nombre:</strong> {asset.nombre || "N/A"}
              </p>
              <p>
                <strong>Tipo de Licencia:</strong> {asset.tipo || "N/A"}
              </p>
              <p>
                <strong>Versión:</strong> {asset.version || "N/A"}
              </p>
              <p>
                <strong>Licencias Disponibles (Stock):</strong> {asset.stock}
              </p>
            </>
          ) : (
            <>
              <p>
                <strong>Tipo:</strong> {asset.tipo || "Equipo de Cómputo"}
              </p>
              <p>
                <strong>Marca:</strong> {asset.marca || "N/A"}
              </p>
              <p>
                <strong>Modelo:</strong> {asset.modelo || "N/A"}
              </p>
              <p>
                <strong>Número de Serie:</strong> {asset.numero_serie || "N/A"}
              </p>
              <p>
                <strong>Condición Física:</strong> {asset.estado}
              </p>
            </>
          )}

          <h4 className="font-semibold text-lg border-b pb-1 mt-4">
            Información de Compra
          </h4>
          <p>
            <strong>Proveedor:</strong>{" "}
            {asset.proveedores ? asset.proveedores.nombre : "No especificado"}
          </p>
          <p>
            <strong>Costo:</strong> {formatCurrency(asset.costo)}
          </p>
          <p>
            <strong>Fecha de Compra:</strong>{" "}
            {asset.fecha_compra
              ? new Date(asset.fecha_compra).toLocaleDateString()
              : "N/A"}
          </p>

          {/* Mostramos el vencimiento correcto para cada tipo de activo */}
          {asset.fecha_vencimiento_garantia && (
            <p>
              <strong>Vencimiento de Garantía:</strong>{" "}
              {new Date(asset.fecha_vencimiento_garantia).toLocaleDateString()}
            </p>
          )}
          {asset.fecha_vencimiento && (
            <p>
              <strong>Vencimiento de Licencia:</strong>{" "}
              {new Date(asset.fecha_vencimiento).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      <hr className="my-6" />

      <h4 className="font-semibold text-lg mb-2">Historial del Activo</h4>
      <div className="overflow-y-auto max-h-64">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="th-cell">Fecha</th>
              <th className="th-cell">Acción</th>
              <th className="th-cell">Detalle</th>
              <th className="th-cell">Evidencia</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {(asset.trazabilidad || []).length > 0 ? (
              [...asset.trazabilidad].reverse().map((log, index) => (
                <tr key={index}>
                  <td className="td-cell whitespace-nowrap">
                    {new Date(log.fecha).toLocaleString()}
                  </td>
                  <td className="td-cell">{log.accion}</td>
                  <td className="td-cell">{log.detalle}</td>
                  <td className="td-cell">
                    <EvidenceDisplay url={log.evidencia_url} />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="text-center py-4 text-gray-500">
                  No hay historial para este activo.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}

export default AssetDetailModal;
