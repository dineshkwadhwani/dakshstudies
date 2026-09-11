import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const json = (response, status, body) => response.status(status).json(body)

export default async function handler(request, response) {
  if (request.method !== 'POST') return json(response, 405, { error: 'Method not allowed' })
  const projectUrl = process.env.SUPABASE_PROJECT_URL || process.env.VITE_SUPABASE_PROJECT_URL
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, '')
  if (!projectUrl || !anonKey || !serviceRoleKey || !token) return json(response, 401, { error: 'Authentication required' })
  const auth = createClient(projectUrl, anonKey, { auth: { persistSession: false } })
  const { data: authData, error: authError } = await auth.auth.getUser(token)
  if (authError || !authData.user) return json(response, 401, { error: 'Authentication required' })
  const code = String(request.body?.packageCode || '').trim().toUpperCase()
  if (!['BASIC', 'PRO'].includes(code)) return json(response, 400, { error: 'Choose a valid paid package.' })
  const admin = createClient(projectUrl, serviceRoleKey, { auth: { persistSession: false } })
  const { data: year } = await admin.from('academic_years').select('id').eq('is_current', true).maybeSingle()
  const { data: pkg } = year ? await admin.from('packages').select('id,code,price_paise,currency').eq('academic_year_id', year.id).eq('code', code).eq('status', 'published').eq('sale_enabled', true).maybeSingle() : { data: null }
  if (!year || !pkg?.price_paise) return json(response, 400, { error: 'The selected package is currently unavailable.' })
  const { data: transaction, error: transactionError } = await admin.from('payment_transactions').insert({ student_id: authData.user.id, package_id: pkg.id, academic_year_id: year.id, transaction_type: 'upgrade', amount_paise: pkg.price_paise, currency: pkg.currency || 'INR', idempotency_key: randomUUID(), provider_metadata: { source: 'student-upgrade' } }).select('id').single()
  const keyId = process.env.RAZORPAY_KEY_ID
  const secret = process.env.RAZOR_PAY_SECRET_KEY
  if (transactionError || !transaction || !keyId || !secret) return json(response, 503, { error: 'Payment setup is temporarily unavailable.' })
  const orderResponse = await fetch('https://api.razorpay.com/v1/orders', { method: 'POST', headers: { Authorization: `Basic ${Buffer.from(`${keyId}:${secret}`).toString('base64')}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: pkg.price_paise, currency: pkg.currency || 'INR', receipt: transaction.id, notes: { transaction_id: transaction.id, student_id: authData.user.id, package_code: code } }) })
  const order = await orderResponse.json().catch(() => ({}))
  if (!orderResponse.ok || !order.id) return json(response, 503, { error: 'Payment setup is temporarily unavailable.' })
  await admin.from('payment_transactions').update({ razorpay_order_id: order.id }).eq('id', transaction.id)
  return json(response, 200, { payment: { keyId, orderId: order.id, amount: pkg.price_paise, currency: pkg.currency || 'INR', transactionId: transaction.id } })
}
