import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // Manejo de la solicitud pre-vuelo (CORS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { company_id, email } = await req.json()
    const authHeader = req.headers.get('Authorization')!

    if (!company_id || !email) {
      throw new Error("Se requiere el ID de la empresa y el email del invitado.");
    }
    if (!authHeader) {
      throw new Error("No se proporcionó token de autorización.");
    }

    // 1. Cliente con el token del usuario para verificar permisos
    const supabaseUser = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) throw new Error("Usuario no autenticado o token inválido.");

    // 2. Verificamos que el usuario que invita es el dueño de la empresa
    const { error: ownerError } = await supabaseUser
      .from('companies')
      .select('id')
      .eq('id', company_id)
      .eq('owner_id', user.id)
      .single();

    if (ownerError) {
      throw new Error('No eres el propietario de esta empresa o la empresa no existe.');
    }

    // 3. Cliente Admin para realizar operaciones con privilegios
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // 4. Buscamos si el usuario a invitar existe en la app usando la función RPC
    const { data: existingUser, error: rpcError } = await supabaseAdmin
        .rpc('get_user_id_by_email', { user_email: email });

    if (rpcError || !existingUser || !existingUser.id) {
        throw new Error('Usuario no registrado en la app.');
    }
    
    const invitedUserId = existingUser.id;
    
    // 5. Si existe, intentamos insertarlo en la tabla de la compañía
    const { error: insertError } = await supabaseAdmin
      .from('company_users')
      .insert({
        company_id: company_id,
        user_id: invitedUserId,
        role: 'member',
        status: 'pending',
      });

    // 6. Si la inserción falla por duplicado, lanzamos el error específico
     if (insertError) {
        if (insertError.code === '23505') { // unique constraint violation
            // ANTES: throw new Error(...)
            // AHORA: Retornamos una respuesta controlada con status 409
            return new Response(JSON.stringify({ 
                message: 'Este usuario ya ha sido invitado o ya es miembro de esta empresa.',
                code: 'USER_ALREADY_MEMBER' // Un código útil para el frontend
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 409, // 409 Conflict
            });
        }
        // Para cualquier otro error de inserción, sí lanzamos un error
        throw insertError;
    }
    
    // 7. Si todo sale bien, devolvemos el mensaje de éxito
    return new Response(JSON.stringify({ message: 'Invitación enviada con éxito.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error en la función invite-user:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});