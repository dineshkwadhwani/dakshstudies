import { createClient } from '@supabase/supabase-js'

const json = (response, status, body) => {
  response.setHeader?.('Cache-Control', 'no-store')
  return response.status(status).json(body)
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function handleLearningResourceUrl(request, response, env = process.env) {
  if (request.method !== 'POST') return json(response, 405, { error: 'Method not allowed' })

  const projectUrl = env.SUPABASE_PROJECT_URL || env.VITE_SUPABASE_PROJECT_URL
  const anonKey = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY
  if (!projectUrl || !anonKey || !serviceRoleKey) return json(response, 500, { error: 'Server configuration is incomplete' })

  const token = request.headers.authorization?.replace(/^Bearer\s+/i, '')
  if (!token) return json(response, 401, { error: 'Authentication required' })

  const resourceVersionId = String(request.body?.resourceVersionId || '')
  const assessmentResourceId = request.body?.assessmentResourceId ? String(request.body.assessmentResourceId) : null
  if (!UUID.test(resourceVersionId) || (assessmentResourceId && !UUID.test(assessmentResourceId))) {
    return json(response, 400, { error: 'A valid resource is required' })
  }

  const userClient = createClient(projectUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const admin = createClient(projectUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: authData, error: authError } = await userClient.auth.getUser()
  if (authError || !authData.user) return json(response, 401, { error: 'Invalid session' })

  const { data: authorization, error: authorizationError } = await userClient.rpc('authorize_learning_resource', {
    resource_version_id_input: resourceVersionId,
    assessment_resource_id_input: assessmentResourceId,
  })
  if (authorizationError || !authorization?.storage_path) {
    return json(response, 403, { error: 'You do not have access to this document' })
  }

  const { data: signed, error: signError } = await admin.storage
    .from('learning-content')
    .createSignedUrl(authorization.storage_path, 300)
  if (signError || !signed?.signedUrl) return json(response, 502, { error: 'The document could not be prepared' })

  return json(response, 200, { url: signed.signedUrl, expiresIn: 300 })
}

export default function handler(request, response) {
  return handleLearningResourceUrl(request, response)
}
