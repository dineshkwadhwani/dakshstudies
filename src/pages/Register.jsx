import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { AuthShell, Field } from './Login.jsx'

const allowedPackages = ['FREE', 'BASIC', 'PRO']

export default function Register() {
  const [params] = useSearchParams()
  const requested = params.get('package')?.toUpperCase()
  const capturedReferral = (params.get('ref') || params.get('source') || window.sessionStorage.getItem('tenthkipadhai_referral_code') || '').trim().toUpperCase()
  const [packageCode, setPackageCode] = useState(allowedPackages.includes(requested) ? requested : 'FREE')
  const [availablePackages, setAvailablePackages] = useState([])
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [referralCode, setReferralCode] = useState(capturedReferral)
  const [error, setError] = useState('')
  const [complete, setComplete] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let active = true
    async function loadPackages() {
      const { data: year } = await supabase.from('academic_years').select('id').eq('is_current', true).maybeSingle()
      if (!year || !active) return
      const { data } = await supabase.from('packages').select('code,name,price_paise,trial_days,sale_enabled,rank').eq('academic_year_id', year.id).eq('status', 'published').order('rank')
      const available = (data || []).filter(pkg => pkg.sale_enabled)
      if (!active) return
      setAvailablePackages(available)
      if (!available.some(pkg => pkg.code === packageCode)) setPackageCode(available[0]?.code || '')
    }
    loadPackages()
    return () => { active = false }
  }, [])

  const submit = async (event) => {
    event.preventDefault()
    if (!supabase) return setError('Supabase is not configured.')
    setSubmitting(true)
    setError('')
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${import.meta.env.PROD ? 'https://tenthkipadhai.online' : window.location.origin}/login`,
        data: { full_name: fullName, selected_package: packageCode, referral_code: referralCode.trim().toUpperCase() || null },
      },
    })
    setSubmitting(false)
    if (signUpError) return setError(signUpError.message)
    window.sessionStorage.removeItem('tenthkipadhai_referral_code')
    setComplete(true)
  }

  if (complete) return <AuthShell title="Check your email" subtitle="We sent you a verification link. Verify your email before logging in.">
    <Link to="/login" className="btn-primary w-full">Go to login</Link>
  </AuthShell>

  return <AuthShell title="Create your account" subtitle="Choose a package now. Paid checkout starts after email verification.">
    <form onSubmit={submit} className="space-y-4">
      <label className="block">
        <span className="text-xs font-mono uppercase tracking-wider text-ink/60">Package</span>
        <select required value={packageCode} onChange={e => setPackageCode(e.target.value)} className="form-control">
          {!availablePackages.length && <option value="">Loading available packages…</option>}
          {availablePackages.map(pkg => <option value={pkg.code} key={pkg.code}>{pkg.name} — {pkg.price_paise ? `₹${Math.round(pkg.price_paise / 100)}` : `${pkg.trial_days} days free`}</option>)}
        </select>
      </label>
      <Field label="Full name" value={fullName} onChange={setFullName} autoComplete="name" />
      <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
      <Field label="Password" type="password" value={password} onChange={setPassword} autoComplete="new-password" />
      <Field label="Referral or source code" value={referralCode} onChange={setReferralCode} required={false} />
      <p className="text-xs text-ink/60">Use at least 8 characters. By registering, you agree to the platform terms and privacy policy.</p>
      {error && <div className="rounded-xl border-2 border-flame bg-flame/15 p-3 text-sm">{error}</div>}
      <button className="btn-primary w-full" disabled={submitting}>{submitting ? 'Creating account…' : 'Create account →'}</button>
      <div className="text-center text-sm text-ink/65">Already registered? <Link className="font-bold underline" to="/login">Log in</Link></div>
    </form>
  </AuthShell>
}
