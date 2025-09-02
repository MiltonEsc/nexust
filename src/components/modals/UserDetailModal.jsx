// src/components/modals/UserDetailModal.jsx

import React, { useState } from 'react';
import Modal from '../common/Modal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function UserDetailModal({ registro, onClose }) {
  const [activeTab, setActiveTab] = useState('activos');

  if (!registro) return null;

  const handleExportPDF = () => {
    const doc = new jsPDF();
    let finalY = 0;

    // 1. Título Principal
    doc.setFontSize(18);
    doc.text(`Hoja de Vida: ${registro.nombre}`, 14, 22);

    // 2. Tabla con Datos del Usuario
    autoTable(doc, {
      startY: 30,
      head: [['Cargo', 'Departamento', 'Cédula', 'Fecha Ingreso']],
      body: [[
        registro.cargo || 'N/A',
        registro.departamento || 'N/A',
        registro.cedula || 'N/A',
        registro.fecha_ingreso ? new Date(registro.fecha_ingreso).toLocaleDateString() : 'N/A'
      ]],
      theme: 'grid'
    });
    finalY = doc.lastAutoTable.finalY + 15;

    // 3. Tablas de Activos Asignados
    doc.setFontSize(14);
    doc.text('Activos Asignados', 14, finalY);
    finalY += 5;

    if (registro.equipos) {
      autoTable(doc, { startY: finalY, head: [['Equipo Principal', 'S/N']], body: [[`${registro.equipos.marca} ${registro.equipos.modelo}`, registro.equipos.numero_serie]] });
      finalY = doc.lastAutoTable.finalY;
    }
    if (registro.software?.length > 0) {
      autoTable(doc, { startY: finalY, head: [['Software Asignado']], body: registro.software.map(s => [s.nombre]) });
      finalY = doc.lastAutoTable.finalY;
    }
    if (registro.perifericos?.length > 0) {
      autoTable(doc, { startY: finalY, head: [['Periféricos Asignados']], body: registro.perifericos.map(p => [`${p.tipo} - ${p.marca} ${p.modelo || ''}`]) });
      finalY = doc.lastAutoTable.finalY;
    }

    finalY += 15;

    // 4. Tabla de Trazabilidad
    if (registro.trazabilidad?.length > 0) {
      doc.setFontSize(14);
      doc.text('Trazabilidad y Mantenimiento', 14, finalY);
      finalY += 5;
      autoTable(doc, {
        startY: finalY,
        head: [['Fecha', 'Acción', 'Detalle']],
        body: [...registro.trazabilidad].reverse().map(log => [
          new Date(log.fecha).toLocaleString(),
          log.accion,
          log.detalle
        ])
      });
    }

    // 5. Guardar el archivo
    doc.save(`Hoja_de_Vida_${registro.nombre.replace(/ /g, '_')}.pdf`);
  };

  return (
    <Modal isOpen={!!registro} onClose={onClose} title={`Hoja de Vida de ${registro.nombre}`} maxWidth="max-w-4xl">
      <div className="absolute top-4 right-16">
         <button onClick={handleExportPDF} className="btn-danger">Exportar a PDF</button>
      </div>

      <div className="p-6">
        {/* Sección de Datos del Usuario */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 mb-4">
          <div><p className="text-sm font-medium text-gray-500">Cargo</p><p>{registro.cargo || 'N/A'}</p></div>
          <div><p className="text-sm font-medium text-gray-500">Departamento</p><p>{registro.departamento || 'N/A'}</p></div>
          <div><p className="text-sm font-medium text-gray-500">Cédula</p><p>{registro.cedula || 'N/A'}</p></div>
          <div><p className="text-sm font-medium text-gray-500">Fecha de Ingreso</p><p>{new Date(registro.fecha_ingreso).toLocaleDateString()}</p></div>
        </div>

        {/* Sección de Inducción y Cuentas */}
        <div className="border-t pt-4 mb-6">
          <h4 className="font-semibold text-lg mb-2">Inducción y Cuentas</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
            <div>
              <p className="text-sm font-medium text-gray-500">Inducción TIC Completada</p>
              {registro.induccion_tic ? 
                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Sí</span> : 
                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">No</span>
              }
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Cuentas de Usuario</p>
              {registro.cuentas_creadas ? 
                <pre className="bg-gray-50 p-3 rounded-md text-sm whitespace-pre-wrap font-sans">{registro.cuentas_creadas}</pre> : 
                <p className="text-gray-500">No hay cuentas registradas.</p>
              }
            </div>
          </div>
        </div>

        {/* Pestañas de Navegación */}
        <div className="border-b border-gray-200 mb-4">
          <nav className="flex space-x-4">
            <button onClick={() => setActiveTab('activos')} className={`tab-link ${activeTab === 'activos' ? 'active' : ''}`}>Activos Asignados</button>
            <button onClick={() => setActiveTab('trazabilidad')} className={`tab-link ${activeTab === 'trazabilidad' ? 'active' : ''}`}>Trazabilidad y Mantenimiento</button>
          </nav>
        </div>

        {/* Contenido Condicional de las Pestañas */}
        {activeTab === 'activos' && (
          <div className="space-y-6">
            <div>
              <h4 className="font-semibold text-lg mb-2 border-b pb-1">Equipo Principal</h4>
              {registro.equipos ? (
                <ul className="text-sm list-disc list-inside">
                  <li><b>Activo:</b> {registro.equipos.marca} {registro.equipos.modelo}</li>
                  <li><b>S/N:</b> {registro.equipos.numero_serie}</li>
                </ul>
              ) : <p className="text-sm text-gray-500">No hay equipo asignado.</p>}
            </div>
            <div>
              <h4 className="font-semibold text-lg mb-2 border-b pb-1">Software</h4>
              {registro.software?.length > 0 ? (
                <ul className="text-sm list-disc list-inside">{registro.software.map(s => <li key={s.id}>{s.nombre}</li>)}</ul>
              ) : <p className="text-sm text-gray-500">No hay software asignado.</p>}
            </div>
            <div>
              <h4 className="font-semibold text-lg mb-2 border-b pb-1">Periféricos</h4>
              {registro.perifericos?.length > 0 ? (
                <ul className="list-disc list-inside">{registro.perifericos.map(p => <li key={p.id}>{p.tipo} - {p.marca}</li>)}</ul>
              ) : <p className="text-sm text-gray-500">No hay periféricos asignados.</p>}
            </div>
          </div>
        )}

        {activeTab === 'trazabilidad' && (
          <div>
            <h4 className="font-semibold text-lg mb-2 border-b pb-1">Historial de Trazabilidad</h4>
            <div className="overflow-y-auto max-h-64">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="th-cell">Fecha</th>
                    <th className="th-cell">Acción</th>
                    <th className="th-cell">Detalle</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {registro.trazabilidad?.length > 0 ? (
                    [...registro.trazabilidad].reverse().map((log, index) => (
                      <tr key={index}>
                        <td className="td-cell">{new Date(log.fecha).toLocaleString()}</td>
                        <td className="td-cell">{log.accion}</td>
                        <td className="td-cell">{log.detalle}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="3" className="text-center py-4 text-gray-500">No hay historial.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default UserDetailModal;