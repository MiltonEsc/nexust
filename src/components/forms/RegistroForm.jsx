// src/components/forms/RegistroForm.jsx

import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { useNavigate } from "react-router-dom";
import { 
  MagnifyingGlassIcon, 
  CheckIcon, 
  XMarkIcon,
  ComputerDesktopIcon,
  CommandLineIcon,
  CubeIcon,
  UserIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from "@heroicons/react/24/outline";

function RegistroForm({ registroToEdit, onSuccess }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nombre: "",
    cargo: "",
    departamento: "",
    cedula: "",
    fecha_ingreso: "",
    induccion_tic: false,
    cuentas_creadas: "",
    equipo_id: "",
    software_ids: [],
    perifericos_ids: [],
  });

  const [inventario, setInventario] = useState({
    equipos: [],
    software: [],
    perifericos: [],
  });
  const [loading, setLoading] = useState(false);
  const [activeCompanyId, setActiveCompanyId] = useState(null);
  
  // Estados para filtros y búsquedas
  const [searchFilters, setSearchFilters] = useState({
    equipos: "",
    software: "",
    perifericos: ""
  });
  const [showDropdowns, setShowDropdowns] = useState({
    equipos: false,
    software: false,
    perifericos: false
  });
  const [selectedItems, setSelectedItems] = useState({
    equipos: null,
    software: [],
    perifericos: []
  });

  useEffect(() => {
    const fetchInventario = async () => {
      const { data: companies } = await supabase
        .from("company_users")
        .select("company_id")
        .limit(1);

      if (companies && companies.length > 0) {
        const companyId = companies[0].company_id;
        setActiveCompanyId(companyId);

        let equiposQuery = supabase
          .from("equipos")
          .select("id, marca, modelo")
          .eq("company_id", companyId);

        if (registroToEdit && registroToEdit.equipo_id) {
          equiposQuery = equiposQuery.or(
            `registro_id.is.null,id.eq.${registroToEdit.equipo_id}`
          );
        } else {
          equiposQuery = equiposQuery.is("registro_id", null);
        }

        const [equiposRes, softwareRes, perifericosRes] = await Promise.all([
          equiposQuery,
          supabase
            .from("software")
            .select("id, nombre, version")
            .eq("company_id", companyId),
          supabase
            .from("perifericos")
            .select("id, tipo, marca, modelo")
            .eq("company_id", companyId),
        ]);

        setInventario({
          equipos: equiposRes.data || [],
          software: softwareRes.data || [],
          perifericos: perifericosRes.data || [],
        });
      }
    };
    fetchInventario();
  }, [registroToEdit]);

  useEffect(() => {
    if (registroToEdit) {
      setFormData({
        ...registroToEdit,
        equipo_id: registroToEdit.equipo_id || "",
        software_ids: registroToEdit.software_ids || [],
        perifericos_ids: registroToEdit.perifericos_ids || [],
        fecha_ingreso: registroToEdit.fecha_ingreso
          ? registroToEdit.fecha_ingreso.split("T")[0]
          : "",
      });
    }
  }, [registroToEdit]);

  // Inicializar elementos seleccionados cuando se cargan los datos
  useEffect(() => {
    if (inventario.equipos.length > 0 && formData.equipo_id) {
      const equipo = inventario.equipos.find(e => e.id === formData.equipo_id);
      if (equipo) {
        setSelectedItems(prev => ({ ...prev, equipos: equipo }));
      }
    }
    
    if (inventario.software.length > 0 && formData.software_ids.length > 0) {
      const software = inventario.software.filter(s => formData.software_ids.includes(s.id));
      setSelectedItems(prev => ({ ...prev, software }));
    }
    
    if (inventario.perifericos.length > 0 && formData.perifericos_ids.length > 0) {
      const perifericos = inventario.perifericos.filter(p => formData.perifericos_ids.includes(p.id));
      setSelectedItems(prev => ({ ...prev, perifericos }));
    }
  }, [inventario, formData.equipo_id, formData.software_ids, formData.perifericos_ids]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleMultiSelectChange = (e) => {
    const { name, options } = e.target;
    const selectedIds = Array.from(options)
      .filter((opt) => opt.selected)
      .map((opt) => Number(opt.value));
    setFormData((prev) => ({ ...prev, [name]: selectedIds }));
  };

  // Funciones de filtrado y búsqueda
  const handleSearchChange = (type, value) => {
    setSearchFilters(prev => ({ ...prev, [type]: value }));
  };

  const toggleDropdown = (type) => {
    setShowDropdowns(prev => ({ ...prev, [type]: !prev[type] }));
  };

  const selectEquipo = (equipo) => {
    setSelectedItems(prev => ({ ...prev, equipos: equipo }));
    setFormData(prev => ({ ...prev, equipo_id: equipo.id }));
    setShowDropdowns(prev => ({ ...prev, equipos: false }));
    setSearchFilters(prev => ({ ...prev, equipos: "" }));
  };

  const toggleSoftware = (software) => {
    const isSelected = selectedItems.software.some(s => s.id === software.id);
    let newSelection;
    
    if (isSelected) {
      newSelection = selectedItems.software.filter(s => s.id !== software.id);
    } else {
      newSelection = [...selectedItems.software, software];
    }
    
    setSelectedItems(prev => ({ ...prev, software: newSelection }));
    setFormData(prev => ({ 
      ...prev, 
      software_ids: newSelection.map(s => s.id) 
    }));
  };

  const togglePeriferico = (periferico) => {
    const isSelected = selectedItems.perifericos.some(p => p.id === periferico.id);
    let newSelection;
    
    if (isSelected) {
      newSelection = selectedItems.perifericos.filter(p => p.id !== periferico.id);
    } else {
      newSelection = [...selectedItems.perifericos, periferico];
    }
    
    setSelectedItems(prev => ({ ...prev, perifericos: newSelection }));
    setFormData(prev => ({ 
      ...prev, 
      perifericos_ids: newSelection.map(p => p.id) 
    }));
  };

  const removeSelectedItem = (type, itemId) => {
    if (type === 'equipos') {
      setSelectedItems(prev => ({ ...prev, equipos: null }));
      setFormData(prev => ({ ...prev, equipo_id: "" }));
    } else {
      const newSelection = selectedItems[type].filter(item => item.id !== itemId);
      setSelectedItems(prev => ({ ...prev, [type]: newSelection }));
      setFormData(prev => ({ 
        ...prev, 
        [`${type}_ids`]: newSelection.map(item => item.id) 
      }));
    }
  };

  // Funciones de filtrado
  const getFilteredItems = (type) => {
    const items = inventario[type] || [];
    const searchTerm = searchFilters[type].toLowerCase();
    
    if (!searchTerm) return items;
    
    return items.filter(item => {
      if (type === 'equipos') {
        return `${item.marca} ${item.modelo}`.toLowerCase().includes(searchTerm);
      } else if (type === 'software') {
        return `${item.nombre} ${item.version || ''}`.toLowerCase().includes(searchTerm);
      } else if (type === 'perifericos') {
        return `${item.tipo} ${item.marca} ${item.modelo || ''}`.toLowerCase().includes(searchTerm);
      }
      return true;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const oldEquipoId = registroToEdit?.equipo_id;
      const newEquipoId = formData.equipo_id || null;
      const oldSoftwareIds = registroToEdit?.software_ids || [];
      const newSoftwareIds = formData.software_ids || [];
      const oldPerifericosIds = registroToEdit?.perifericos_ids || [];
      const newPerifericosIds = formData.perifericos_ids || [];

      const newLogs = [];
      const currentDate = new Date().toISOString();

      // --- LÓGICA DE TRAZABILIDAD AUTOMÁTICA ---
      // 1. Detectar cambios en Software
      const softwareAdded = newSoftwareIds.filter(
        (id) => !oldSoftwareIds.includes(id)
      );
      const softwareRemoved = oldSoftwareIds.filter(
        (id) => !newSoftwareIds.includes(id)
      );

      softwareAdded.forEach((id) => {
        const item = inventario.software.find((s) => s.id === id);
        newLogs.push({
          fecha: currentDate,
          accion: "Asignación de Software",
          detalle: `Se asigna software: ${item.nombre} ${
            item.version || ""
          }`.trim(),
        });
      });
      softwareRemoved.forEach((id) => {
        const item = inventario.software.find((s) => s.id === id);
        newLogs.push({
          fecha: currentDate,
          accion: "Devolución de Software",
          detalle: `Se devuelve software: ${item.nombre} ${
            item.version || ""
          }`.trim(),
        });
      });

      // 2. Detectar cambios en Periféricos
      const perifericosAdded = newPerifericosIds.filter(
        (id) => !oldPerifericosIds.includes(id)
      );
      const perifericosRemoved = oldPerifericosIds.filter(
        (id) => !newPerifericosIds.includes(id)
      );

      perifericosAdded.forEach((id) => {
        const item = inventario.perifericos.find((p) => p.id === id);
        newLogs.push({
          fecha: currentDate,
          accion: "Asignación de Periférico",
          detalle: `Se asigna periférico: ${item.tipo} ${item.marca} ${
            item.modelo || ""
          }`.trim(),
        });
      });
      perifericosRemoved.forEach((id) => {
        const item = inventario.perifericos.find((p) => p.id === id);
        newLogs.push({
          fecha: currentDate,
          accion: "Devolución de Periférico",
          detalle: `Se devuelve periférico: ${item.tipo} ${item.marca} ${
            item.modelo || ""
          }`.trim(),
        });
      });

      const currentTrazabilidad = registroToEdit?.trazabilidad || [];
      const combinedTrazabilidad = [...currentTrazabilidad, ...newLogs];

      const dataToSubmit = {
        ...formData,
        equipo_id: newEquipoId,
        company_id: activeCompanyId,
        trazabilidad: combinedTrazabilidad, // Incluimos los nuevos logs
      };

      let registroResult;
      if (registroToEdit) {
        const { id, ...updateData } = dataToSubmit;
        registroResult = await supabase
          .from("registros")
          .update(updateData)
          .eq("id", registroToEdit.id)
          .select()
          .single();
      } else {
        registroResult = await supabase
          .from("registros")
          .insert([dataToSubmit])
          .select()
          .single();
      }

      if (registroResult.error) throw registroResult.error;
      const savedRegistro = registroResult.data;

      // Actualizar la asignación en la tabla de equipos
      if (oldEquipoId !== newEquipoId) {
        if (oldEquipoId) {
          await supabase
            .from("equipos")
            .update({ registro_id: null })
            .eq("id", oldEquipoId);
        }
        if (newEquipoId) {
          await supabase
            .from("equipos")
            .update({ registro_id: savedRegistro.id })
            .eq("id", newEquipoId);
        }
      }

      onSuccess();
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Header del formulario */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center space-x-3">
            <UserIcon className="h-8 w-8" />
            <div>
              <h2 className="text-2xl font-bold">
                {registroToEdit ? 'Editar Usuario' : 'Registrar Nuevo Usuario'}
              </h2>
              <p className="text-blue-100">
                {registroToEdit ? 'Actualiza la información del usuario' : 'Completa la información del usuario y asigna recursos'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Columna Izquierda: Datos del Usuario */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-2 mb-6">
                <UserIcon className="h-6 w-6 text-blue-600" />
                <h3 className="text-xl font-semibold text-gray-800">Datos Personales</h3>
              </div>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre y Apellido *
                  </label>
                  <input
                    type="text"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Ej: Juan Pérez"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cargo *
                    </label>
                    <input
                      type="text"
                      name="cargo"
                      value={formData.cargo}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="Ej: Desarrollador"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Departamento
                    </label>
                    <input
                      type="text"
                      name="departamento"
                      value={formData.departamento}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="Ej: Tecnología"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cédula
                    </label>
                    <input
                      type="text"
                      name="cedula"
                      value={formData.cedula}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="Ej: 12345678"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha de Ingreso
                    </label>
                    <div className="relative">
                      <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="date"
                        name="fecha_ingreso"
                        value={formData.fecha_ingreso}
                        onChange={handleChange}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sección de Cuentas */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-2 mb-6">
                <BuildingOfficeIcon className="h-6 w-6 text-green-600" />
                <h3 className="text-xl font-semibold text-gray-800">Cuentas y Accesos</h3>
              </div>
              
              <div className="space-y-5">
                <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center h-5">
                    <input
                      id="induccion_tic"
                      name="induccion_tic"
                      type="checkbox"
                      checked={formData.induccion_tic}
                      onChange={handleChange}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex-1">
                    <label htmlFor="induccion_tic" className="text-sm font-medium text-gray-700">
                      Recibió Inducción TIC
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      Marcar si el usuario completó la inducción inicial de tecnologías de la información.
                    </p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cuentas de Usuario Creadas
                  </label>
                  <textarea
                    name="cuentas_creadas"
                    value={formData.cuentas_creadas}
                    onChange={handleChange}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Listar una cuenta por línea...&#10;Ejemplo:&#10;juan.perez@empresa.com&#10;usuario.sistema@empresa.com"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Asignación de Recursos */}
          <div className="space-y-6">
            {/* Equipo Principal */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-2 mb-6">
                <ComputerDesktopIcon className="h-6 w-6 text-purple-600" />
                <h3 className="text-xl font-semibold text-gray-800">Equipo Principal</h3>
              </div>
              
              <div className="space-y-4">
                {/* Equipo seleccionado */}
                {selectedItems.equipos ? (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <ComputerDesktopIcon className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="font-medium text-blue-900">
                            {selectedItems.equipos.marca} {selectedItems.equipos.modelo}
                          </p>
                          <p className="text-sm text-blue-700">Equipo asignado</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeSelectedItem('equipos', selectedItems.equipos.id)}
                        className="text-blue-600 hover:text-blue-800 transition-colors p-1"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg text-center">
                    <ComputerDesktopIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">Sin equipo asignado</p>
                  </div>
                )}
                
                {/* Selector de equipo */}
                <div className="relative">
                  <div className="flex">
                    <div className="relative flex-1">
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Buscar equipo..."
                        value={searchFilters.equipos}
                        onChange={(e) => handleSearchChange('equipos', e.target.value)}
                        onFocus={() => setShowDropdowns(prev => ({ ...prev, equipos: true }))}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleDropdown('equipos')}
                      className="ml-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      {showDropdowns.equipos ? 'Ocultar' : 'Buscar'}
                    </button>
                  </div>
                  
                  {showDropdowns.equipos && (
                    <div className="absolute z-10 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {getFilteredItems('equipos').length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                          No se encontraron equipos
                        </div>
                      ) : (
                        getFilteredItems('equipos').map((equipo) => (
                          <button
                            key={equipo.id}
                            type="button"
                            onClick={() => selectEquipo(equipo)}
                            className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
                          >
                            <div className="flex items-center space-x-3">
                              <ComputerDesktopIcon className="h-5 w-5 text-gray-400" />
                              <div>
                                <p className="font-medium text-gray-900">
                                  {equipo.marca} {equipo.modelo}
                                </p>
                                <p className="text-sm text-gray-500">Equipo disponible</p>
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Software */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-2 mb-6">
                <CommandLineIcon className="h-6 w-6 text-orange-600" />
                <h3 className="text-xl font-semibold text-gray-800">Software</h3>
                <span className="text-sm text-gray-500">({selectedItems.software.length} seleccionados)</span>
              </div>
              
              <div className="space-y-4">
                {/* Software seleccionado */}
                {selectedItems.software.length > 0 && (
                  <div className="space-y-2">
                    {selectedItems.software.map((software) => (
                      <div key={software.id} className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <CommandLineIcon className="h-5 w-5 text-orange-600" />
                          <div>
                            <p className="font-medium text-orange-900">{software.nombre}</p>
                            {software.version && (
                              <p className="text-sm text-orange-700">v{software.version}</p>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeSelectedItem('software', software.id)}
                          className="text-orange-600 hover:text-orange-800 transition-colors p-1"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Selector de software */}
                <div className="relative">
                  <div className="flex">
                    <div className="relative flex-1">
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Buscar software..."
                        value={searchFilters.software}
                        onChange={(e) => handleSearchChange('software', e.target.value)}
                        onFocus={() => setShowDropdowns(prev => ({ ...prev, software: true }))}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleDropdown('software')}
                      className="ml-2 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
                    >
                      {showDropdowns.software ? 'Ocultar' : 'Buscar'}
                    </button>
                  </div>
                  
                  {showDropdowns.software && (
                    <div className="absolute z-10 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {getFilteredItems('software').length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                          No se encontró software
                        </div>
                      ) : (
                        getFilteredItems('software').map((software) => {
                          const isSelected = selectedItems.software.some(s => s.id === software.id);
                          return (
                            <button
                              key={software.id}
                              type="button"
                              onClick={() => toggleSoftware(software)}
                              className={`w-full text-left px-4 py-3 transition-colors border-b border-gray-100 last:border-b-0 ${
                                isSelected ? 'bg-orange-50' : 'hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center space-x-3">
                                <CommandLineIcon className="h-5 w-5 text-gray-400" />
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900">{software.nombre}</p>
                                  {software.version && (
                                    <p className="text-sm text-gray-500">v{software.version}</p>
                                  )}
                                </div>
                                {isSelected && (
                                  <CheckIcon className="h-5 w-5 text-orange-600" />
                                )}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Periféricos */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-2 mb-6">
                <CubeIcon className="h-6 w-6 text-indigo-600" />
                <h3 className="text-xl font-semibold text-gray-800">Periféricos</h3>
                <span className="text-sm text-gray-500">({selectedItems.perifericos.length} seleccionados)</span>
              </div>
              
              <div className="space-y-4">
                {/* Periféricos seleccionados */}
                {selectedItems.perifericos.length > 0 && (
                  <div className="space-y-2">
                    {selectedItems.perifericos.map((periferico) => (
                      <div key={periferico.id} className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <CubeIcon className="h-5 w-5 text-indigo-600" />
                          <div>
                            <p className="font-medium text-indigo-900">
                              {periferico.tipo} - {periferico.marca}
                            </p>
                            {periferico.modelo && (
                              <p className="text-sm text-indigo-700">{periferico.modelo}</p>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeSelectedItem('perifericos', periferico.id)}
                          className="text-indigo-600 hover:text-indigo-800 transition-colors p-1"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Selector de periféricos */}
                <div className="relative">
                  <div className="flex">
                    <div className="relative flex-1">
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Buscar periféricos..."
                        value={searchFilters.perifericos}
                        onChange={(e) => handleSearchChange('perifericos', e.target.value)}
                        onFocus={() => setShowDropdowns(prev => ({ ...prev, perifericos: true }))}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleDropdown('perifericos')}
                      className="ml-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                    >
                      {showDropdowns.perifericos ? 'Ocultar' : 'Buscar'}
                    </button>
                  </div>
                  
                  {showDropdowns.perifericos && (
                    <div className="absolute z-10 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {getFilteredItems('perifericos').length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                          No se encontraron periféricos
                        </div>
                      ) : (
                        getFilteredItems('perifericos').map((periferico) => {
                          const isSelected = selectedItems.perifericos.some(p => p.id === periferico.id);
                          return (
                            <button
                              key={periferico.id}
                              type="button"
                              onClick={() => togglePeriferico(periferico)}
                              className={`w-full text-left px-4 py-3 transition-colors border-b border-gray-100 last:border-b-0 ${
                                isSelected ? 'bg-indigo-50' : 'hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center space-x-3">
                                <CubeIcon className="h-5 w-5 text-gray-400" />
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900">
                                    {periferico.tipo} - {periferico.marca}
                                  </p>
                                  {periferico.modelo && (
                                    <p className="text-sm text-gray-500">{periferico.modelo}</p>
                                  )}
                                </div>
                                {isSelected && (
                                  <CheckIcon className="h-5 w-5 text-indigo-600" />
                                )}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <ExclamationTriangleIcon className="h-5 w-5" />
              <span>Los campos marcados con * son obligatorios</span>
            </div>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => navigate("/hojas-de-vida")}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-medium flex items-center space-x-2 text-sm"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="h-4 w-4" />
                    <span>{registroToEdit ? 'Actualizar Usuario' : 'Guardar Usuario'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

export default RegistroForm;
