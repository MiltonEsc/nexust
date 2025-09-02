import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { company_id, email: invitee_email } = await req.json()
    const authHeader = req.headers.get('Authorization')!

    // Create a client with the user's auth token to respect RLS
    const supabaseUser = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } }
    )

    // Verify the inviting user is the owner of the company
    const { data: { user } } = await supabaseUser.auth.getUser()
    const { data: company, error: ownerError } = await supabaseUser
      .from('companies')
      .select('owner_id')
      .eq('id', company_id)
      .eq('owner_id', user.id)
      .single()

    if (ownerError || !company) {
      throw new Error('Company not found or you are not the owner.')
    }

    // Create an admin client to bypass RLS for user lookup
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // CORRECTED: Use listUsers to find the user by email
    const { data: { users }, error: userError } = await supabaseAdmin.auth.admin.listUsers({
      email: invitee_email,
      page: 1,
      perPage: 1,
    });

    if (userError) throw userError;
    if (!users || users.length === 0) {
      throw new Error('User with that email does not exist.');
    }
    const invitee = users[0];

    // Insert the new user into the company_users table with a 'pending' status
    const { error: insertError } = await supabaseAdmin
      .from('company_users')
      .insert({
        company_id: company_id,
        user_id: invitee.id, // Use the user ID from the lookup
        role: 'member',
        status: 'pending', // Set initial status
      })

    if (insertError) {
      if (insertError.code === '23505') { // unique constraint violation
         throw new Error('User is already a member of this company.')
      }
      throw insertError
    }

    return new Response(JSON.stringify({ message: 'Invitation sent successfully!' }), {
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
