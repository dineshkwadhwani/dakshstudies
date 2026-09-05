import { createClient } from '@supabase/supabase-js'

const json = (response, status, body) => response.status(status).json(body)

export async function handleClientAuditEvent(request, response, env = process.env) {
  if (request.method !== 'POST') return json(response, 405, { error: 'Method not allowed' })

  const projectUrl = env.SUPABASE_PROJECT_URL || env.VITE_SUPABASE_PROJECT_URL
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY
  if (!projectUrl || !serviceRoleKey) return json(response, 500, { error: 'Server configuration is incomplete' })

  // Only explicitly supported, sanitized operational events may enter anonymously.
  if (request.body?.eventType !== 'registration.failed') return json(response, 400, { error: 'Unsupported event type' })
  const errorCode = String(request.body?.errorCode || 'unknown').replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 80) || 'unknown'
  const status = Number.isInteger(request.body?.status) ? request.body.status : null
  const message = String(request.body?.message || 'Registration failed').replace(/[\r\n]/g, ' ').slice(0, 240)
  const admin = createClient(projectUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const forwardedFor = request.headers['x-forwarded-for']
  const ipAddress = String(Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor || '').split(',')[0].trim() || null
  const userAgent = String(request.headers['user-agent'] || '').slice(0, 500) || null
  const { error } = await admin.from('audit_events').insert({
    event_type: 'registration.failed',
    outcome: 'failure',
    entity_type: 'authentication',
    metadata: { error_code: errorCode, status, message, source: 'client-reported' },
    ip_address: ipAddress,
    user_agent: userAgent,
  })
  if (error) return json(response, 500, { error: 'Unable to record event' })
  return json(response, 202, { ok: true })
}

export default function handler(request, response) {
  return handleClientAuditEvent(request, response)
}

