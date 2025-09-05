// supabase/functions/recommend-asset/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const PROFILES_CONTEXT = {
  'desarrollador': 'un desarrollador de software que necesita compilar código, usar múltiples aplicaciones a la vez y quizás virtualización. Prioriza RAM y un buen procesador (CPU).',
  'diseñador': 'un diseñador gráfico que trabaja con la suite de Adobe y necesita una excelente fidelidad de color y una potente tarjeta gráfica (GPU).',
  'ventas': 'un profesional de ventas que viaja constantemente. Prioriza la portabilidad, una batería de larga duración y un diseño ligero.',
  'marketing': 'un especialista en marketing que gestiona redes sociales y crea contenido visual ligero. Necesita un equipo versátil y ágil.',
  'gerente': 'un gerente o ejecutivo que valora un diseño premium, portabilidad y un rendimiento fluido para videoconferencias.',
  'ofimatica': 'un usuario de oficina estándar que utiliza navegadores web, Microsoft Office y correo. El presupuesto es importante.',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { registroId } = await req.json();
    if (!registroId) throw new Error("Se requiere el ID del registro.");

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: registroData, error: registroError } = await supabaseAdmin
      .from('registros')
      .select('cargo')
      .eq('id', registroId)
      .single();
    if (registroError) throw registroError;

    const cargo = registroData.cargo.toLowerCase();
    let userContext = PROFILES_CONTEXT['ofimatica'];
    for (const profile in PROFILES_CONTEXT) {
      if (cargo.includes(profile)) {
        userContext = PROFILES_CONTEXT[profile];
        break;
      }
    }

    const prompt = `
      Actúa como un experto consultor de tecnología. Recomienda 3 laptops específicas del mercado actual para: ${userContext}.
      Responde ÚNICAMENTE con un objeto JSON con la estructura:
      { "recommendations": [{ "model": "Marca y Modelo", "justification": "Justificación breve.", "pros": ["Ventaja 1"], "cons": ["Desventaja 1"] }] }
      No incluyas texto o markdown fuera del objeto JSON.
    `;

    const apiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

    const requestBody = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { response_mime_type: "application/json" },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(`Error de la API de Gemini: ${errorBody.error.message}`);
    }

    const responseData = await response.json();
    const recommendationText = responseData.candidates[0].content.parts[0].text;
    const recommendationJson = JSON.parse(recommendationText);

    return new Response(
      JSON.stringify({ ...recommendationJson, profile: cargo }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500
    });
  }
});