import React, { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';

// Lazy loading del componente Map2D
const Map2D = lazy(() => import('./Map2D'));

// Componente de carga
const Map2DLoader = () => (
  <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
    <div className="text-center">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
      <p className="text-gray-600">Cargando mapa...</p>
    </div>
  </div>
);

// Componente wrapper con Suspense
const LazyMap2D = (props) => {
  return (
    <Suspense fallback={<Map2DLoader />}>
      <Map2D {...props} />
    </Suspense>
  );
};

export default LazyMap2D;
