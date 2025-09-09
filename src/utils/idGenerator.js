/**
 * Genera un ID único para áreas
 * Combina timestamp con string aleatorio para evitar colisiones
 */
export const generateUniqueAreaId = () => {
  return `area_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Genera un ID único para equipos
 * Combina timestamp con string aleatorio para evitar colisiones
 */
export const generateUniqueEquipoId = () => {
  return `equipo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Genera un ID único genérico
 * Combina timestamp con string aleatorio para evitar colisiones
 */
export const generateUniqueId = (prefix = 'id') => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};
