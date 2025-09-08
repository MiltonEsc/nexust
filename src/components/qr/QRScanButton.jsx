import React, { useState } from "react";
import { QrCodeIcon } from "@heroicons/react/24/outline";
import QRReaderModal from "../modals/QRReaderModal";

const QRScanButton = ({ className = "", onAssetFound }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors ${className}`}
      >
        <QrCodeIcon className="w-5 h-5" />
        Escanear QR
      </button>
      <QRReaderModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onAssetFound={(asset) => {
          onAssetFound?.(asset);
        }}
      />
    </>
  );
};

export default QRScanButton;


