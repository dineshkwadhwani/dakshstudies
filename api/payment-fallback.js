import { createClient } from '@supabase/supabase-js'

const json = (response, status, body) => response.status(status).json(body)

export default async function handler(request, response) {
  if (request.method !== 'POST') return json(response, 405, { error: 'Method not allowed' })
  const projectUrl = process.env.SUPABASE_PROJECT_URL || process.env.VITE_SUPABASE_PROJECT_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const { transactionId, outcome } = request.body || {}
  if (!projectUrl || !serviceRoleKey || typeof transactionId !== 'string' || !['failed', 'cancelled'].includes(outcome)) return json(response, 400, { error: 'Invalid payment outcome' })
  const admin = createClient(projectUrl, serviceRoleKey, { auth: { persistSession: false } })
  const { data: transaction, error } = await admin.from('payment_transactions').select('id,student_id,academic_year_id,status,transaction_type').eq('id', transactionId).maybeSingle()
  if (error || !transaction) return json(response, 404, { error: 'Payment transaction not found' })
  if (transaction.status === 'paid') return json(response, 200, { ok: true })
  if (transaction.status === 'pending') {
    const { error: updateError } = await admin.from('payment_transactions').update({ status: outcome, provider_metadata: { source: 'browser-payment-outcome', outcome } }).eq('id', transactionId).eq('status', 'pending')
    if (updateError) return json(response, 400, { error: 'Payment outcome could not be recorded' })
  }
  if (transaction.transaction_type !== 'purchase') return json(response, 200, { ok: true })
  const { data: freePackage } = await admin.from('packages').select('id,trial_days').eq('academic_year_id', transaction.academic_year_id).eq('code', 'FREE').maybeSingle()
  if (freePackage) {
    const { data: existingTrial } = await admin.from('student_entitlements').select('id').eq('student_id', transaction.student_id).eq('source', 'trial').eq('status', 'active').maybeSingle()
    if (existingTrial) return json(response, 200, { ok: true })
    const starts = new Date()
    const ends = new Date(starts.getTime() + Number(freePackage.trial_days || 7) * 86400000)
    const { error: entitlementError } = await admin.from('student_entitlements').insert({ student_id: transaction.student_id, package_id: freePackage.id, academic_year_id: transaction.academic_year_id, source: 'trial', starts_at: starts.toISOString(), ends_at: ends.toISOString(), status: 'active' })
    if (entitlementError && !String(entitlementError.message).toLowerCase().includes('duplicate')) return json(response, 400, { error: 'Free trial could not be activated' })
  }
  return json(response, 200, { ok: true })
}
