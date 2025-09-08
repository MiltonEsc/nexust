import React from "react";
import QRGeneratorComponent from "../qr/QRGeneratorComponent";

const QRGeneratorModal = ({ isOpen, onClose, assets, activeTab }) => {
  if (!isOpen) return null;
  return (
    <QRGeneratorComponent
      assets={assets}
      onClose={onClose}
      activeTab={activeTab}
    />
  );
};

export default QRGeneratorModal;


