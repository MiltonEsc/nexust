// supabase/functions/invite-user/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { company_id, email } = await req.json()

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    let invitedUserId: string

    // 1. Buscar usuario por email usando listUsers()
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    if (listError) throw listError

    const existingUser = users.users.find((u) => u.email === email)

    if (existingUser) {
      console.log(`Usuario ${email} encontrado. Usando su ID existente.`)
      invitedUserId = existingUser.id
    } else {
      console.log(`Usuario ${email} no encontrado. Invitando...`)
      const { data: inviteData, error: inviteError } =
        await supabaseAdmin.auth.admin.inviteUserByEmail(email)
      if (inviteError) throw inviteError
      invitedUserId = inviteData.user.id
    }

    if (!invitedUserId) {
      throw new Error('No se pudo obtener el ID del usuario invitado.')
    }

    // 2. Insertar invitación en company_users
    const { error: insertError } = await supabaseAdmin
      .from('company_users')
      .insert({
        company_id: company_id,
        user_id: invitedUserId,
        role: 'member',
        status: 'pending',
      })

    if (insertError) {
      if (insertError.code === '22P02' || insertError.code === '23505') {
        throw new Error('Este usuario ya ha sido invitado o ya es miembro de esta empresa.')
      }
      throw insertError
    }

    return new Response(JSON.stringify({ message: 'Invitación enviada con éxito.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Error final en la función invite-user:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
