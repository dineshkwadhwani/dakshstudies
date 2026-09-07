import { createHmac } from 'node:crypto'

export function requestBodyTooLarge(body, maximumBytes) {
  try { return Buffer.byteLength(JSON.stringify(body || {}), 'utf8') > maximumBytes }
  catch { return true }
}

export function getClientIp(request) {
  const forwarded = request.headers['x-vercel-forwarded-for'] || request.headers['x-forwarded-for']
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded
  return String(value || request.socket?.remoteAddress || '').split(',')[0].trim() || 'unknown'
}

export function hashRateLimitKey(value, secret) {
  return createHmac('sha256', secret).update(String(value)).digest('hex')
}

export async function consumeRateLimit(admin, { action, identifier, maximum, windowSeconds, secret }) {
  const { data, error } = await admin.rpc('consume_api_rate_limit', {
    action_input: action,
    key_hash_input: hashRateLimitKey(identifier, secret),
    maximum_input: maximum,
    window_seconds_input: windowSeconds,
  })
  if (error) throw new Error('Rate limiting is temporarily unavailable')
  return Boolean(data)
}

export async function verifyTurnstile({ token, secret, ipAddress }) {
  if (!token || !secret) return false
  const body = new URLSearchParams({ secret, response: token })
  if (ipAddress && ipAddress !== 'unknown') body.set('remoteip', ipAddress)
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!response.ok) return false
  const result = await response.json().catch(() => ({}))
  return result.success === true
}
