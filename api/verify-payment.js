import { createHmac } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const json = (response, status, body) => response.status(status).json(body)
const razorpayConfig = env => String(env.RAZOR_PAYENV || 'DEV').trim().toUpperCase() === 'PROD'
  ? { keyId: env.RAZORPAY_KEY_ID, secret: env.RAZOR_PAY_SECRET_KEY }
  : { keyId: env.RAZORPAY_KEY_ID_TEST, secret: env.RAZOR_PAY_SECRET_KEY_TEST }

export default async function handler(request, response) {
  if (request.method !== 'POST') return json(response, 405, { error: 'Method not allowed' })
  const projectUrl = process.env.SUPABASE_PROJECT_URL || process.env.VITE_SUPABASE_PROJECT_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const { transactionId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = request.body || {}
  if (!projectUrl || !serviceRoleKey) return json(response, 500, { error: 'Payment verification is temporarily unavailable' })
  if (![transactionId, razorpayOrderId, razorpayPaymentId, razorpaySignature].every(value => typeof value === 'string' && value.length > 0)) return json(response, 400, { error: 'Incomplete payment response' })
  const config = razorpayConfig(process.env)
  if (!config.secret) return json(response, 500, { error: 'Payment verification is temporarily unavailable' })
  const expected = createHmac('sha256', config.secret).update(`${razorpayOrderId}|${razorpayPaymentId}`).digest('hex')
  if (expected !== razorpaySignature) return json(response, 400, { error: 'Payment signature could not be verified' })
  const admin = createClient(projectUrl, serviceRoleKey, { auth: { persistSession: false } })
  const { data: transaction, error } = await admin.from('payment_transactions').select('id,student_id,package_id,academic_year_id,amount_paise,currency,status,razorpay_order_id').eq('id', transactionId).eq('razorpay_order_id', razorpayOrderId).single()
  if (error || !transaction) return json(response, 404, { error: 'Payment order not found' })
  if (transaction.status === 'paid') return json(response, 200, { ok: true })
  const { error: updateError } = await admin.from('payment_transactions').update({ status: 'paid', razorpay_payment_id: razorpayPaymentId, provider_metadata: { verified: true, environment: String(process.env.RAZOR_PAYENV || 'DEV').toUpperCase() } }).eq('id', transaction.id).eq('status', 'pending')
  if (updateError) return json(response, 400, { error: 'Payment could not be recorded' })
  const { data: packageData } = await admin.from('packages').select('fixed_expires_on').eq('id', transaction.package_id).single()
  if (!packageData?.fixed_expires_on) return json(response, 400, { error: 'Package expiry is not configured' })
  const { data: freePackage } = await admin.from('packages').select('id').eq('academic_year_id', transaction.academic_year_id).eq('code', 'FREE').maybeSingle()
  if (freePackage) {
    const now = Date.now()
    await admin.from('student_entitlements').insert({ student_id: transaction.student_id, package_id: freePackage.id, academic_year_id: transaction.academic_year_id, source: 'trial', starts_at: new Date(now - 1000).toISOString(), ends_at: new Date(now).toISOString(), status: 'expired' })
  }
  const { error: entitlementError } = await admin.from('student_entitlements').insert({ student_id: transaction.student_id, package_id: transaction.package_id, academic_year_id: transaction.academic_year_id, source: 'razorpay_purchase', starts_at: new Date().toISOString(), ends_at: `${packageData.fixed_expires_on}T23:59:59.999Z`, status: 'active', source_payment_id: transaction.id })
  if (entitlementError && !String(entitlementError.message).toLowerCase().includes('duplicate')) return json(response, 400, { error: 'Paid package could not be activated' })
  return json(response, 200, { ok: true })
}
