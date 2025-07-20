import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    // Criar cliente com service_role para contornar RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    if (req.method === 'POST') {
      const { email, password } = await req.json()

      // Criar usuário diretamente com service_role (contorna CAPTCHA)
      const { data: user, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          display_name: 'Administrador'
        }
      })

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      // Criar perfil
      await supabaseAdmin
        .from('profiles')
        .insert({
          user_id: user.user.id,
          display_name: 'Administrador'
        })

      // Atribuir role de admin
      await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: user.user.id,
          role: 'admin'
        })

      return new Response(JSON.stringify({ success: true, user }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    return new Response('Method not allowed', { status: 405 })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})