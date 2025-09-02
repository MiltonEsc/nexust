import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
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

    // Crea un cliente administrador para saltar las políticas RLS y poder eliminar
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Elimina la invitación de la tabla company_users
    const { error: deleteError } = await supabaseAdmin
      .from('company_users')
      .delete()
      .eq('user_id', user.id)
      .eq('company_id', company_id)

    if (deleteError) throw deleteError

    return new Response(JSON.stringify({ message: '¡Invitación rechazada con éxito!' }), {
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