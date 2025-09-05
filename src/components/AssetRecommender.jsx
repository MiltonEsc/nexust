// src/components/AssetRecommender.jsx

import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import {
  SparklesIcon,
  CheckIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

function AssetRecommender({ registroId }) {
  const [recommendations, setRecommendations] = useState([]);
  const [profile, setProfile] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  const handleGetRecommendation = async () => {
    setLoading(true);
    setError("");
    setSearched(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "recommend-asset",
        {
          body: { registroId },
        }
      );

      if (error) throw error;

      setRecommendations(data.recommendations || []);
      setProfile(data.profile || "");
    } catch (err) {
      setError(
        "No se pudo obtener una respuesta de la IA. Inténtalo de nuevo."
      );
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-gray-50 rounded-lg border">
      <div className="flex flex-col items-center text-center">
        <SparklesIcon className="w-10 h-10 text-blue-500 mb-2" />
        <h4 className="font-semibold text-lg">
          Asistente de IA para Recomendaciones
        </h4>
        <p className="text-sm text-gray-500 mb-4">
          La IA generará recomendaciones de equipos del mercado actual para este
          perfil.
        </p>
        <button
          onClick={handleGetRecommendation}
          disabled={loading}
          className="btn-primary inline-flex items-center gap-2"
        >
          {loading ? "Pensando..." : "Generar Recomendación"}
        </button>
      </div>

      {loading && (
        <p className="text-center mt-4 animate-pulse">
          Consultando al experto de IA...
        </p>
      )}
      {error && <p className="text-center mt-4 text-red-600">{error}</p>}

      {searched && !loading && (
        <div className="mt-6">
          <h5 className="font-semibold mb-3">
            Recomendaciones para el perfil:{" "}
            <span className="capitalize font-bold">{profile}</span>
          </h5>
          {recommendations.length > 0 ? (
            <div className="space-y-4">
              {recommendations.map((item, index) => (
                <div
                  key={index}
                  className="p-4 bg-white rounded-md border-2 border-blue-100 shadow-sm"
                >
                  <h6 className="font-bold text-lg text-blue-800">
                    {item.model}
                  </h6>
                  <p className="text-sm text-gray-700 mt-2 italic">
                    "{item.justification}"
                  </p>

                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="font-semibold mb-1">Pros:</p>
                      <ul className="space-y-1">
                        {item.pros.map((pro, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <CheckIcon className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>{pro}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="font-semibold mb-1">Contras:</p>
                      <ul className="space-y-1">
                        {item.cons.map((con, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <XMarkIcon className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                            <span>{con}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 p-4 bg-white rounded-md">
              La IA no pudo generar recomendaciones. Esto puede ser un error
              temporal.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default AssetRecommender;
