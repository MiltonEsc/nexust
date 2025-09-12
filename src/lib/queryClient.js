import { QueryClient } from '@tanstack/react-query';

// Configuración optimizada de React Query
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache por 5 minutos por defecto
      staleTime: 5 * 60 * 1000,
      // Mantener en cache por 10 minutos
      gcTime: 10 * 60 * 1000,
      // Reintentar 3 veces en caso de error
      retry: 3,
      // Reintentar con delay exponencial
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch en ventana focus solo si los datos están stale
      refetchOnWindowFocus: 'always',
      // No refetch en reconexión si los datos son recientes
      refetchOnReconnect: 'always',
    },
    mutations: {
      // Reintentar mutaciones 1 vez
      retry: 1,
    },
  },
});

// Claves de query para consistencia
export const QUERY_KEYS = {
  EQUIPOS: 'equipos',
  SOFTWARE: 'software',
  PERIFERICOS: 'perifericos',
  CONSUMIBLES: 'consumibles',
  AREAS: 'areas',
  DASHBOARD: 'dashboard',
  COMPANIES: 'companies',
  USERS: 'users',
  MAINTENANCE: 'maintenance',
  REPORTS: 'reports',
};

// Configuración de cache por tipo de datos
export const CACHE_CONFIG = {
  // Datos que cambian poco
  STATIC: {
    staleTime: 30 * 60 * 1000, // 30 minutos
    gcTime: 60 * 60 * 1000,    // 1 hora
  },
  // Datos que cambian frecuentemente
  DYNAMIC: {
    staleTime: 30 * 1000,      // 30 segundos
    gcTime: 5 * 60 * 1000,     // 5 minutos
  },
  // Datos en tiempo real
  REALTIME: {
    staleTime: 0,              // Siempre stale
    gcTime: 2 * 60 * 1000,     // 2 minutos
    refetchInterval: 30 * 1000, // Refetch cada 30 segundos
  },
};
