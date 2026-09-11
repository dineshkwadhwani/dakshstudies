import { createClient } from '@supabase/supabase-js'

const json = (response, status, body) => response.status(status).json(body)

export async function handleUserAuthEmail(request, response, env = process.env) {
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
  if (actorError || !['super_admin', 'account_manager'].includes(actor?.role) || actor?.status !== 'active') return json(response, 403, { error: 'Administrator access required' })

  const userId = String(request.body?.userId || '')
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) return json(response, 400, { error: 'A valid user is required' })

  if (actor.role === 'account_manager') {
    const { data: assignment, error: assignmentError } = await admin.from('student_manager_assignments').select('student_id').eq('student_id', userId).eq('account_manager_id', authData.user.id).is('ends_at', null).maybeSingle()
    if (assignmentError || !assignment) return json(response, 403, { error: 'You may only contact students assigned to you' })
  }

  const { data: targetData, error: targetError } = await admin.auth.admin.getUserById(userId)
  const target = targetData?.user
  if (targetError || !target?.email) return json(response, 404, { error: 'Auth user or email not found' })

  const productionUrl = (env.PUBLIC_SITE_URL || env.SITE_URL || 'https://tenthkipadhai.online').replace(/\/$/, '')
  const isUnconfirmed = !target.email_confirmed_at
  const { error: sendError } = isUnconfirmed
    ? await authClient.auth.resend({ type: 'signup', email: target.email, options: { emailRedirectTo: `${productionUrl}/login` } })
    : await authClient.auth.resetPasswordForEmail(target.email, { redirectTo: `${productionUrl}/update-password` })
  if (sendError) return json(response, 400, { error: sendError.message })

  await admin.from('audit_events').insert({
    event_type: isUnconfirmed ? 'user.verification_email_resent' : 'user.password_reset_email_sent',
    actor_user_id: authData.user.id,
    actor_role: actor.role,
    affected_user_id: userId,
    entity_type: 'profile',
    entity_id: userId,
    metadata: { source: 'user-management' },
  })

  return json(response, 200, { message: isUnconfirmed ? 'Verification email sent.' : 'Password reset email sent.' })
}

export default function handler(request, response) {
  return handleUserAuthEmail(request, response)
}
