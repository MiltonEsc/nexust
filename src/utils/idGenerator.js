// Generador de IDs únicos para áreas
export const generateUniqueAreaId = () => {
  return `area_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Generador de IDs únicos para equipos
export const generateUniqueEquipoId = () => {
  return `equipo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Generador de IDs únicos genérico
export const generateUniqueId = (prefix = 'id') => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};