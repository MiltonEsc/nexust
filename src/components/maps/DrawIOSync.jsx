import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';

// Hook para sincronización con Draw.io
const DrawIOSync = ({ equipos, onEquiposChange, areas, onAreasChange, activeCompany }) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  // Exportar a Draw.io
  const exportToDrawIO = useCallback(async () => {
    if (!activeCompany) {
      toast.error('No hay empresa activa');
      return;
    }

    setIsSyncing(true);
    
    try {
      // Crear datos para Draw.io
      const drawIOData = {
        equipos: equipos.map(equipo => ({
          id: equipo.id,
          name: `${equipo.marca} ${equipo.modelo}`,
          type: equipo.tipo,
          x: equipo.x_coordinate || 0,
          y: equipo.y_coordinate || 0,
          status: equipo.estado
        })),
        areas: areas.map(area => ({
          id: area.id,
          name: area.name,
          x: area.x,
          y: area.y,
          width: area.width,
          height: area.height,
          color: area.color
        })),
        company: activeCompany.name,
        timestamp: new Date().toISOString()
      };

      // Convertir a JSON
      const jsonData = JSON.stringify(drawIOData, null, 2);
      
      // Crear y descargar archivo
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mapa_${activeCompany.name}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setLastSync(new Date());
      toast.success('Mapa exportado a Draw.io exitosamente');
    } catch (error) {
      console.error('Error exporting to Draw.io:', error);
      toast.error('Error al exportar el mapa');
    } finally {
      setIsSyncing(false);
    }
  }, [equipos, areas, activeCompany]);

  // Importar desde Draw.io
  const importFromDrawIO = useCallback(async (file) => {
    if (!activeCompany) {
      toast.error('No hay empresa activa');
      return;
    }

    setIsSyncing(true);
    
    try {
      const text = await file.text();
      const drawIOData = JSON.parse(text);
      
      // Validar estructura
      if (!drawIOData.equipos || !drawIOData.areas) {
        throw new Error('Formato de archivo inválido');
      }

      // Actualizar equipos
      const updatedEquipos = equipos.map(equipo => {
        const drawIOEquipo = drawIOData.equipos.find(e => e.id === equipo.id);
        if (drawIOEquipo) {
          return {
            ...equipo,
            x_coordinate: drawIOEquipo.x,
            y_coordinate: drawIOEquipo.y
          };
        }
        return equipo;
      });

      // Actualizar áreas
      const updatedAreas = drawIOData.areas.map(area => ({
        id: area.id,
        name: area.name,
        x: area.x,
        y: area.y,
        width: area.width,
        height: area.height,
        color: area.color,
        bgColor: area.color,
        borderColor: area.color,
        capacity: null,
        responsible: '',
        isCustom: true
      }));

      onEquiposChange(updatedEquipos);
      onAreasChange(updatedAreas);
      setLastSync(new Date());
      toast.success('Mapa importado desde Draw.io exitosamente');
    } catch (error) {
      console.error('Error importing from Draw.io:', error);
      toast.error('Error al importar el mapa');
    } finally {
      setIsSyncing(false);
    }
  }, [equipos, areas, activeCompany, onEquiposChange, onAreasChange]);

  return {
    isSyncing,
    lastSync,
    exportToDrawIO,
    importFromDrawIO
  };
};

export default DrawIOSync;