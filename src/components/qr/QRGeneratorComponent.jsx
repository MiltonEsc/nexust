import React, { useState, useRef, useEffect } from "react";
import {
  QrCodeIcon,
  XMarkIcon,
  PrinterIcon,
  DocumentArrowDownIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  ComputerDesktopIcon,
  CommandLineIcon,
  CubeIcon,
} from "@heroicons/react/24/outline";

// Función para generar QR usando una API externa o librería
const generateQRCode = async (text, size = 200) => {
  // Usando API gratuita de QR Server
  const apiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(
    text
  )}`;
  return apiUrl;
};

const QRGeneratorComponent = ({ assets, onClose, activeTab }) => {
  const [selectedAssets, setSelectedAssets] = useState([]);
  const [generatedQRs, setGeneratedQRs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState({});
  const printRef = useRef();

  const getAssetTypeLabel = (type) => {
    const labels = {
      equipos: "EQUIPO",
      software: "SOFTWARE",
      perifericos: "PERIFERICO",
    };
    return labels[type] || "ACTIVO";
  };

  const getAssetIcon = (type) => {
    const icons = {
      equipos: ComputerDesktopIcon,
      software: CommandLineIcon,
      perifericos: CubeIcon,
    };
    return icons[type] || QrCodeIcon;
  };

  const getAssetColor = (type) => {
    const colors = {
      equipos: "blue",
      software: "green",
      perifericos: "purple",
    };
    return colors[type] || "gray";
  };

  const getAssetDisplayName = (asset, type) => {
    switch (type) {
      case "equipos":
        return `${asset.marca || ""} ${asset.modelo || ""}`.trim();
      case "software":
        return asset.nombre || "";
      case "perifericos":
        return `${asset.tipo || ""} ${asset.marca || ""}`.trim();
      default:
        return "Activo sin nombre";
    }
  };

  const toggleAssetSelection = (asset) => {
    setSelectedAssets((prev) => {
      const isSelected = prev.some((a) => a.id === asset.id);
      if (isSelected) {
        return prev.filter((a) => a.id !== asset.id);
      } else {
        return [...prev, { ...asset, tipo_activo: activeTab }];
      }
    });
  };

  const selectAllAssets = () => {
    if (selectedAssets.length === assets.length) {
      setSelectedAssets([]);
    } else {
      setSelectedAssets(
        assets.map((asset) => ({ ...asset, tipo_activo: activeTab }))
      );
    }
  };

  const generateQRCodes = async () => {
    if (selectedAssets.length === 0) return;

    setLoading(true);
    try {
      const qrPromises = selectedAssets.map(async (asset) => {
        const qrData = `${getAssetTypeLabel(asset.tipo_activo)}:${asset.id}`;
        const qrImageUrl = await generateQRCode(qrData, 300);

        return {
          ...asset,
          qrData,
          qrImageUrl,
          displayName: getAssetDisplayName(asset, asset.tipo_activo),
        };
      });

      const results = await Promise.all(qrPromises);
      setGeneratedQRs(results);
    } catch (error) {
      console.error("Error generando códigos QR:", error);
    } finally {
      setLoading(false);
    }
  };

  const copyQRData = async (qrData, assetId) => {
    try {
      await navigator.clipboard.writeText(qrData);
      setCopied((prev) => ({ ...prev, [assetId]: true }));
      setTimeout(() => {
        setCopied((prev) => ({ ...prev, [assetId]: false }));
      }, 2000);
    } catch (error) {
      console.error("Error copiando al portapapeles:", error);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    const printContent = printRef.current.innerHTML;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Etiquetas QR - Activos TIC</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 20px;
              background: white;
            }
            .qr-grid { 
              display: grid; 
              grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
              gap: 20px; 
              margin: 20px 0;
            }
            .qr-card { 
              border: 2px solid #e5e7eb; 
              border-radius: 12px; 
              padding: 16px; 
              text-align: center;
              background: white;
              page-break-inside: avoid;
            }
            .qr-card h3 { 
              margin: 0 0 8px 0; 
              font-size: 14px; 
              font-weight: bold;
              color: #1f2937;
            }
            .qr-card p { 
              margin: 4px 0; 
              font-size: 12px; 
              color: #6b7280;
            }
            .qr-card img { 
              width: 150px; 
              height: 150px; 
              margin: 12px 0;
            }
            .qr-data {
              font-family: monospace;
              font-size: 10px;
              color: #374151;
              background: #f9fafb;
              padding: 4px 8px;
              border-radius: 4px;
              margin-top: 8px;
            }
            @media print {
              body { margin: 0; padding: 10px; }
              .qr-card { 
                border: 1px solid #000; 
                margin-bottom: 10px;
              }
            }
          </style>
        </head>
        <body>
          <h1 style="text-align: center; color: #1f2937; margin-bottom: 30px;">
            Etiquetas QR - Activos TIC
          </h1>
          ${printContent}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 100);
  };

  const downloadQRs = () => {
    // Crear un archivo HTML descargable con todos los QRs
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Códigos QR - Activos TIC</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .qr-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
            .qr-card { border: 1px solid #ddd; padding: 20px; text-align: center; border-radius: 8px; }
            .qr-card img { width: 200px; height: 200px; }
          </style>
        </head>
        <body>
          <h1>Códigos QR - Activos TIC</h1>
          <div class="qr-grid">
            ${generatedQRs
              .map(
                (qr) => `
              <div class="qr-card">
                <h3>${qr.displayName}</h3>
                <img src="${qr.qrImageUrl}" alt="QR Code" />
                <p><strong>Tipo:</strong> ${getAssetTypeLabel(
                  qr.tipo_activo
                )}</p>
                <p><strong>ID:</strong> ${qr.id}</p>
                <p><strong>Código QR:</strong> ${qr.qrData}</p>
              </div>
            `
              )
              .join("")}
          </div>
        </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-codes-${new Date().toISOString().split("T")[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <QrCodeIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Generar Códigos QR
              </h2>
              <p className="text-sm text-gray-500">
                {assets.length} {activeTab} disponibles
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <XMarkIcon className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <div className="flex h-[calc(90vh-100px)]">
          {/* Asset Selection Panel */}
          <div className="w-1/3 border-r border-gray-200 p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Seleccionar Activos
              </h3>
              <button
                onClick={selectAllAssets}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {selectedAssets.length === assets.length
                  ? "Deseleccionar todo"
                  : "Seleccionar todo"}
              </button>
            </div>

            <div className="space-y-3">
              {assets.map((asset) => {
                const isSelected = selectedAssets.some(
                  (a) => a.id === asset.id
                );
                const Icon = getAssetIcon(activeTab);
                const color = getAssetColor(activeTab);

                return (
                  <div
                    key={asset.id}
                    onClick={() => toggleAssetSelection(asset)}
                    className={`p-3 border rounded-lg cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 bg-${color}-100 rounded-lg flex items-center justify-center flex-shrink-0`}
                      >
                        <Icon className={`w-4 h-4 text-${color}-600`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 text-sm truncate">
                          {getAssetDisplayName(asset, activeTab)}
                        </div>
                        <div className="text-xs text-gray-500">
                          ID: {asset.id}
                          {asset.numero_serie &&
                            ` • S/N: ${asset.numero_serie}`}
                        </div>
                      </div>
                      <div
                        className={`w-4 h-4 border-2 rounded ${
                          isSelected
                            ? "bg-blue-600 border-blue-600"
                            : "border-gray-300"
                        } flex items-center justify-center`}
                      >
                        {isSelected && (
                          <CheckIcon className="w-3 h-3 text-white" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Generate Button */}
            <div className="sticky bottom-0 bg-white pt-4 mt-6 border-t border-gray-200">
              <button
                onClick={generateQRCodes}
                disabled={selectedAssets.length === 0 || loading}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                  selectedAssets.length === 0 || loading
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                    Generando...
                  </div>
                ) : (
                  `Generar QR (${selectedAssets.length})`
                )}
              </button>
            </div>
          </div>

          {/* Generated QRs Panel */}
          <div className="flex-1 p-6 overflow-y-auto">
            {generatedQRs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-500">
                <QrCodeIcon className="w-16 h-16 mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">
                  No hay códigos QR generados
                </h3>
                <p className="text-center max-w-md">
                  Selecciona los activos de la lista y presiona "Generar QR"
                  para crear los códigos QR.
                </p>
              </div>
            ) : (
              <div>
                {/* Actions Bar */}
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Códigos QR Generados ({generatedQRs.length})
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={downloadQRs}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                    >
                      <DocumentArrowDownIcon className="w-4 h-4" />
                      Descargar
                    </button>
                    <button
                      onClick={handlePrint}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      <PrinterIcon className="w-4 h-4" />
                      Imprimir
                    </button>
                  </div>
                </div>

                {/* QR Grid for Display */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {generatedQRs.map((qr) => {
                    const Icon = getAssetIcon(qr.tipo_activo);
                    const color = getAssetColor(qr.tipo_activo);

                    return (
                      <div
                        key={qr.id}
                        className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm"
                      >
                        <div className="flex items-start gap-4 mb-4">
                          <div
                            className={`w-10 h-10 bg-${color}-100 rounded-lg flex items-center justify-center flex-shrink-0`}
                          >
                            <Icon className={`w-5 h-5 text-${color}-600`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 mb-1">
                              {qr.displayName}
                            </h4>
                            <div className="text-sm text-gray-600 space-y-1">
                              <div>
                                Tipo: {getAssetTypeLabel(qr.tipo_activo)}
                              </div>
                              <div>ID: {qr.id}</div>
                              {qr.numero_serie && (
                                <div>S/N: {qr.numero_serie}</div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* QR Code */}
                        <div className="text-center mb-4">
                          <img
                            src={qr.qrImageUrl}
                            alt={`QR Code for ${qr.displayName}`}
                            className="w-40 h-40 mx-auto border border-gray-200 rounded-lg"
                          />
                        </div>

                        {/* QR Data */}
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-50 px-3 py-2 rounded-lg">
                            <code className="text-sm text-gray-700 font-mono">
                              {qr.qrData}
                            </code>
                          </div>
                          <button
                            onClick={() => copyQRData(qr.qrData, qr.id)}
                            className={`p-2 rounded-lg transition-colors ${
                              copied[qr.id]
                                ? "bg-green-100 text-green-600"
                                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                            }`}
                            title="Copiar código QR"
                          >
                            {copied[qr.id] ? (
                              <CheckIcon className="w-4 h-4" />
                            ) : (
                              <ClipboardDocumentIcon className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Hidden Print Content */}
                <div ref={printRef} className="hidden">
                  <div
                    className="qr-grid"
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(250px, 1fr))",
                      gap: "20px",
                    }}
                  >
                    {generatedQRs.map((qr) => (
                      <div
                        key={qr.id}
                        className="qr-card"
                        style={{
                          border: "2px solid #e5e7eb",
                          borderRadius: "12px",
                          padding: "16px",
                          textAlign: "center",
                          background: "white",
                        }}
                      >
                        <h3
                          style={{
                            margin: "0 0 8px 0",
                            fontSize: "14px",
                            fontWeight: "bold",
                            color: "#1f2937",
                          }}
                        >
                          {qr.displayName}
                        </h3>
                        <p
                          style={{
                            margin: "4px 0",
                            fontSize: "12px",
                            color: "#6b7280",
                          }}
                        >
                          Tipo: {getAssetTypeLabel(qr.tipo_activo)} • ID:{" "}
                          {qr.id}
                        </p>
                        {qr.numero_serie && (
                          <p
                            style={{
                              margin: "4px 0",
                              fontSize: "12px",
                              color: "#6b7280",
                            }}
                          >
                            S/N: {qr.numero_serie}
                          </p>
                        )}
                        <img
                          src={qr.qrImageUrl}
                          alt={`QR Code for ${qr.displayName}`}
                          style={{
                            width: "150px",
                            height: "150px",
                            margin: "12px auto",
                            display: "block",
                          }}
                        />
                        <div
                          className="qr-data"
                          style={{
                            fontFamily: "monospace",
                            fontSize: "10px",
                            color: "#374151",
                            background: "#f9fafb",
                            padding: "4px 8px",
                            borderRadius: "4px",
                            marginTop: "8px",
                          }}
                        >
                          {qr.qrData}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRGeneratorComponent;
