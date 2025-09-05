import React, { useState, useRef, useEffect } from "react";
import {
  QrCodeIcon,
  XMarkIcon,
  CameraIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  ComputerDesktopIcon,
  CommandLineIcon,
  CubeIcon,
} from "@heroicons/react/24/outline";

// Simulación de la función supabase para el ejemplo
const mockSupabaseQuery = async (table, assetId) => {
  // Simular delay de red
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Datos de prueba
  const mockData = {
    equipos: {
      id: assetId,
      marca: "Dell",
      modelo: "OptiPlex 7090",
      numero_serie: "DL7090-001",
      estado: "Activo",
      ubicacion: "Oficina Principal",
      fecha_compra: "2024-01-15",
      registros: { nombre: "Juan Pérez" },
      proveedores: { nombre: "TechSupply Corp" },
    },
    software: {
      id: assetId,
      nombre: "Microsoft Office 365",
      version: "2024",
      tipo: "Productividad",
      stock: 50,
      fecha_vencimiento: "2025-12-31",
    },
    perifericos: {
      id: assetId,
      tipo: "Monitor",
      marca: "Samsung",
      modelo: '27" 4K',
      numero_serie: "SM27-4K-001",
      estado: "Activo",
    },
  };

  return mockData[table] || null;
};

const QRReaderComponent = ({ onAssetFound, onClose }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [foundAsset, setFoundAsset] = useState(null);
  const [stream, setStream] = useState(null);
  const scanIntervalRef = useRef(null);

  // Inicializar cámara
  const initCamera = async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // Usar cámara trasera en móviles
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
        setHasPermission(true);
      }
    } catch (err) {
      console.error("Error al acceder a la cámara:", err);
      setError("No se pudo acceder a la cámara. Verifica los permisos.");
      setHasPermission(false);
    }
  };

  // Detener cámara
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setIsScanning(false);
  };

  // Función simplificada para detectar QR (simulación)
  const scanForQR = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // Configurar canvas
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Dibujar frame actual
    ctx.drawImage(video, 0, 0);

    // Simulación de detección de QR
    // En una implementación real usarías una librería como jsQR
    const simulateQRDetection = Math.random() < 0.1; // 10% de probabilidad por scan

    if (simulateQRDetection) {
      // Simular QR detectado con formato: TIPO:ID (ej: "EQUIPO:123", "SOFTWARE:456")
      const qrData = `EQUIPO:${Math.floor(Math.random() * 100) + 1}`;
      await handleQRDetected(qrData);
    }
  };

  // Procesar QR detectado
  const handleQRDetected = async (qrData) => {
    setIsScanning(false);
    setLoading(true);
    clearInterval(scanIntervalRef.current);

    try {
      // Parsear datos del QR
      const [assetType, assetId] = qrData.split(":");

      if (!assetType || !assetId) {
        throw new Error("Formato de QR inválido");
      }

      const tableMap = {
        EQUIPO: "equipos",
        SOFTWARE: "software",
        PERIFERICO: "perifericos",
      };

      const tableName = tableMap[assetType.toUpperCase()];
      if (!tableName) {
        throw new Error("Tipo de activo no válido");
      }

      // Buscar activo en la base de datos (usando función mock)
      const asset = await mockSupabaseQuery(tableName, assetId);

      if (!asset) {
        throw new Error("Activo no encontrado");
      }

      // Agregar información adicional
      asset.tipo_activo = tableName;
      asset.qr_data = qrData;

      setFoundAsset(asset);

      if (onAssetFound) {
        onAssetFound(asset);
      }
    } catch (err) {
      setError(`Error al procesar QR: ${err.message}`);
      setTimeout(() => {
        setError(null);
        startScanning();
      }, 3000);
    } finally {
      setLoading(false);
    }
  };

  // Iniciar escaneo
  const startScanning = () => {
    if (!hasPermission) {
      initCamera();
      return;
    }

    setIsScanning(true);
    setError(null);
    setFoundAsset(null);

    // Escanear cada 500ms
    scanIntervalRef.current = setInterval(scanForQR, 500);
  };

  // Limpiar recursos al desmontar
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Reiniciar escaneo
  const handleRescan = () => {
    setFoundAsset(null);
    startScanning();
  };

  const getAssetIcon = (tipo) => {
    const icons = {
      equipos: ComputerDesktopIcon,
      software: CommandLineIcon,
      perifericos: CubeIcon,
    };
    return icons[tipo] || QrCodeIcon;
  };

  const getAssetColor = (tipo) => {
    const colors = {
      equipos: "blue",
      software: "green",
      perifericos: "purple",
    };
    return colors[tipo] || "gray";
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <QrCodeIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Escanear QR</h2>
              <p className="text-sm text-gray-500">
                Buscar activo por código QR
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <XMarkIcon className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Camera View */}
          <div className="relative mb-6">
            <div className="aspect-square bg-gray-900 rounded-xl overflow-hidden relative">
              {hasPermission === null ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                  <CameraIcon className="w-12 h-12 mb-4 text-gray-400" />
                  <p className="text-center text-gray-300">
                    Inicializando cámara...
                  </p>
                </div>
              ) : hasPermission === false ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6">
                  <ExclamationTriangleIcon className="w-12 h-12 mb-4 text-red-400" />
                  <p className="text-center text-gray-300 mb-4">
                    No se pudo acceder a la cámara
                  </p>
                  <button
                    onClick={initCamera}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Reintentar
                  </button>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    playsInline
                    muted
                  />
                  <canvas ref={canvasRef} className="hidden" />

                  {/* Overlay de escaneo */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-64 h-64 border-2 border-blue-500 rounded-xl relative">
                      {/* Esquinas del marco */}
                      <div className="absolute top-0 left-0 w-8 h-8 border-l-4 border-t-4 border-blue-500 rounded-tl-lg"></div>
                      <div className="absolute top-0 right-0 w-8 h-8 border-r-4 border-t-4 border-blue-500 rounded-tr-lg"></div>
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-l-4 border-b-4 border-blue-500 rounded-bl-lg"></div>
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-r-4 border-b-4 border-blue-500 rounded-br-lg"></div>

                      {/* Línea de escaneo animada */}
                      {isScanning && (
                        <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-pulse"></div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Status */}
          <div className="text-center mb-6">
            {loading ? (
              <div className="flex items-center justify-center gap-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="text-gray-600">Buscando activo...</span>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center gap-2 text-red-600">
                <ExclamationTriangleIcon className="w-5 h-5" />
                <span className="text-sm">{error}</span>
              </div>
            ) : foundAsset ? (
              <div className="text-green-600 flex items-center justify-center gap-2">
                <CheckCircleIcon className="w-5 h-5" />
                <span className="text-sm">Activo encontrado</span>
              </div>
            ) : isScanning ? (
              <div className="text-blue-600">
                <MagnifyingGlassIcon className="w-6 h-6 mx-auto mb-2" />
                <p className="text-sm">Enfoca el código QR en el marco</p>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">
                Presiona "Iniciar Escaneo" para comenzar
              </p>
            )}
          </div>

          {/* Asset Details */}
          {foundAsset && (
            <div className="mb-6 p-4 bg-gray-50 rounded-xl">
              <div className="flex items-start gap-4">
                {(() => {
                  const Icon = getAssetIcon(foundAsset.tipo_activo);
                  const color = getAssetColor(foundAsset.tipo_activo);
                  return (
                    <div
                      className={`w-12 h-12 bg-${color}-100 rounded-lg flex items-center justify-center flex-shrink-0`}
                    >
                      <Icon className={`w-6 h-6 text-${color}-600`} />
                    </div>
                  );
                })()}

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {foundAsset.tipo_activo === "equipos" &&
                      `${foundAsset.marca} ${foundAsset.modelo}`}
                    {foundAsset.tipo_activo === "software" && foundAsset.nombre}
                    {foundAsset.tipo_activo === "perifericos" &&
                      `${foundAsset.tipo} ${foundAsset.marca}`}
                  </h3>

                  <div className="space-y-1 text-sm text-gray-600">
                    {foundAsset.numero_serie && (
                      <div>S/N: {foundAsset.numero_serie}</div>
                    )}
                    {foundAsset.estado && (
                      <div>Estado: {foundAsset.estado}</div>
                    )}
                    {foundAsset.registros && (
                      <div>Asignado a: {foundAsset.registros.nombre}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            {!isScanning && !loading && !foundAsset && hasPermission && (
              <button
                onClick={startScanning}
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors font-medium"
              >
                Iniciar Escaneo
              </button>
            )}

            {isScanning && (
              <button
                onClick={() => {
                  setIsScanning(false);
                  clearInterval(scanIntervalRef.current);
                }}
                className="flex-1 bg-red-600 text-white px-6 py-3 rounded-xl hover:bg-red-700 transition-colors font-medium"
              >
                Detener Escaneo
              </button>
            )}

            {foundAsset && (
              <button
                onClick={handleRescan}
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors font-medium"
              >
                Escanear Otro
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRReaderComponent;
