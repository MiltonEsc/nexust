import React, { useState, useRef, useEffect } from "react";
import jsQR from "jsqr";
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

import { supabase } from "../../supabaseClient";
import { useAppContext } from "../../context/AppContext";

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
  const { activeCompany } = useAppContext();
  const [videoDebug, setVideoDebug] = useState({ width: 0, height: 0, readyState: 0, trackState: "" });
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(
    typeof navigator !== "undefined" ? navigator.userAgent : ""
  );

  // Inicializar cámara
  const initCamera = async (deviceIdOverride = null) => {
    try {
      setError(null);
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasPermission(false);
        setError(
          "Este navegador no soporta acceso a cámara o el contexto no es seguro (requiere HTTPS o localhost)."
        );
        return;
      }

      let mediaStream;
      try {
        // Paso 1: si hay deviceId indicado, úsalo directo
        if (deviceIdOverride) {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: deviceIdOverride } },
            audio: false,
          });
        } else {
          // Abrir rápido con preferencia por environment (especialmente móvil)
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: isMobile
              ? { facingMode: { ideal: "environment" } }
              : true,
            audio: false,
          });

          // En segundo plano: si estamos en móvil, intentar cambiar a la cámara trasera precisa por deviceId
          if (isMobile) {
            try {
              const devices = await navigator.mediaDevices.enumerateDevices();
              const videoInputs = devices.filter((d) => d.kind === "videoinput");
              const backCam = videoInputs.find((d) => /back|rear|environment/i.test(d.label));
              if (backCam && videoRef.current) {
                // Preparar nuevo stream antes de cerrar el actual para no cortar la previsualización
                const rearStream = await navigator.mediaDevices.getUserMedia({
                  video: { deviceId: { exact: backCam.deviceId } },
                  audio: false,
                });
                // Cambiar a la trasera y cerrar el anterior
                if (videoRef.current.srcObject) {
                  const old = videoRef.current.srcObject;
                  videoRef.current.srcObject = rearStream;
                  old.getTracks && old.getTracks().forEach((t) => t.stop());
                }
                mediaStream = rearStream;
              }
            } catch (_e) {
              // Si no se puede enumerar o cambiar, nos quedamos con el stream actual
            }
          }
        }
      } catch (primaryErr) {
        try {
          // Fallback a cámara frontal
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: "user" } },
            audio: false,
          });
        } catch (secondaryErr) {
          // Fallback genérico
          mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }
      }

      setStream(mediaStream);
      setHasPermission(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.setAttribute("playsinline", "true");
        const playVideo = async () => {
          try {
            await videoRef.current.play();
            setHasPermission(true);
          } catch (e) {
            // Algunos navegadores requieren interacción del usuario antes de play
            setHasPermission(true); // Permisos concedidos aunque play espere interacción
          }
        };
        if (videoRef.current.readyState >= 2) {
          await playVideo();
        } else {
          videoRef.current.onloadedmetadata = playVideo;
          videoRef.current.oncanplay = () => {
            if (videoRef.current && videoRef.current.paused) {
              playVideo();
            }
          };
        }

        // Diagnóstico: actualizar medidas periódicamente
        const updateDebug = () => {
          const track = mediaStream.getVideoTracks?.()[0];
          setVideoDebug({
            width: videoRef.current?.videoWidth || 0,
            height: videoRef.current?.videoHeight || 0,
            readyState: videoRef.current?.readyState || 0,
            trackState: track ? `${track.readyState}` : "",
          });
        };
        updateDebug();
        setTimeout(updateDebug, 1000);
        setTimeout(updateDebug, 3000);
        setTimeout(() => {
          updateDebug();
          // Si pasado 5s no hay dimensiones, mostrar ayuda
          if (
            (videoRef.current && (!videoRef.current.videoWidth || !videoRef.current.videoHeight)) ||
            !mediaStream.getVideoTracks?.()[0]
          ) {
            setError(
              "No se pudo iniciar la vista previa de la cámara. Cambia de cámara o revisa permisos del sitio."
            );
          }
        }, 5000);
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

  // Escanear y decodificar QR usando jsQR
  const scanForQR = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!video.videoWidth || !video.videoHeight) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Manejar excepción si el canvas no puede leer por políticas de seguridad
    let imageData;
    try {
      imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    } catch (e) {
      // Si falla, reintentar en el próximo tick sin romper el loop
      return;
    }
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    });

    if (code && code.data) {
      await handleQRDetected(code.data);
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

      // Buscar activo en la base de datos real
      const query = supabase
        .from(tableName)
        .select("*")
        .eq("id", assetId)
        .eq("company_id", activeCompany?.id)
        .maybeSingle();

      const { data: asset, error: dbError } = await query;

      if (dbError) {
        throw new Error(dbError.message);
      }

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
  const startScanning = async () => {
    if (!hasPermission) {
      await initCamera();
    }

    setIsScanning(true);
    setError(null);
    setFoundAsset(null);

    // Esperar a que el video tenga dimensiones válidas
    const waitForVideo = async () => {
      const start = Date.now();
      while (
        videoRef.current &&
        (!videoRef.current.videoWidth || !videoRef.current.videoHeight)
      ) {
        if (Date.now() - start > 3000) break; // timeout 3s
        await new Promise((r) => setTimeout(r, 50));
      }
    };

    await waitForVideo();

    // Escanear cada 300ms para mejorar respuesta
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    scanIntervalRef.current = setInterval(scanForQR, 300);
  };

  // Limpiar recursos al desmontar
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Solicitar permisos e inicializar cámara al montar el componente
  useEffect(() => {
    initCamera();
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
          {/* Selector de cámara removido para UX automática */}
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
                    autoPlay
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
                  {/* Diagnóstico compacto */}
                  <div className="absolute bottom-2 left-2 bg-black/40 text-white text-[10px] px-2 py-1 rounded">
                    {videoDebug.width}x{videoDebug.height} rs:{videoDebug.readyState} ts:{videoDebug.trackState}
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
            {/* Botón de reintento removido para iniciar automáticamente */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRReaderComponent;
