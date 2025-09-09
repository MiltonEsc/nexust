import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import toast from 'react-hot-toast';

const DrawIOSync = ({ 
  equipos, 
  onEquiposChange, 
  areas, 
  onAreasChange,
  activeCompany 
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [syncStatus, setSyncStatus] = useState('idle'); // idle, syncing, success, error

  // Sincronizar equipos con la base de datos
  const syncEquiposToDatabase = useCallback(async (equiposData) => {
    if (!activeCompany || !equiposData || equiposData.length === 0) return;

    setIsSyncing(true);
    setSyncStatus('syncing');

    try {
      // Actualizar cada equipo individualmente para evitar problemas de RLS
      const updatePromises = equiposData.map(async (equipo) => {
        const { error } = await supabase
          .from('equipos')
          .update({ 
            x_coordinate: Math.round(equipo.x || 0),
            y_coordinate: Math.round(equipo.y || 0)
          })
          .eq('id', equipo.id)
          .eq('company_id', activeCompany.id); // Asegurar que pertenece a la empresa

        if (error) {
          console.error(`Error actualizando equipo ${equipo.id}:`, error);
          throw error;
        }
      });

      await Promise.all(updatePromises);

      setSyncStatus('success');
      setLastSync(new Date());
      toast.success(`${equiposData.length} equipos sincronizados correctamente`);
      
      // Notificar cambio a los componentes padre
      if (onEquiposChange) {
        onEquiposChange(equiposData);
      }

    } catch (error) {
      console.error('Error sincronizando equipos:', error);
      setSyncStatus('error');
      toast.error('Error al sincronizar equipos: ' + error.message);
    } finally {
      setIsSyncing(false);
    }
  }, [activeCompany, onEquiposChange]);

  // Sincronizar áreas con la base de datos
  const syncAreasToDatabase = useCallback(async (areasData) => {
    if (!activeCompany || !areasData || areasData.length === 0) return;

    try {
      // Aquí podrías guardar las áreas en una tabla específica
      // Por ahora solo notificamos el cambio
      if (onAreasChange) {
        onAreasChange(areasData);
      }
      
      toast.success(`${areasData.length} áreas sincronizadas`);
    } catch (error) {
      console.error('Error sincronizando áreas:', error);
      toast.error('Error al sincronizar áreas: ' + error.message);
    }
  }, [activeCompany, onAreasChange]);

  // Exportar datos actuales a formato draw.io
  const exportToDrawIO = useCallback(() => {
    const drawIOData = {
      equipos: equipos.map(equipo => ({
        id: equipo.id,
        marca: equipo.marca,
        modelo: equipo.modelo,
        tipo: equipo.tipo,
        estado: equipo.estado,
        serial: equipo.serial,
        x: equipo.x_coordinate || 0,
        y: equipo.y_coordinate || 0,
        color: getEquipoColor(equipo.estado),
        shape: getEquipoShape(equipo.tipo)
      })),
      areas: areas.map(area => ({
        id: area.id,
        name: area.name,
        x: area.x,
        y: area.y,
        width: area.width,
        height: area.height,
        color: area.color,
        bgColor: area.bgColor,
        borderColor: area.borderColor
      })),
      metadata: {
        companyId: activeCompany?.id,
        lastSync: lastSync,
        version: '1.0'
      }
    };

    return drawIOData;
  }, [equipos, areas, activeCompany, lastSync]);

  // Importar datos desde draw.io
  const importFromDrawIO = useCallback(async (drawIOData) => {
    if (!drawIOData || !drawIOData.equipos) return;

    try {
      // Sincronizar equipos
      await syncEquiposToDatabase(drawIOData.equipos);
      
      // Sincronizar áreas si existen
      if (drawIOData.areas) {
        await syncAreasToDatabase(drawIOData.areas);
      }

      toast.success('Datos importados correctamente desde draw.io');
    } catch (error) {
      console.error('Error importando desde draw.io:', error);
      toast.error('Error al importar datos: ' + error.message);
    }
  }, [syncEquiposToDatabase, syncAreasToDatabase]);

  // Obtener color del equipo según estado
  const getEquipoColor = (estado) => {
    switch (estado?.toLowerCase()) {
      case 'activo':
        return '#10B981'; // green
      case 'mantenimiento':
        return '#F59E0B'; // yellow
      case 'dañado':
        return '#EF4444'; // red
      case 'inactivo':
        return '#6B7280'; // gray
      default:
        return '#3B82F6'; // blue
    }
  };

  // Obtener forma del equipo según tipo
  const getEquipoShape = (tipo) => {
    switch (tipo?.toLowerCase()) {
      case 'computador':
      case 'laptop':
        return 'rectangle';
      case 'impresora':
        return 'ellipse';
      case 'telefono':
        return 'rhombus';
      case 'servidor':
        return 'hexagon';
      default:
        return 'rectangle';
    }
  };

  // Crear plantilla de mapa de oficina
  const createOfficeTemplate = useCallback(() => {
    const template = {
      equipos: [],
      areas: [
        {
          id: 'reception',
          name: 'Recepción',
          x: 50,
          y: 50,
          width: 200,
          height: 100,
          color: '#E5E7EB',
          bgColor: '#E5E7EB',
          borderColor: '#9CA3AF'
        },
        {
          id: 'open-space',
          name: 'Área Abierta',
          x: 300,
          y: 50,
          width: 400,
          height: 200,
          color: '#F3F4F6',
          bgColor: '#F3F4F6',
          borderColor: '#9CA3AF'
        },
        {
          id: 'meeting-room-1',
          name: 'Sala de Reuniones 1',
          x: 50,
          y: 200,
          width: 150,
          height: 120,
          color: '#DBEAFE',
          bgColor: '#DBEAFE',
          borderColor: '#3B82F6'
        },
        {
          id: 'meeting-room-2',
          name: 'Sala de Reuniones 2',
          x: 250,
          y: 200,
          width: 150,
          height: 120,
          color: '#DBEAFE',
          bgColor: '#DBEAFE',
          borderColor: '#3B82F6'
        },
        {
          id: 'server-room',
          name: 'Sala de Servidores',
          x: 50,
          y: 350,
          width: 200,
          height: 100,
          color: '#FEF3C7',
          bgColor: '#FEF3C7',
          borderColor: '#F59E0B'
        }
      ],
      metadata: {
        template: 'office',
        created: new Date().toISOString(),
        version: '1.0'
      }
    };

    return template;
  }, []);

  // Auto-sincronización deshabilitada para evitar problemas de RLS
  // La sincronización se hace manualmente cuando el usuario mueve equipos
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     if (equipos.length > 0 && !isSyncing) {
  //       // Verificar si hay equipos con coordenadas que no se han sincronizado
  //       const needsSync = equipos.some(equipo => 
  //         equipo.x_coordinate !== undefined && 
  //         equipo.y_coordinate !== undefined
  //       );
        
  //       if (needsSync) {
  //         syncEquiposToDatabase(equipos);
  //       }
  //     }
  //   }, 30000); // 30 segundos

  //   return () => clearInterval(interval);
  // }, [equipos, isSyncing, syncEquiposToDatabase]);

  return {
    // Estado
    isSyncing,
    lastSync,
    syncStatus,
    
    // Funciones
    syncEquiposToDatabase,
    syncAreasToDatabase,
    exportToDrawIO,
    importFromDrawIO,
    createOfficeTemplate,
    
    // Utilidades
    getEquipoColor,
    getEquipoShape
  };
};

export default DrawIOSync;
