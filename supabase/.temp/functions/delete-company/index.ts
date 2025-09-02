// En supabase/functions/delete-company/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Función para crear un cliente de Supabase con privilegios de administrador
const createAdminClient = () => {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Cliente para verificar la autenticación del usuario
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user } } = await userClient.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Usuario no autenticado' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const { company_id } = await req.json()
    if (!company_id) {
      return new Response(JSON.stringify({ error: 'Falta el ID de la empresa' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }
    
    // Usamos el cliente de usuario para verificar la propiedad
    const { data: company, error: ownerError } = await userClient
      .from('companies')
      .select('owner_id')
      .eq('id', company_id)
      .single()

    if (ownerError || !company) {
      return new Response(JSON.stringify({ error: 'Empresa no encontrada.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      })
    }

    if (company.owner_id !== user.id) {
      return new Response(JSON.stringify({ error: 'No tienes permiso para eliminar esta empresa.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }
    
    // **CAMBIO CLAVE**: Una vez verificado el propietario, usamos el cliente de administrador para borrar
    const supabaseAdmin = createAdminClient();

    // Eliminar todos los datos relacionados
    await supabaseAdmin.from('equipos').delete().eq('company_id', company_id)
    await supabaseAdmin.from('software').delete().eq('company_id', company_id)
    await supabaseAdmin.from('perifericos').delete().eq('company_id', company_id)
    await supabaseAdmin.from('registros').delete().eq('company_id', company_id)
    await supabaseAdmin.from('proveedores').delete().eq('company_id', company_id)
    await supabaseAdmin.from('company_users').delete().eq('company_id', company_id)

    // Finalmente, eliminar la empresa
    const { error: deleteError } = await supabaseAdmin
      .from('companies')
      .delete()
      .eq('id', company_id)

    if (deleteError) throw deleteError

    return new Response(JSON.stringify({ message: 'Empresa eliminada correctamente.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})