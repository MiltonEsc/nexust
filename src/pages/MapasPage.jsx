import React, { useState, useEffect } from 'react';
import { MapIcon, PlusIcon, EyeIcon, EyeSlashIcon, Cog6ToothIcon, DocumentDuplicateIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { supabase } from '../supabaseClient';
import { useAppContext } from '../context/AppContext';
import toast from 'react-hot-toast';
import Map2D from '../components/maps/Map2D';
import DrawIOSync from '../components/maps/DrawIOSync';
import EquipoLocationModal from '../components/modals/EquipoLocationModal';
import AssetDetailModal from '../components/modals/AssetDetailModal';
import AreaConfigModal from '../components/modals/AreaConfigModal';
import TemplateSelectModal from '../components/modals/TemplateSelectModal';

const MapasPage = () => {
  const { activeCompany } = useAppContext();
  const [equipos, setEquipos] = useState([]);
  const [selectedEquipo, setSelectedEquipo] = useState(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showUnlocated, setShowUnlocated] = useState(false);
  const [showAreaConfig, setShowAreaConfig] = useState(false);
  const [showTemplateSelect, setShowTemplateSelect] = useState(false);
  const [selectedArea, setSelectedArea] = useState(null);
  const [officeAreas, setOfficeAreas] = useState([]);
  const [newlyPlacedEquipo, setNewlyPlacedEquipo] = useState(null);
  const [draggedEquipo, setDraggedEquipo] = useState(null);
  const [isDraggingFromCard, setIsDraggingFromCard] = useState(false);
  const [isCreatingArea, setIsCreatingArea] = useState(false);
  const [editingArea, setEditingArea] = useState(null);
  // Using only 2D view now

  // Hook de sincronización con draw.io
  const drawIOSync = DrawIOSync({
    equipos,
    onEquiposChange: setEquipos,
    areas: officeAreas,
    onAreasChange: setOfficeAreas,
    activeCompany
  });

  // Cargar equipos
  const loadEquipos = async () => {
    if (!activeCompany) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('equipos')
        .select('*')
        .eq('company_id', activeCompany.id)
        .order('marca');

      if (error) throw error;

      setEquipos(data || []);
    } catch (error) {
      console.error('Error loading equipos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEquipos();
  }, [activeCompany]);

  // Efecto para quitar la animación de rebote después de 2 segundos
  useEffect(() => {
    if (newlyPlacedEquipo) {
      const timer = setTimeout(() => {
        setNewlyPlacedEquipo(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [newlyPlacedEquipo]);

  // Filtrar equipos según ubicación
  const filteredEquipos = showUnlocated 
    ? equipos // Mostrar todos los equipos cuando se muestra "sin ubicación"
    : equipos.filter(equipo => equipo.x_coordinate && equipo.y_coordinate && equipo.x_coordinate !== 0 && equipo.y_coordinate !== 0);

  // Manejar selección de equipo
  const handleEquipoSelect = (equipo) => {
    setSelectedEquipo(equipo);
    // No abrir modal automáticamente para permitir arrastre
  };

  // Manejar doble clic en equipo para abrir modal
  const handleEquipoDoubleClick = (equipo) => {
    setSelectedEquipo(equipo);
    setShowDetailModal(true);
  };

  // Manejar selección de área
  const handleAreaSelect = (area) => {
    setSelectedArea(area);
  };

  // Manejar selección de plantilla
  const handleTemplateSelect = (areas) => {
    setOfficeAreas(areas);
    setShowTemplateSelect(false);
  };

  // Manejar movimiento de equipo
  const handleEquipoMove = async (equipo, x, y, showToast = false) => {
    try {
      // Asegurar que las coordenadas sean enteros
      const newX = Math.round(x || equipo.x_coordinate);
      const newY = Math.round(y || equipo.y_coordinate);

      console.log('Moviendo equipo:', {
        id: equipo.id,
        oldX: equipo.x_coordinate,
        oldY: equipo.y_coordinate,
        newX,
        newY,
        showToast
      });

      // Actualizar el estado local primero para evitar parpadeo visual
      const updatedEquipo = {
        ...equipo,
        x_coordinate: newX,
        y_coordinate: newY
      };

      setEquipos(prev => 
        prev.map(e => 
          e.id === equipo.id ? updatedEquipo : e
        )
      );

      // Actualizar directamente en la base de datos
      const { error } = await supabase
        .from('equipos')
        .update({ 
          x_coordinate: newX, 
          y_coordinate: newY 
        })
        .eq('id', equipo.id)
        .eq('company_id', activeCompany.id);

      if (error) {
        throw error;
      }

      // Solo mostrar toast si se solicita explícitamente
      if (showToast) {
        toast.success('Ubicación actualizada');
      }
    } catch (error) {
      console.error('Error moving equipo:', error);
      if (showToast) {
        toast.error('Error al mover el equipo');
      }
    }
  };

  // Manejar final del arrastre de equipo
  const handleEquipoMoveEnd = async (equipo, x, y) => {
    await handleEquipoMove(equipo, x, y, true); // Mostrar toast al final
  };

  // Manejar actualización de ubicación
  const handleLocationUpdate = (updatedEquipo) => {
    setEquipos(prev => 
      prev.map(equipo => 
        equipo.id === updatedEquipo.id ? updatedEquipo : equipo
      )
    );
  };

  // Manejar eliminación de equipo del mapa
  const handleEquipoRemove = async (equipo) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar ${equipo.marca} ${equipo.modelo} del mapa?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('equipos')
        .update({ 
          x_coordinate: 0, 
          y_coordinate: 0 
        })
        .eq('id', equipo.id);

      if (error) throw error;

      // Actualizar el estado local
      setEquipos(prev => 
        prev.map(e => 
          e.id === equipo.id 
            ? { ...e, x_coordinate: 0, y_coordinate: 0 }
            : e
        )
      );

      // Limpiar selección
      setSelectedEquipo(null);

      // Mostrar notificación de éxito
      toast.success(`✅ ${equipo.marca} ${equipo.modelo} eliminado del mapa`, {
        duration: 3000,
        position: 'top-right',
        style: {
          background: '#10B981',
          color: '#fff',
          fontWeight: '500',
        },
      });
    } catch (error) {
      console.error('Error removing equipo:', error);
      toast.error('❌ Error al eliminar el equipo del mapa', {
        duration: 4000,
        position: 'top-right',
        style: {
          background: '#EF4444',
          color: '#fff',
          fontWeight: '500',
        },
      });
    }
  };

  // Manejar creación de área
  const handleAreaCreated = (newArea) => {
    setOfficeAreas(prev => [...prev, newArea]);
    toast.success('✅ Área creada exitosamente', {
      duration: 3000,
      position: 'top-right',
      style: {
        background: '#10B981',
        color: '#fff',
        fontWeight: '500',
      },
    });
  };

  // Manejar edición de área
  const handleAreaEdit = (area) => {
    setEditingArea(area);
  };

  // Manejar eliminación de área
  const handleAreaDelete = (areaId) => {
    setOfficeAreas(prev => prev.filter(area => area.id !== areaId));
    toast.success('✅ Área eliminada exitosamente', {
      duration: 3000,
      position: 'top-right',
      style: {
        background: '#10B981',
        color: '#fff',
        fontWeight: '500',
      },
    });
  };

  // Manejar actualización de áreas
  const handleAreasChange = (newAreas) => {
    setOfficeAreas(newAreas);
  };

  // Colocar equipo en el mapa
  const handlePlaceEquipo = (equipo) => {
    // Generar posición automática basada en equipos ya ubicados
    const equiposUbicados = equipos.filter(e => 
      e.x_coordinate && e.y_coordinate && e.x_coordinate !== 0 && e.y_coordinate !== 0
    );
    const position = generateAutoPosition(equiposUbicados);
    
    // Actualizar el equipo con la nueva posición
    const updatedEquipo = {
      ...equipo,
      x_coordinate: position.x,
      y_coordinate: position.y
    };

    // Guardar en la base de datos
    saveEquipoPosition(updatedEquipo);
  };

  // Generar posición automática para evitar superposición
  const generateAutoPosition = (existingEquipos) => {
    const gridSize = 60;
    const margin = 80;
    const maxAttempts = 200;
    
    // Si no hay equipos ubicados, empezar desde el centro
    if (existingEquipos.length === 0) {
      return { x: 300, y: 200 };
    }
    
    // Buscar posición en espiral desde el centro
    for (let radius = 0; radius < 20; radius++) {
      for (let angle = 0; angle < 360; angle += 30) {
        const x = 300 + Math.cos(angle * Math.PI / 180) * radius * gridSize;
        const y = 200 + Math.sin(angle * Math.PI / 180) * radius * gridSize;
        
        // Verificar que esté dentro de los límites del mapa
        if (x < margin || x > 800 - margin || y < margin || y > 600 - margin) {
          continue;
        }
        
        // Verificar si la posición está libre
        const isOccupied = existingEquipos.some(equipo => 
          equipo.x_coordinate && 
          equipo.y_coordinate &&
          equipo.x_coordinate !== 0 && 
          equipo.y_coordinate !== 0 &&
          Math.abs(equipo.x_coordinate - x) < 40 &&
          Math.abs(equipo.y_coordinate - y) < 40
        );
        
        if (!isOccupied) {
          return { x: Math.round(x), y: Math.round(y) };
        }
      }
    }
    
    // Si no se encuentra posición libre, usar posición aleatoria
    return {
      x: margin + Math.random() * 500,
      y: margin + Math.random() * 400
    };
  };

  // Guardar posición del equipo
  const saveEquipoPosition = async (equipo) => {
    try {
      // Asegurar que las coordenadas sean enteros
      const x = Math.round(equipo.x_coordinate);
      const y = Math.round(equipo.y_coordinate);

      const { error } = await supabase
        .from('equipos')
        .update({ 
          x_coordinate: x, 
          y_coordinate: y 
        })
        .eq('id', equipo.id);

      if (error) throw error;

      // Actualizar el estado local
      setEquipos(prev => 
        prev.map(e => 
          e.id === equipo.id 
            ? { ...e, x_coordinate: x, y_coordinate: y }
            : e
        )
      );

      // Mostrar animación de rebote
      setNewlyPlacedEquipo({ ...equipo, x_coordinate: x, y_coordinate: y });
      
      // Mostrar notificación de éxito (sin cambiar vista)
      toast.success(`✅ ${equipo.marca} ${equipo.modelo} colocado en el mapa`, {
        duration: 3000,
        position: 'top-right',
        style: {
          background: '#10B981',
          color: '#fff',
          fontWeight: '500',
        },
      });
    } catch (error) {
      console.error('Error placing equipo:', error);
      toast.error('❌ Error al colocar el equipo en el mapa', {
        duration: 4000,
        position: 'top-right',
        style: {
          background: '#EF4444',
          color: '#fff',
          fontWeight: '500',
        },
      });
    }
  };

  // Manejar inicio del arrastre desde tarjeta
  const handleDragStart = (e, equipo) => {
    setDraggedEquipo(equipo);
    setIsDraggingFromCard(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', equipo.id);
  };

  // Manejar fin del arrastre
  const handleDragEnd = () => {
    setDraggedEquipo(null);
    setIsDraggingFromCard(false);
  };

  // Manejar drop en el mapa
  const handleMapDrop = (e) => {
    e.preventDefault();
    
    if (!draggedEquipo || !isDraggingFromCard) return;

    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);

    // Crear el equipo actualizado con la nueva posición
    const updatedEquipo = {
      ...draggedEquipo,
      x_coordinate: x,
      y_coordinate: y
    };

    // Guardar la nueva posición del equipo
    saveEquipoPosition(updatedEquipo);
    
    // Limpiar el estado de arrastre
    setDraggedEquipo(null);
    setIsDraggingFromCard(false);
  };

  // Manejar drag over en el mapa
  const handleMapDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MapIcon className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mapas de Ubicación</h1>
            <p className="text-gray-600">Visualiza la ubicación física de tus equipos</p>
            {drawIOSync.lastSync && (
              <p className="text-xs text-gray-500">
                Última sincronización: {drawIOSync.lastSync.toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>
        
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <MapIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Equipos</p>
              <p className="text-2xl font-bold text-gray-900">{equipos.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <MapIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Con Ubicación</p>
              <p className="text-2xl font-bold text-gray-900">
                {equipos.filter(e => e.x_coordinate && e.y_coordinate && e.x_coordinate !== 0 && e.y_coordinate !== 0).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <MapIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Sin Ubicación</p>
              <p className="text-2xl font-bold text-gray-900">
                {equipos.filter(e => !e.x_coordinate || !e.y_coordinate || e.x_coordinate === 0 || e.y_coordinate === 0).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mapa 2D */}
      <Map2D 
        onEquipoSelect={handleEquipoSelect}
        onEquipoDoubleClick={handleEquipoDoubleClick}
        selectedEquipo={selectedEquipo}
      />



      {/* Lista de equipos sin ubicación */}
      {showUnlocated && (
        <div className="bg-white rounded-lg shadow border">
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">
              Equipos sin ubicación ({equipos.filter(e => !e.x_coordinate || !e.y_coordinate || e.x_coordinate === 0 || e.y_coordinate === 0).length})
            </h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {equipos
                .filter(equipo => !equipo.x_coordinate || !equipo.y_coordinate || equipo.x_coordinate === 0 || equipo.y_coordinate === 0)
                .map(equipo => (
                  <div 
                    key={equipo.id} 
                    className="border rounded-lg p-4 hover:bg-gray-50 cursor-grab active:cursor-grabbing"
                    draggable
                    onDragStart={(e) => handleDragStart(e, equipo)}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">
                          {equipo.marca} {equipo.modelo}
                        </h4>
                        <p className="text-sm text-gray-600">{equipo.tipo}</p>
                        <p className="text-xs text-gray-500">{equipo.numero_serie}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-gray-400">Arrastra al mapa</div>
                        <button
                          onClick={() => handlePlaceEquipo(equipo)}
                          className="ml-2 p-2 text-blue-600 hover:bg-blue-100 rounded-md"
                          title="Colocar en mapa"
                        >
                          <PlusIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Modales */}
      <EquipoLocationModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        equipo={selectedEquipo}
        onUpdate={handleLocationUpdate}
      />

      <AssetDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        asset={selectedEquipo}
        assetType="equipo"
      />

      <AreaConfigModal
        isOpen={showAreaConfig}
        onClose={() => setShowAreaConfig(false)}
        areas={officeAreas}
        onSave={setOfficeAreas}
      />

      <TemplateSelectModal
        isOpen={showTemplateSelect}
        onClose={() => setShowTemplateSelect(false)}
        onSelectTemplate={handleTemplateSelect}
      />

      {/* Modal de edición de área */}
      {editingArea && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Editar Área: {editingArea.name}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                La edición de áreas se realiza desde el gestor de áreas arriba.
              </p>
              <button
                onClick={() => setEditingArea(null)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapasPage;
