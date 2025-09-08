import React from "react";
import QRReaderComponent from "../qr/QRReaderComponent";

const QRReaderModal = ({ isOpen, onClose, onAssetFound }) => {
  if (!isOpen) return null;
  return (
    <QRReaderComponent
      key={isOpen ? "open" : "closed"}
      onClose={onClose}
      onAssetFound={onAssetFound}
    />
  );
};

export default QRReaderModal;


