import { createClient } from '@supabase/supabase-js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const json = (response, status, body) => response.status(status).json(body)

export default async function handler(request, response) {
  if (request.method !== 'POST') return json(response, 405, { error: 'Method not allowed' })
  const projectUrl = process.env.SUPABASE_PROJECT_URL || process.env.VITE_SUPABASE_PROJECT_URL
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, '')
  if (!projectUrl || !anonKey || !serviceRoleKey) return json(response, 500, { error: 'Server configuration is incomplete' })
  if (!token) return json(response, 401, { error: 'Authentication required' })
  const auth = createClient(projectUrl, anonKey, { auth: { persistSession: false } })
  const admin = createClient(projectUrl, serviceRoleKey, { auth: { persistSession: false } })
  const { data: authData, error: authError } = await auth.auth.getUser(token)
  if (authError || !authData.user) return json(response, 401, { error: 'Invalid session' })
  const { data: actor, error: actorError } = await admin.from('profiles').select('role,status').eq('id', authData.user.id).single()
  if (actorError || actor?.role !== 'super_admin' || actor.status !== 'active') return json(response, 403, { error: 'SuperAdmin access required' })
  const studentId = String(request.body?.studentId || '')
  const managerId = request.body?.managerId ? String(request.body.managerId) : null
  if (!UUID.test(studentId) || (managerId && !UUID.test(managerId))) return json(response, 400, { error: 'Valid student and manager are required' })
  const { data: student } = await admin.from('profiles').select('id,role').eq('id', studentId).single()
  if (!student || student.role !== 'student') return json(response, 400, { error: 'Target must be a student' })
  if (managerId) {
    const { data: manager } = await admin.from('profiles').select('id,role,status').eq('id', managerId).single()
    if (!manager || manager.role !== 'account_manager' || manager.status !== 'active') return json(response, 400, { error: 'Select an active Account Manager' })
  }
  const { error: closeError } = await admin.from('student_manager_assignments').update({ ends_at: new Date().toISOString() }).eq('student_id', studentId).is('ends_at', null)
  if (closeError) return json(response, 400, { error: closeError.message })
  if (managerId) {
    const { error: insertError } = await admin.from('student_manager_assignments').insert({ student_id: studentId, account_manager_id: managerId, assigned_by: authData.user.id })
    if (insertError) return json(response, 400, { error: insertError.message })
  }
  return json(response, 200, { message: managerId ? 'Account Manager assigned.' : 'Account Manager assignment removed.' })
}
