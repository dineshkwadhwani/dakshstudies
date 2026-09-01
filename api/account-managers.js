import { createClient } from '@supabase/supabase-js'

const json = (response, status, body) => response.status(status).json(body)

export async function handleAccountManagers(request, response, env = process.env) {
  if (request.method !== 'POST') return json(response, 405, { error: 'Method not allowed' })

  const projectUrl = env.SUPABASE_PROJECT_URL || env.VITE_SUPABASE_PROJECT_URL
  const anonKey = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY
  if (!projectUrl || !anonKey || !serviceRoleKey) return json(response, 500, { error: 'Server configuration is incomplete' })

  const token = request.headers.authorization?.replace(/^Bearer\s+/i, '')
  if (!token) return json(response, 401, { error: 'Authentication required' })

  const authClient = createClient(projectUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const admin = createClient(projectUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: authData, error: authError } = await authClient.auth.getUser(token)
  if (authError || !authData.user) return json(response, 401, { error: 'Invalid session' })

  const { data: actor, error: actorError } = await admin.from('profiles').select('role,status').eq('id', authData.user.id).single()
  if (actorError || actor?.role !== 'super_admin' || actor?.status !== 'active') return json(response, 403, { error: 'SuperAdmin access required' })

  const email = String(request.body?.email || '').trim().toLowerCase()
  const fullName = String(request.body?.fullName || '').trim()
  const password = String(request.body?.password || '')
  if (!/^\S+@\S+\.\S+$/.test(email) || fullName.length < 2) return json(response, 400, { error: 'A valid name and email are required' })
  if (password.length < 12 || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    return json(response, 400, { error: 'Temporary password must be 12+ characters with a capital, number, and special character' })
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { full_name: fullName, created_by: authData.user.id },
  })
  if (createError) return json(response, createError.message?.toLowerCase().includes('already') ? 409 : 400, { error: createError.message })

  const managerId = created.user.id
  const { error: profileError } = await admin.from('profiles').update({ role: 'account_manager', status: 'active', full_name: fullName, onboarding_step: 'complete' }).eq('id', managerId)
  if (profileError) {
    await admin.auth.admin.deleteUser(managerId)
    return json(response, 500, { error: 'Account creation could not be completed' })
  }

  await admin.from('audit_events').insert({
    event_type: 'account_manager.created', actor_user_id: authData.user.id, actor_role: 'super_admin',
    affected_user_id: managerId, entity_type: 'profile', entity_id: managerId,
    metadata: { source: 'superadmin-user-management' },
  })
  return json(response, 201, { user: { id: managerId, email, fullName, role: 'account_manager', status: 'active' } })
}

export default function handler(request, response) {
  return handleAccountManagers(request, response)
}
