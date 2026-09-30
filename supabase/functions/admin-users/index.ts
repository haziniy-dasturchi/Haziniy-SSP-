import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Avtorizatsiya talab qilinadi' }), {
        status: 401, headers: jsonHeaders,
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Authenticate caller
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Avtorizatsiya xatosi' }), {
        status: 401, headers: jsonHeaders,
      })
    }

    const body = await req.json()
    const { action } = body

    // Helper: check caller permissions
    const checkPerm = async (module: string, act: string): Promise<boolean> => {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('is_owner, role_id, is_active')
        .eq('id', user.id)
        .single()

      if (!profile?.is_active) return false
      if (profile?.is_owner) return true
      if (!profile?.role_id) return false

      const permColumn = `can_${act}` // can_view, can_create, can_edit, can_delete
      const { data: perm } = await supabaseAdmin
        .from('role_permissions')
        .select(permColumn)
        .eq('role_id', profile.role_id)
        .eq('module', module)
        .maybeSingle()

      return perm ? perm[permColumn] === true : false
    }

    // Determine required permission
    let hasPermission = false
    if (action === 'create') {
      hasPermission = await checkPerm('users', 'create')
    } else if (['update', 'reset_password', 'set_active'].includes(action)) {
      hasPermission = await checkPerm('users', 'edit')
    } else if (action === 'delete') {
      hasPermission = await checkPerm('users', 'delete')
    } else {
      return new Response(JSON.stringify({ error: "Noma'lum amal" }), {
        status: 400, headers: jsonHeaders,
      })
    }

    if (!hasPermission) {
      return new Response(JSON.stringify({ error: "Sizda bu amalni bajarish huquqi yo'q" }), {
        status: 403, headers: jsonHeaders,
      })
    }

    // =========================================================================
    // CREATE
    // =========================================================================
    if (action === 'create') {
      const { full_name, phone, password, role_id, branch_id, is_active } = body

      // Validation
      if (!full_name?.trim()) {
        return new Response(JSON.stringify({ error: 'Ism kiritish majburiy' }), {
          status: 400, headers: jsonHeaders,
        })
      }
      if (!phone || !/^998\d{9}$/.test(phone)) {
        return new Response(JSON.stringify({
          error: "Telefon raqam 998 bilan boshlanib, 12 ta raqamdan iborat bo'lishi kerak",
        }), { status: 400, headers: jsonHeaders })
      }
      if (!password || password.length < 8) {
        return new Response(JSON.stringify({
          error: "Parol kamida 8 ta belgidan iborat bo'lishi kerak",
        }), { status: 400, headers: jsonHeaders })
      }

      // Check phone uniqueness
      const { data: existingUser } = await supabaseAdmin
        .from('profiles').select('id').eq('phone', phone).maybeSingle()
      if (existingUser) {
        return new Response(JSON.stringify({ error: 'Bu telefon raqam allaqachon mavjud' }), {
          status: 400, headers: jsonHeaders,
        })
      }

      // Check role exists
      if (!role_id) {
        return new Response(JSON.stringify({ error: 'Rol kiritish majburiy' }), {
          status: 400, headers: jsonHeaders,
        })
      }
      const { data: roleExists } = await supabaseAdmin
        .from('roles').select('id').eq('id', role_id).maybeSingle()
      if (!roleExists) {
        return new Response(JSON.stringify({ error: 'Rol topilmadi' }), {
          status: 400, headers: jsonHeaders,
        })
      }

      // Check branch if provided
      if (branch_id) {
        const { data: branchExists } = await supabaseAdmin
          .from('branches').select('id').eq('id', branch_id).maybeSingle()
        if (!branchExists) {
          return new Response(JSON.stringify({ error: 'Filial topilmadi' }), {
            status: 400, headers: jsonHeaders,
          })
        }
      }

      // Create auth user with synthetic email
      const email = `${phone}@users.haziniyssp.app`
      const { data: newAuthUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        phone,
        phone_confirm: true,
      })
      if (createError) throw createError

      // Create profile
      const { data: newProfile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: newAuthUser.user.id,
          full_name: full_name.trim(),
          phone,
          role_id,
          branch_id: branch_id || null,
          is_active: is_active !== undefined ? is_active : true,
          is_owner: false,
        })
        .select()
        .single()

      if (profileError) {
        // Rollback: delete the auth user
        await supabaseAdmin.auth.admin.deleteUser(newAuthUser.user.id)
        throw profileError
      }

      return new Response(JSON.stringify(newProfile), { status: 201, headers: jsonHeaders })
    }

    // =========================================================================
    // UPDATE
    // =========================================================================
    if (action === 'update') {
      const { user_id, full_name, role_id, branch_id } = body
      if (!user_id) {
        return new Response(JSON.stringify({ error: "Foydalanuvchi ID si kiritilishi majburiy" }), {
          status: 400, headers: jsonHeaders,
        })
      }

      const updates: Record<string, unknown> = {}
      if (full_name !== undefined) updates.full_name = full_name.trim()
      if (role_id !== undefined) updates.role_id = role_id
      if (branch_id !== undefined) updates.branch_id = branch_id

      const { data: updatedProfile, error: updateError } = await supabaseAdmin
        .from('profiles').update(updates).eq('id', user_id).select().single()
      if (updateError) throw updateError

      return new Response(JSON.stringify(updatedProfile), { status: 200, headers: jsonHeaders })
    }

    // =========================================================================
    // RESET PASSWORD
    // =========================================================================
    if (action === 'reset_password') {
      const { user_id, new_password } = body
      if (!user_id) {
        return new Response(JSON.stringify({ error: "Foydalanuvchi ID si kiritilishi majburiy" }), {
          status: 400, headers: jsonHeaders,
        })
      }
      if (!new_password || new_password.length < 8) {
        return new Response(JSON.stringify({
          error: "Parol kamida 8 ta belgidan iborat bo'lishi kerak",
        }), { status: 400, headers: jsonHeaders })
      }

      const { error: resetError } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
        password: new_password,
      })
      if (resetError) throw resetError

      return new Response(JSON.stringify({ success: true }), { status: 200, headers: jsonHeaders })
    }

    // =========================================================================
    // SET ACTIVE
    // =========================================================================
    if (action === 'set_active') {
      const { user_id, is_active } = body
      if (!user_id || is_active === undefined) {
        return new Response(JSON.stringify({ error: "Noto'g'ri ma'lumotlar" }), {
          status: 400, headers: jsonHeaders,
        })
      }

      // Ban or unban the auth user
      if (!is_active) {
        const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
          ban_duration: '87600h', // ~10 years
        })
        if (banError) throw banError
      } else {
        const { error: unbanError } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
          ban_duration: 'none',
        })
        if (unbanError) throw unbanError
      }

      const { error: profileError } = await supabaseAdmin
        .from('profiles').update({ is_active }).eq('id', user_id)
      if (profileError) throw profileError

      return new Response(JSON.stringify({ success: true }), { status: 200, headers: jsonHeaders })
    }

    // =========================================================================
    // DELETE
    // =========================================================================
    if (action === 'delete') {
      const { user_id } = body
      if (!user_id) {
        return new Response(JSON.stringify({ error: "Foydalanuvchi ID si kiritilishi majburiy" }), {
          status: 400, headers: jsonHeaders,
        })
      }

      // Deleting auth user cascades to profile via FK
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id)
      if (deleteError) throw deleteError

      return new Response(JSON.stringify({ success: true }), { status: 200, headers: jsonHeaders })
    }

    return new Response(JSON.stringify({ error: "Noma'lum amal" }), {
      status: 400, headers: jsonHeaders,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Xatolik yuz berdi'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
