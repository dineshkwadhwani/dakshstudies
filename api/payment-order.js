import { createClient } from '@supabase/supabase-js'
const json = (response, status, body) => response.status(status).json(body)
export default async function handler(request, response) {
  if (request.method !== 'POST') return json(response, 405, { error: 'Method not allowed' })
  const projectUrl = process.env.SUPABASE_PROJECT_URL || process.env.VITE_SUPABASE_PROJECT_URL
  const keyId = process.env.RAZORPAY_KEY_ID
  const secret = process.env.RAZOR_PAY_SECRET_KEY
  const { transactionId, couponCode = '' } = request.body || {}
  if (!projectUrl || !process.env.SUPABASE_SERVICE_ROLE_KEY || !keyId || !secret || typeof transactionId !== 'string') return json(response, 503, { error: 'Payment setup is temporarily unavailable.' })
  const admin = createClient(projectUrl, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const { data: tx } = await admin.from('payment_transactions').select('id,student_id,package_id,academic_year_id,amount_paise,currency,status,transaction_type').eq('id', transactionId).maybeSingle()
  if (!tx || tx.status !== 'pending') return json(response, 404, { error: 'Payment transaction is no longer available.' })
  const { data: pkg } = await admin.from('packages').select('code,name,price_paise').eq('id', tx.package_id).single()
  let discount = 0; let coupon = null
  if (couponCode.trim()) {
    const { data } = await admin.from('coupons').select('id,code,discount_type,discount_value,usage_type,expires_at,active').eq('code', couponCode.trim().toUpperCase()).maybeSingle()
    if (!data || !data.active || new Date(data.expires_at) <= new Date()) return json(response, 400, { error: 'This coupon is invalid or expired.' })
    if (data.usage_type === 'one_time') { const { count } = await admin.from('coupon_redemptions').select('id', { count: 'exact', head: true }).eq('coupon_id', data.id); if (count) return json(response, 400, { error: 'This coupon has already been used.' }) }
    discount = data.discount_type === 'percentage' ? Math.floor(pkg.price_paise * Number(data.discount_value) / 100) : Math.round(Number(data.discount_value) * 100)
    discount = Math.min(Math.max(discount, 0), pkg.price_paise - 100)
    coupon = data
  }
  const amount = pkg.price_paise - discount
  const orderResponse = await fetch('https://api.razorpay.com/v1/orders', { method: 'POST', headers: { Authorization: `Basic ${Buffer.from(`${keyId}:${secret}`).toString('base64')}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ amount, currency: tx.currency || 'INR', receipt: tx.id, notes: { transaction_id: tx.id, package_code: pkg.code, coupon_code: coupon?.code || '' } }) })
  const order = await orderResponse.json().catch(() => ({}))
  if (!orderResponse.ok || !order.id) return json(response, 503, { error: 'Payment setup is temporarily unavailable.' })
  const { error: updateError } = await admin.from('payment_transactions').update({ amount_paise: amount, razorpay_order_id: order.id, provider_metadata: { source: tx.transaction_type === 'upgrade' ? 'student-upgrade' : 'registration', coupon_code: coupon?.code || null, discount_paise: discount } }).eq('id', tx.id).eq('status', 'pending')
  if (updateError) return json(response, 503, { error: 'Payment setup is temporarily unavailable.' })
  return json(response, 200, { packageName: pkg.name, originalAmount: pkg.price_paise, discount, amount, payment: { keyId, orderId: order.id, amount, currency: tx.currency || 'INR', transactionId: tx.id }, coupon: coupon?.code || null })
}
