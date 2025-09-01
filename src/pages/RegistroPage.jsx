// src/pages/RegistroPage.jsx

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import RegistroForm from "../components/forms/RegistroForm"; // Crearemos este a continuación

function RegistroPage() {
  const { registroId } = useParams(); // Lee el ':registroId' de la URL
  const navigate = useNavigate();
  const isEditing = Boolean(registroId);

  const [registroToEdit, setRegistroToEdit] = useState(null);
  const [loading, setLoading] = useState(isEditing); // Si estamos editando, empezamos cargando

  useEffect(() => {
    if (isEditing) {
      const fetchRegistro = async () => {
        const { data, error } = await supabase
          .from("registros")
          .select("*")
          .eq("id", registroId)
          .single(); // .single() trae un solo objeto en lugar de un array

        if (error) {
          console.error("Error fetching registro:", error);
        } else {
          setRegistroToEdit(data);
        }
        setLoading(false);
      };
      fetchRegistro();
    }
  }, [registroId, isEditing]);

  const handleSuccess = () => {
    alert(`Hoja de vida ${isEditing ? "actualizada" : "creada"} con éxito!`);
    navigate("/hojas-de-vida"); // Regresamos a la lista
  };

  if (loading) return <p className="p-4">Cargando datos del registro...</p>;

  return (
    <div className="p-6 sm:p-8 bg-white rounded-xl shadow-lg max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6 border-b pb-3">
        {isEditing ? "Editar Hoja de Vida" : "Nuevo Registro de Usuario"}
      </h1>
      <RegistroForm registroToEdit={registroToEdit} onSuccess={handleSuccess} />
    </div>
  );
}

export default RegistroPage;
