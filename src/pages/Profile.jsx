import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'
import ReferralShare from '../components/ReferralShare.jsx'
import CitySelect from '../components/CitySelect.jsx'

const empty = { full_name: '', email: '', phone: '', school_name: '', city: '', date_of_birth: '', target_exam_date: '', parent_name: '', parent_email: '' }

export default function Profile() {
  const { profile, user, reloadProfile, isImpersonating } = useAuth()
  const [form, setForm] = useState(empty)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const isStudent = profile?.role === 'student'

  useEffect(() => {
    let active = true
    async function load() {
      let parent = null
      if (isStudent) {
        const { data } = await supabase.from('parent_contacts').select('parent_name,email').eq('student_id', user.id).eq('active', true).maybeSingle()
        parent = data
      }
      if (active) {
        setForm({
          full_name: profile?.full_name || '', email: profile?.email || user?.email || '',
          phone: profile?.phone || '', school_name: profile?.school_name || '', city: profile?.city || '',
          date_of_birth: profile?.date_of_birth || '', target_exam_date: profile?.target_exam_date || '',
          parent_name: parent?.parent_name || '', parent_email: parent?.email || '',
        })
        setLoading(false)
      }
    }
    if (profile && user) load()
    return () => { active = false }
  }, [profile, user, isStudent])

  const set = key => event => setForm(current => ({ ...current, [key]: event.target.value }))
  const submit = async event => {
    event.preventDefault()
    setSaving(true); setMessage({ type: '', text: '' })
    const { error } = await supabase.rpc('update_my_profile', {
      full_name_input: form.full_name, phone_input: form.phone || null,
      school_name_input: form.school_name || null, city_input: form.city || null,
      date_of_birth_input: form.date_of_birth || null, target_exam_date_input: form.target_exam_date || null,
      parent_name_input: isStudent ? form.parent_name || null : null,
      parent_email_input: isStudent ? form.parent_email || null : null,
    })
    setSaving(false)
    if (error) return setMessage({ type: 'error', text: error.message })
    await reloadProfile()
    setMessage({ type: 'success', text: 'Your profile has been updated.' })
  }

  if (loading) return <div className="card p-6">Loading your profile…</div>
  return <div>
    <div className="mb-5"><div className="font-mono text-xs uppercase tracking-widest text-ink/60">Your account</div><h1 className="heading-display text-3xl">Profile</h1><p className="text-ink/65 mt-1">Keep your personal and study information up to date.</p></div>
    <form onSubmit={submit} className="space-y-5">
      <section className="card p-5 sm:p-6 space-y-4"><h2 className="heading-display text-xl">Account details</h2><div className="grid sm:grid-cols-2 gap-4"><Field label="Full name" value={form.full_name} onChange={set('full_name')} /><ReadOnly label="Email address" value={form.email} hint="Your verified login email cannot be changed here." /><ReadOnly label="Role" value={roleName(profile.role)} /><ReadOnly label="Account status" value={profile.status} /></div></section>
      <section className="card p-5 sm:p-6 space-y-4 bg-sun/10"><div><h2 className="heading-display text-xl">Your referral</h2><p className="text-sm text-ink/55 mt-1">Share your link or QR code. When someone registers through it, the referral is credited to you.</p></div><ReadOnly label="Referral code" value={profile.referral_code} /><ReferralShare code={profile.referral_code} compact /></section>
      <section className="card p-5 sm:p-6 space-y-4"><h2 className="heading-display text-xl">Personal details</h2><div className="grid sm:grid-cols-2 gap-4"><Field label="Phone number" type="tel" required={isStudent} value={form.phone} onChange={set('phone')} /><CitySelect required={isStudent} value={form.city} onChange={value => setForm(current => ({ ...current, city: value }))} />{isStudent && <Field label="Date of birth" type="date" value={form.date_of_birth} onChange={set('date_of_birth')} />}</div></section>
      {isStudent && <section className="card p-5 sm:p-6 space-y-4"><h2 className="heading-display text-xl">Study details</h2><div className="grid sm:grid-cols-2 gap-4"><Field label="School name" value={form.school_name} onChange={set('school_name')} /><Field label="Target exam date" type="date" value={form.target_exam_date} onChange={set('target_exam_date')} /><ReadOnly label="Board" value="CBSE" /><ReadOnly label="Class" value="Class 10" /></div></section>}
      {isStudent && <section className="card p-5 sm:p-6 space-y-4"><div><h2 className="heading-display text-xl">Parent or guardian</h2><p className="text-sm text-ink/55 mt-1">Optional. Daily missed-schedule reports are sent to this address when configured.</p></div><div className="grid sm:grid-cols-2 gap-4"><Field label="Parent/guardian name" required={false} value={form.parent_name} onChange={set('parent_name')} /><Field label="Parent/guardian email" type="email" required={false} value={form.parent_email} onChange={set('parent_email')} /></div></section>}
      {message.text && <div role="status" className={`card p-3 ${message.type === 'success' ? 'bg-leaf/25' : 'bg-flame/15'}`}>{message.text}</div>}
      <button className="btn-primary w-full" disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</button>
    </form>
    <PasswordChange email={user.email} disabled={isImpersonating} />
  </div>
}

function PasswordChange({ email, disabled }) {
  const [passwords, setPasswords] = useState({ current: '', next: '', confirmation: '' })
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const setPassword = key => event => setPasswords(current => ({ ...current, [key]: event.target.value }))

  const submit = async event => {
    event.preventDefault()
    setMessage({ type: '', text: '' })
    if (passwords.next.length < 8) return setMessage({ type: 'error', text: 'The new password must be at least 8 characters.' })
    if (passwords.next !== passwords.confirmation) return setMessage({ type: 'error', text: 'The new passwords do not match.' })
    if (passwords.current === passwords.next) return setMessage({ type: 'error', text: 'Choose a new password that is different from your current password.' })

    setSubmitting(true)
    const { error: verificationError } = await supabase.auth.signInWithPassword({ email, password: passwords.current })
    if (verificationError) {
      setSubmitting(false)
      return setMessage({ type: 'error', text: 'Your current password is incorrect.' })
    }
    const { error: updateError } = await supabase.auth.updateUser({ password: passwords.next })
    setSubmitting(false)
    if (updateError) return setMessage({ type: 'error', text: updateError.message })

    supabase.rpc('record_own_password_change').then(() => {})
    setPasswords({ current: '', next: '', confirmation: '' })
    setMessage({ type: 'success', text: 'Your password has been changed successfully.' })
  }

  return <section className="card p-5 sm:p-6 mt-6">
    <h2 className="heading-display text-xl">Change password</h2>
    <p className="text-sm text-ink/55 mt-1 mb-4">Confirm your current password, then choose a new password with at least 8 characters.</p>
    {disabled ? <div className="rounded-xl border-2 border-flame bg-flame/15 p-3 text-sm">Password changes are unavailable while impersonating another user.</div> : <form onSubmit={submit} className="space-y-4">
      <Field label="Current password" type="password" autoComplete="current-password" value={passwords.current} onChange={setPassword('current')} />
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="New password" type="password" minLength="8" autoComplete="new-password" value={passwords.next} onChange={setPassword('next')} />
        <Field label="Confirm new password" type="password" minLength="8" autoComplete="new-password" value={passwords.confirmation} onChange={setPassword('confirmation')} />
      </div>
      {message.text && <div role="status" aria-live="polite" className={`rounded-xl border-2 border-ink p-3 text-sm ${message.type === 'success' ? 'bg-leaf/25' : 'bg-flame/15'}`}>{message.text}</div>}
      <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? 'Changing password…' : 'Change password'}</button>
    </form>}
  </section>
}

function Field({ label, required = true, ...props }) { return <label className="block"><span className="text-xs font-mono uppercase tracking-wider text-ink/60">{label} {required ? <span className="text-flame" aria-hidden="true">*</span> : <span className="normal-case">(optional)</span>}</span><input className="form-control" required={required} {...props} /></label> }
function ReadOnly({ label, value, hint }) { return <label className="block"><span className="text-xs font-mono uppercase tracking-wider text-ink/60">{label}</span><input className="form-control bg-ink/5 text-ink/60 cursor-not-allowed" value={value || '—'} readOnly aria-readonly="true" />{hint && <span className="block text-xs text-ink/50 mt-1">{hint}</span>}</label> }
function roleName(role) { return ({ student: 'Student', super_admin: 'SuperAdmin', account_manager: 'Account Manager' })[role] || role }
