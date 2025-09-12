import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAppContext } from '../context/AppContext';

// Hook para obtener datos del inventario para el chatbot
export const useInventoryData = () => {
  const { activeCompany } = useAppContext();
  const [inventoryData, setInventoryData] = useState({
    equipos: [],
    software: [],
    perifericos: [],
    consumibles: [],
    loading: true,
    error: null
  });

  useEffect(() => {
    const fetchInventoryData = async () => {
      if (!activeCompany) {
        setInventoryData({
          equipos: [],
          software: [],
          perifericos: [],
          consumibles: [],
          loading: false,
          error: null
        });
        return;
      }

      try {
        setInventoryData(prev => ({ ...prev, loading: true, error: null }));

        const companyId = activeCompany.id;

        // Obtener equipos
        const { data: equipos, error: equiposError } = await supabase
          .from('equipos')
          .select('id, marca, modelo, numero_serie, estado, ubicacion, trazabilidad')
          .eq('company_id', companyId)
          .limit(100); // Limitar para evitar cargar demasiados datos

        if (equiposError) throw equiposError;

        // Obtener software
        const { data: software, error: softwareError } = await supabase
          .from('software')
          .select('id, nombre, tipo, version, stock, fecha_vencimiento')
          .eq('company_id', companyId)
          .limit(100);

        if (softwareError) throw softwareError;

        // Obtener periféricos
        const { data: perifericos, error: perifericosError } = await supabase
          .from('perifericos')
          .select('id, tipo, marca, modelo, estado')
          .eq('company_id', companyId)
          .limit(100);

        if (perifericosError) throw perifericosError;

        // Obtener consumibles
        const { data: consumibles, error: consumiblesError } = await supabase
          .from('consumibles')
          .select('id, nombre, categoria, cantidad, stock_minimo')
          .eq('company_id', companyId)
          .limit(100);

        if (consumiblesError) throw consumiblesError;

        const inventoryData = {
          equipos: equipos || [],
          software: software || [],
          perifericos: perifericos || [],
          consumibles: consumibles || [],
          loading: false,
          error: null
        };

        // Debug: Log de los datos obtenidos
        console.log('Datos del inventario obtenidos:', {
          equipos: inventoryData.equipos.length,
          software: inventoryData.software.length,
          perifericos: inventoryData.perifericos.length,
          consumibles: inventoryData.consumibles.length,
          companyId: companyId
        });

        setInventoryData(inventoryData);

      } catch (error) {
        console.error('Error fetching inventory data:', error);
        setInventoryData(prev => ({
          ...prev,
          loading: false,
          error: error.message
        }));
      }
    };

    fetchInventoryData();
  }, [activeCompany]);

  return inventoryData;
};
