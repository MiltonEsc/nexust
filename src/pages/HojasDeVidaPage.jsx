// src/pages/HojasDeVidaPage.jsx

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import UserCard from "../components/UserCard";
import UserDetailModal from '../components/modals/UserDetailModal';

function HojasDeVidaPage() {
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewingUser, setViewingUser] = useState(null);
  const navigate = useNavigate();

  const fetchRegistros = async () => {
    try {
      setLoading(true);
      
      // ▼▼▼ AQUÍ ESTÁ EL CAMBIO ▼▼▼
      // Llamamos a nuestra nueva función RPC en lugar de hacer un 'select'
      const { data, error } = await supabase.rpc('get_registros_details');

      if (error) throw error;
      setRegistros(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistros();
  }, []);

  const handleDelete = async (idToDelete) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar esta hoja de vida?")) {
      try {
        const { error } = await supabase.from("registros").delete().eq("id", idToDelete);
        if (error) throw error;
        fetchRegistros();
      } catch (err) {
        alert(`Error al eliminar: ${err.message}`);
      }
    }
  };

  const handleEdit = (registro) => {
    navigate(`/hojas-de-vida/editar/${registro.id}`);
  };

  const handleViewDetails = (registro) => {
    setViewingUser(registro);
  };

  if (loading) return <p className="p-4">Cargando hojas de vida...</p>;
  if (error) return <p className="p-4 text-red-600">Error: {error}</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Hojas de Vida</h1>
        <button onClick={() => navigate("/hojas-de-vida/nuevo")} className="btn-primary">
          Añadir Registro
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {registros.length > 0 ? (
          registros.map((registro) => (
            <UserCard
              key={registro.id}
              registro={registro}
              onDelete={handleDelete}
              onEdit={handleEdit}
              onViewDetails={handleViewDetails}
            />
          ))
        ) : (
          <p className="md:col-span-2 lg:col-span-3 text-center text-gray-500">
            No hay hojas de vida registradas.
          </p>
        )}
      </div>
      
      <UserDetailModal 
        registro={viewingUser}
        onClose={() => setViewingUser(null)}
      />
    </div>
  );
}

export default HojasDeVidaPage;