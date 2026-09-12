import { createHmac } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const json = (response, status, body) => response.status(status).json(body)
const razorpayConfig = env => ({
  keyId: env.RAZORPAY_KEY_ID,
  secret: env.RAZOR_PAY_SECRET_KEY,
})

export default async function handler(request, response) {
  if (request.method !== 'POST') return json(response, 405, { error: 'Method not allowed' })
  const projectUrl = process.env.SUPABASE_PROJECT_URL || process.env.VITE_SUPABASE_PROJECT_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const payload = request.body || {}
  const { transactionId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = payload

  console.log('Razorpay browser verification received', {
    transactionId: transactionId || null,
    orderId: razorpayOrderId || null,
    paymentId: razorpayPaymentId || null,
    hasSignature: Boolean(razorpaySignature),
  })

  if (!projectUrl || !serviceRoleKey) return json(response, 500, { error: 'Payment verification is temporarily unavailable' })
  if (![transactionId, razorpayOrderId, razorpayPaymentId, razorpaySignature].every(value => typeof value === 'string' && value.length > 0)) {
    return json(response, 400, { error: 'Incomplete payment response' })
  }

  const config = razorpayConfig(process.env)
  if (!config.secret) return json(response, 500, { error: 'Payment verification is temporarily unavailable' })

  const expected = createHmac('sha256', config.secret).update(`${razorpayOrderId}|${razorpayPaymentId}`).digest('hex')
  const signatureMatches = expected === razorpaySignature
  console.log('Razorpay signature verification', {
    orderId: razorpayOrderId,
    paymentId: razorpayPaymentId,
    secretConfigured: Boolean(config.secret),
    expectedPrefix: expected.slice(0, 12),
    receivedPrefix: razorpaySignature.slice(0, 12),
    match: signatureMatches,
  })

  if (!signatureMatches) {
    console.error('Razorpay browser verification signature mismatch', {
      transactionId,
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      expected,
      received: razorpaySignature,
    })
    return json(response, 400, { error: 'Payment signature could not be verified' })
  }

  const admin = createClient(projectUrl, serviceRoleKey, { auth: { persistSession: false } })
  let transaction = null
  let lookupError = null

  const byId = await admin.from('payment_transactions').select('id,student_id,package_id,academic_year_id,amount_paise,currency,status,transaction_type,provider_metadata,razorpay_order_id').eq('id', transactionId).maybeSingle()
  if (!byId.error && byId.data) {
    transaction = byId.data
  } else {
    lookupError = byId.error
    const byOrder = await admin.from('payment_transactions').select('id,student_id,package_id,academic_year_id,amount_paise,currency,status,transaction_type,provider_metadata,razorpay_order_id').eq('razorpay_order_id', razorpayOrderId).maybeSingle()
    if (!byOrder.error && byOrder.data) {
      transaction = byOrder.data
    } else {
      lookupError = byOrder.error || lookupError
    }
  }

  if (!transaction) {
    console.error('Razorpay browser verification transaction lookup failed', {
      transactionId,
      orderId: razorpayOrderId,
      message: lookupError?.message || null,
    })
    return json(response, 404, { error: 'Payment order not found' })
  }

  if (transaction.status === 'paid') return json(response, 200, { ok: true })

  const { error: updateError } = await admin.from('payment_transactions').update({
    status: 'paid',
    razorpay_payment_id: razorpayPaymentId,
    provider_metadata: { verified: true },
  }).eq('id', transaction.id).eq('status', 'pending')

  if (updateError) {
    console.error('Razorpay browser verification transaction update failed', { transactionId, message: updateError.message })
    return json(response, 400, { error: 'Payment could not be recorded' })
  }

  const { data: packageData } = await admin.from('packages').select('fixed_expires_on').eq('id', transaction.package_id).single()
  if (!packageData?.fixed_expires_on) {
    console.error('Razorpay browser verification package expiry missing', { transactionId, packageId: transaction.package_id })
    return json(response, 400, { error: 'Package expiry is not configured' })
  }

  const { data: freePackage } = await admin.from('packages').select('id').eq('academic_year_id', transaction.academic_year_id).eq('code', 'FREE').maybeSingle()
  if (freePackage) {
    const now = Date.now()
    await admin.from('student_entitlements').insert({
      student_id: transaction.student_id,
      package_id: freePackage.id,
      academic_year_id: transaction.academic_year_id,
      source: 'trial',
      starts_at: new Date(now - 1000).toISOString(),
      ends_at: new Date(now).toISOString(),
      status: 'expired',
    })
  }

  const { error: entitlementError } = await admin.from('student_entitlements').insert({
    student_id: transaction.student_id,
    package_id: transaction.package_id,
    academic_year_id: transaction.academic_year_id,
    source: transaction.transaction_type === 'upgrade' ? 'razorpay_upgrade' : 'razorpay_purchase',
    starts_at: new Date().toISOString(),
    ends_at: `${packageData.fixed_expires_on}T23:59:59.999Z`,
    status: 'active',
    source_payment_id: transaction.id,
  })

  if (entitlementError && !String(entitlementError.message).toLowerCase().includes('duplicate')) {
    console.error('Razorpay browser verification entitlement insert failed', { transactionId, message: entitlementError.message })
    return json(response, 400, { error: 'Paid package could not be activated' })
  }
  const couponCode = transaction.provider_metadata?.coupon_code
  const discountPaise = Number(transaction.provider_metadata?.discount_paise || 0)
  if (couponCode && discountPaise > 0) {
    const { data: coupon } = await admin.from('coupons').select('id').eq('code', couponCode).maybeSingle()
    if (coupon) await admin.from('coupon_redemptions').insert({ coupon_id: coupon.id, student_id: transaction.student_id, payment_transaction_id: transaction.id, discount_paise: discountPaise })
  }

  return json(response, 200, { ok: true })
}
