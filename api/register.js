import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'
import { consumeRateLimit, getClientIp, requestBodyTooLarge } from '../server/request-security.js'

const json = (response, status, body, retryAfter) => {
  response.setHeader?.('Cache-Control', 'no-store')
  if (retryAfter) response.setHeader?.('Retry-After', String(retryAfter))
  return response.status(status).json(body)
}
const validName = value => /^[\p{L}][\p{L}\p{M} .'-]{1,79}$/u.test(value)
const validEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
const validPhone = value => /^\+91[6-9]\d{9}$/.test(value)
const validCity = value => /^[\p{L}\p{M}][\p{L}\p{M} .'-]{1,79}$/u.test(value)
const validReferral = value => /^[A-Z0-9]{3,20}$/.test(value)
const allowedPackages = new Set(['FREE', 'BASIC', 'PRO'])

function razorpayConfig(env) {
  const production = String(env.RAZOR_PAYENV || 'DEV').trim().toUpperCase() === 'PROD'
  return {
    keyId: production ? env.RAZORPAY_KEY_ID : env.RAZORPAY_KEY_ID_TEST,
    secret: production ? env.RAZOR_PAY_SECRET_KEY : env.RAZOR_PAY_SECRET_KEY_TEST,
  }
}

function publicRegistrationError(error) {
  const message = String(error?.message || '').toLowerCase()
  if (message.includes('already') || message.includes('registered')) return 'An account with this email already exists.'
  if (message.includes('rate') || error?.status === 429) return 'Too many registration attempts. Please try again later.'
  if (message.includes('captcha') || message.includes('security')) return 'The security check was not accepted. Please try again.'
  if (message.includes('email')) return 'Enter a valid email address.'
  return 'Your account could not be created. Please try again.'
}

export async function handleRegister(request, response, env = process.env) {
  if (request.method !== 'POST') return json(response, 405, { error: 'Method not allowed' })
  if (requestBodyTooLarge(request.body, 8192)) return json(response, 413, { error: 'Request is too large' })
  if (request.body?.website) return json(response, 202, { ok: true })

  const projectUrl = env.SUPABASE_PROJECT_URL || env.VITE_SUPABASE_PROJECT_URL
  const anonKey = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY
  const rateLimitSecret = env.RATE_LIMIT_SECRET
  if (!projectUrl || !anonKey || !serviceRoleKey || !rateLimitSecret) return json(response, 500, { error: 'Registration is temporarily unavailable' })

  const fullName = String(request.body?.fullName || '').trim().replace(/\s+/g, ' ')
  const email = String(request.body?.email || '').trim().toLowerCase()
  const phone = String(request.body?.phone || '').trim()
  const city = String(request.body?.city || '').trim().replace(/\s+/g, ' ')
  const password = String(request.body?.password || '')
  const packageCode = String(request.body?.packageCode || '').trim().toUpperCase()
  const referralCode = String(request.body?.referralCode || '').trim().toUpperCase()
  const captchaToken = String(request.body?.captchaToken || '')
  const ipAddress = getClientIp(request)
  const admin = createClient(projectUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })

  try {
    const ipAllowed = await consumeRateLimit(admin, { action: 'registration.ip', identifier: ipAddress, maximum: 8, windowSeconds: 900, secret: rateLimitSecret })
    if (!ipAllowed) return json(response, 429, { error: 'Too many registration attempts. Please try again in 15 minutes.' }, 900)
  } catch {
    return json(response, 503, { error: 'Registration is temporarily unavailable' })
  }

  if (!validName(fullName) || !validEmail(email) || !validPhone(phone) || !validCity(city) || password.length < 8 || !allowedPackages.has(packageCode) || (referralCode && !validReferral(referralCode))) {
    return json(response, 400, { error: 'Please check the registration details and try again.' })
  }
  const isDevelopmentEnvironment = String(env.RAZOR_PAYENV || 'DEV').trim().toUpperCase() !== 'PROD'
  if (!captchaToken && !isDevelopmentEnvironment) return json(response, 400, { error: 'Please complete the security check.' })

  try {
    const emailAllowed = await consumeRateLimit(admin, { action: 'registration.email', identifier: email, maximum: 4, windowSeconds: 1800, secret: rateLimitSecret })
    if (!emailAllowed) return json(response, 429, { error: 'Too many attempts for this email. Please try again later.' }, 1800)
  } catch {
    return json(response, 503, { error: 'Registration is temporarily unavailable' })
  }

  const authClient = createClient(projectUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
  if (referralCode) {
    const { data: referralIsValid, error: referralError } = await authClient.rpc('is_valid_referral_code', { code_input: referralCode })
    if (referralError) return json(response, 503, { error: 'Referral validation is temporarily unavailable.' })
    if (!referralIsValid) return json(response, 400, { error: 'This referral code is not valid.' })
  }

  const siteUrl = (env.PUBLIC_SITE_URL || env.SITE_URL || 'https://tenthkipadhai.online').replace(/\/$/, '')
  const { data: signUpData, error: signUpError } = await authClient.auth.signUp({
    email,
    password,
    options: {
      captchaToken,
      emailRedirectTo: `${siteUrl}/login`,
      data: { full_name: fullName, phone, city, selected_package: packageCode, referral_code: referralCode || null },
    },
  })

  if (signUpError) {
    await admin.from('audit_events').insert({
      event_type: 'registration.failed', outcome: 'failure', entity_type: 'authentication',
      metadata: {
        error_code: String(signUpError.code || 'unknown').slice(0, 80),
        status: signUpError.status || null,
        message: String(signUpError.message || 'Registration failed').replace(/[\r\n]/g, ' ').slice(0, 240),
        source: 'trusted-registration-endpoint',
      },
      ip_address: ipAddress === 'unknown' ? null : ipAddress,
      user_agent: String(request.headers['user-agent'] || '').slice(0, 500) || null,
    })
    return json(response, signUpError.status === 429 ? 429 : 400, { error: publicRegistrationError(signUpError) })
  }
  const studentId = signUpData?.user?.id
  let payment = null
  if (packageCode !== 'FREE' && studentId) {
    const { data: year } = await admin.from('academic_years').select('id').eq('is_current', true).maybeSingle()
    const { data: packages } = year ? await admin.from('packages').select('id,code,price_paise,currency,fixed_expires_on,status,sale_enabled').eq('academic_year_id', year.id).eq('code', packageCode).eq('status', 'published').eq('sale_enabled', true).maybeSingle() : { data: null }
    const config = razorpayConfig(env)
    if (year && packages && config.keyId && config.secret) {
      const idempotencyKey = randomUUID()
      const { data: transaction, error: transactionError } = await admin.from('payment_transactions').insert({ student_id: studentId, package_id: packages.id, academic_year_id: year.id, transaction_type: 'purchase', amount_paise: packages.price_paise, currency: packages.currency || 'INR', idempotency_key: idempotencyKey, provider_metadata: { environment: String(env.RAZOR_PAYENV || 'DEV').toUpperCase(), source: 'registration' } }).select('id').single()
      if (!transactionError && transaction) {
        const orderResponse = await fetch('https://api.razorpay.com/v1/orders', { method: 'POST', headers: { Authorization: `Basic ${Buffer.from(`${config.keyId}:${config.secret}`).toString('base64')}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: packages.price_paise, currency: packages.currency || 'INR', receipt: transaction.id, notes: { transaction_id: transaction.id, student_id: studentId, package_code: packageCode } }) })
        const order = await orderResponse.json().catch(() => ({}))
        if (orderResponse.ok && order.id) {
          await admin.from('payment_transactions').update({ razorpay_order_id: order.id }).eq('id', transaction.id)
          payment = { keyId: config.keyId, orderId: order.id, amount: packages.price_paise, currency: packages.currency || 'INR', transactionId: transaction.id }
        }
      }
    }
  }
  return json(response, 201, { ok: true, payment })
}

export default function handler(request, response) {
  return handleRegister(request, response)
}
