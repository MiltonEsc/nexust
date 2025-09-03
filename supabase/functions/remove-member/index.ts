// supabase/functions/remove-member/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { company_id, member_user_id } = await req.json();
    const authHeader = req.headers.get('Authorization')!;

    // 1. Cliente con el token del usuario para verificar que es el dueño
    const supabaseUser = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) throw new Error("Usuario no autenticado.");

    // 2. Verificamos que el usuario que llama es el dueño de la empresa
    const { data: company, error: ownerError } = await supabaseUser
      .from('companies')
      .select('owner_id')
      .eq('id', company_id)
      .single();

    if (ownerError || !company || company.owner_id !== user.id) {
      throw new Error('No tienes permiso para eliminar miembros de esta empresa.');
    }

    // 3. Verificamos que el dueño no intente eliminarse a sí mismo
    if (user.id === member_user_id) {
        throw new Error('El propietario no puede eliminarse a sí mismo de la empresa.');
    }

    // 4. Cliente Admin para realizar la eliminación
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // 5. Eliminamos al miembro de la tabla company_users
    const { error: deleteError } = await supabaseAdmin
      .from('company_users')
      .delete()
      .eq('company_id', company_id)
      .eq('user_id', member_user_id);

    if (deleteError) throw deleteError;

    return new Response(JSON.stringify({ message: 'Miembro eliminado con éxito.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});