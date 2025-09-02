import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // Manejo de la solicitud pre-vuelo CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { company_id } = await req.json()
    const authHeader = req.headers.get('Authorization')!

    // Crea un cliente con el token de autenticación del usuario para obtener su ID
    const supabaseUser = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user } } = await supabaseUser.auth.getUser()

    if (!user) throw new Error("Usuario no encontrado.");

    // Crea un cliente administrador para saltar las políticas RLS y poder actualizar
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Actualiza la tabla company_users para cambiar el estado a 'accepted'
    const { error: updateError } = await supabaseAdmin
      .from('company_users')
      .update({ status: 'accepted' })
      .eq('user_id', user.id)
      .eq('company_id', company_id)
      .eq('status', 'pending') // Un chequeo extra para solo actualizar invitaciones pendientes

    if (updateError) throw updateError

    return new Response(JSON.stringify({ message: '¡Invitación aceptada con éxito!' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})