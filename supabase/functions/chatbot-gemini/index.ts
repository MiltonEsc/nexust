import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { message, context = {} } = await req.json()
    
    if (!message) {
      throw new Error("Se requiere un mensaje.")
    }

    // Debug: Log del contexto recibido
    console.log('Contexto recibido en Gemini:', {
      equipos: context.equipos?.length || 0,
      software: context.software?.length || 0,
      perifericos: context.perifericos?.length || 0,
      consumibles: context.consumibles?.length || 0,
      equipos_sample: context.equipos?.slice(0, 2) || []
    });

    // Crear contexto del inventario para Gemini
    const inventoryContext = `
    Contexto del inventario de la empresa:
    - Equipos: ${context.equipos?.length || 0} registrados
    - Software: ${context.software?.length || 0} registrados  
    - Periféricos: ${context.perifericos?.length || 0} registrados
    - Consumibles: ${context.consumibles?.length || 0} registrados
    
    Detalles de equipos:
    ${context.equipos?.slice(0, 10).map(e => 
      `- ${e.marca} ${e.modelo} (${e.estado}) - S/N: ${e.numero_serie}`
    ).join('\n') || 'No hay equipos registrados'}
    
    Detalles de software:
    ${context.software?.slice(0, 10).map(s => 
      `- ${s.nombre} v${s.version} (${s.stock} licencias) - Tipo: ${s.tipo || 'N/A'} - Vence: ${s.fecha_vencimiento || 'N/A'}`
    ).join('\n') || 'No hay software registrado'}
    
    Detalles de periféricos:
    ${context.perifericos?.slice(0, 10).map(p => 
      `- ${p.tipo} ${p.marca} ${p.modelo} (${p.estado})`
    ).join('\n') || 'No hay periféricos registrados'}
    `

    const prompt = `
    Eres un asistente virtual experto en gestión de inventario TIC para la empresa Nexust. 
    Responde de manera útil, profesional y amigable en español.
    
    ${inventoryContext}
    
    Pregunta del usuario: "${message}"
    
    Instrucciones importantes:
    1. Responde en español de manera natural y conversacional
    2. SI HAY EQUIPOS REGISTRADOS: Usa la información del inventario para dar respuestas precisas
    3. SI NO HAY EQUIPOS REGISTRADOS: Explica cómo agregar equipos y guía al usuario paso a paso
    4. Si el usuario pregunta sobre equipos específicos, busca en los datos proporcionados
    5. Ofrece sugerencias prácticas y acciones concretas
    6. Si no tienes información suficiente, sugiere dónde encontrarla
    7. Mantén un tono profesional pero amigable
    8. Responde de manera concisa pero completa
    9. NUNCA digas que no hay equipos si los datos muestran que sí los hay
    
    Responde directamente sin formato especial, como si fueras un asistente humano.
    `

    const apiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY')
    if (!apiKey) {
      throw new Error("API key de Gemini no configurada")
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`

    const requestBody = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorBody = await response.json()
      throw new Error(`Error de Gemini: ${errorBody.error?.message || 'Error desconocido'}`)
    }

    const data = await response.json()
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || 
                         "Lo siento, no pude generar una respuesta en este momento."

    return new Response(
      JSON.stringify({ 
        success: true, 
        response: generatedText.trim(),
        context: {
          equipos_count: context.equipos?.length || 0,
          software_count: context.software?.length || 0,
          perifericos_count: context.perifericos?.length || 0,
          consumibles_count: context.consumibles?.length || 0
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error en chatbot-gemini:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        response: "Lo siento, hubo un error procesando tu consulta. Por favor, intenta de nuevo."
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
