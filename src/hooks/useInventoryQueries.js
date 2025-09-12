import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { QUERY_KEYS, CACHE_CONFIG } from '../lib/queryClient';

// Hook para obtener equipos con cache optimizado
export const useEquipos = (companyId, options = {}) => {
  return useQuery({
    queryKey: [QUERY_KEYS.EQUIPOS, companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipos')
        .select('*, trazabilidad')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
    ...CACHE_CONFIG.DYNAMIC,
    ...options,
  });
};

// Hook para obtener software
export const useSoftware = (companyId, options = {}) => {
  return useQuery({
    queryKey: [QUERY_KEYS.SOFTWARE, companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('software')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
    ...CACHE_CONFIG.STATIC,
    ...options,
  });
};

// Hook para obtener periféricos
export const usePerifericos = (companyId, options = {}) => {
  return useQuery({
    queryKey: [QUERY_KEYS.PERIFERICOS, companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('perifericos')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
    ...CACHE_CONFIG.STATIC,
    ...options,
  });
};

// Hook para obtener áreas
export const useAreas = (companyId, options = {}) => {
  return useQuery({
    queryKey: [QUERY_KEYS.AREAS, companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('areas')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
    ...CACHE_CONFIG.STATIC,
    ...options,
  });
};

// Hook para datos del dashboard con cache inteligente
export const useDashboardData = (companyId, options = {}) => {
  return useQuery({
    queryKey: [QUERY_KEYS.DASHBOARD, companyId],
    queryFn: async () => {
      // Obtener datos en paralelo para mejor rendimiento
      const [equiposRes, registrosRes, softwareRes, perifericosRes] = await Promise.all([
        supabase.from('equipos').select('*, trazabilidad').eq('company_id', companyId),
        supabase.from('registros').select('*').eq('company_id', companyId),
        supabase.from('software').select('*').eq('company_id', companyId),
        supabase.from('perifericos').select('*').eq('company_id', companyId),
      ]);

      if (equiposRes.error) throw equiposRes.error;
      if (registrosRes.error) throw registrosRes.error;
      if (softwareRes.error) throw softwareRes.error;
      if (perifericosRes.error) throw perifericosRes.error;

      return {
        equipos: equiposRes.data || [],
        registros: registrosRes.data || [],
        software: softwareRes.data || [],
        perifericos: perifericosRes.data || [],
      };
    },
    enabled: !!companyId,
    ...CACHE_CONFIG.DYNAMIC,
    ...options,
  });
};

// Hook para mutaciones de equipos
export const useEquipoMutations = () => {
  const queryClient = useQueryClient();

  const createEquipo = useMutation({
    mutationFn: async (equipoData) => {
      const { data, error } = await supabase
        .from('equipos')
        .insert(equipoData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.EQUIPOS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.DASHBOARD] });
    },
  });

  const updateEquipo = useMutation({
    mutationFn: async ({ id, ...equipoData }) => {
      const { data, error } = await supabase
        .from('equipos')
        .update(equipoData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Actualizar cache directamente
      queryClient.setQueryData([QUERY_KEYS.EQUIPOS, data.company_id], (old) => {
        if (!old) return old;
        return old.map(equipo => equipo.id === data.id ? data : equipo);
      });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.DASHBOARD] });
    },
  });

  const deleteEquipo = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('equipos')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      // Remover del cache
      queryClient.setQueryData([QUERY_KEYS.EQUIPOS], (old) => {
        if (!old) return old;
        return old.filter(equipo => equipo.id !== id);
      });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.DASHBOARD] });
    },
  });

  return {
    createEquipo,
    updateEquipo,
    deleteEquipo,
  };
};

// Hook para búsqueda optimizada
export const useInventorySearch = (companyId, searchTerm, type = 'all') => {
  return useQuery({
    queryKey: [QUERY_KEYS.EQUIPOS, 'search', companyId, searchTerm, type],
    queryFn: async () => {
      if (!searchTerm.trim()) return [];

      const tables = type === 'all' ? ['equipos', 'software', 'perifericos'] : [type];
      const results = [];

      for (const table of tables) {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .eq('company_id', companyId)
          .or(`nombre.ilike.%${searchTerm}%,marca.ilike.%${searchTerm}%,modelo.ilike.%${searchTerm}%`)
          .limit(20);

        if (error) throw error;
        results.push(...(data || []).map(item => ({ ...item, type: table })));
      }

      return results;
    },
    enabled: !!companyId && !!searchTerm.trim(),
    ...CACHE_CONFIG.DYNAMIC,
  });
};
