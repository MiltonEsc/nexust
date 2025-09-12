import React from 'react';
import AIDashboard from '../components/ai/AIDashboard';
import { useAppContext } from '../context/AppContext';
import { useEquipos, useSoftware, usePerifericos } from '../hooks/useInventoryQueries';

const AIPage = () => {
  const { activeCompany } = useAppContext();
  
  // Obtener datos para el dashboard de IA
  const { data: equipos = [] } = useEquipos(activeCompany?.id);
  const { data: software = [] } = useSoftware(activeCompany?.id);
  const { data: perifericos = [] } = usePerifericos(activeCompany?.id);

  const companyData = {
    equipos,
    software,
    perifericos,
    monthlyCosts: [5000, 5200, 4800, 5500, 5100, 5300], // Datos de ejemplo
    budget: 60000,
    growthRate: 0.1
  };

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Inteligencia Artificial y Automatización
        </h1>
        <p className="text-gray-600">
          Dashboard inteligente con análisis predictivo, detección de anomalías y recomendaciones automáticas
        </p>
      </div>
      
      <AIDashboard companyData={companyData} />
    </div>
  );
};

export default AIPage;
