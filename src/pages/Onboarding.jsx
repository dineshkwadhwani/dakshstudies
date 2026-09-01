import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'
import { AuthShell, Field } from './Login.jsx'

const initial = {
  fullName: '', phone: '', school: '', city: '', birthDate: '', examDate: '', parentName: '', parentEmail: '',
}

export default function Onboarding() {
  const { profile, reloadProfile } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState(() => ({ ...initial, fullName: profile?.full_name || '' }))
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (profile?.role !== 'student') return <Navigate to="/dashboard" replace />
  if (profile?.onboarding_step === 'complete') return <Navigate to="/dashboard" replace />

  const set = key => value => setForm(current => ({ ...current, [key]: value }))
  const submit = async event => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    const { data, error: rpcError } = await supabase.rpc('complete_student_onboarding', {
      full_name_input: form.fullName,
      phone_input: form.phone,
      school_name_input: form.school,
      city_input: form.city,
      date_of_birth_input: form.birthDate,
      target_exam_date_input: form.examDate,
      parent_name_input: form.parentName || null,
      parent_email_input: form.parentEmail || null,
    })
    setSubmitting(false)
    if (rpcError) return setError(rpcError.message)
    await reloadProfile()
    navigate('/dashboard', { replace: true, state: { onboarding: data } })
  }

  return <AuthShell title="Tell us about your studies" subtitle="We use this to personalize your Class 10 plan. All fields except parent details are required.">
    <form onSubmit={submit} className="space-y-4">
      <Field label="Full name" value={form.fullName} onChange={set('fullName')} autoComplete="name" />
      <Field label="Phone number" type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" />
      <Field label="School name" value={form.school} onChange={set('school')} />
      <Field label="City" value={form.city} onChange={set('city')} autoComplete="address-level2" />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date of birth" type="date" value={form.birthDate} onChange={set('birthDate')} />
        <Field label="Target exam date" type="date" value={form.examDate} onChange={set('examDate')} />
      </div>
      <div className="rounded-xl border-2 border-ink bg-sky/15 p-3 text-sm"><strong>Curriculum:</strong> CBSE · Class 10</div>
      <div className="pt-2 border-t-2 border-ink/15">
        <div className="font-display font-bold mb-2">Parent/guardian details <span className="font-normal text-ink/50">(optional)</span></div>
        <div className="space-y-3">
          <Field label="Parent name" value={form.parentName} onChange={set('parentName')} required={false} />
          <Field label="Parent email" type="email" value={form.parentEmail} onChange={set('parentEmail')} required={false} />
        </div>
      </div>
      {error && <div className="rounded-xl border-2 border-flame bg-flame/15 p-3 text-sm">{error}</div>}
      <button className="btn-primary w-full" disabled={submitting}>{submitting ? 'Saving…' : 'Complete profile →'}</button>
    </form>
  </AuthShell>
}
