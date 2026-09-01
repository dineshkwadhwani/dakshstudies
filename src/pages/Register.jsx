import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { AuthShell, Field } from './Login.jsx'

const allowedPackages = ['FREE', 'BASIC', 'PRO']

export default function Register() {
  const [params] = useSearchParams()
  const requested = params.get('package')?.toUpperCase()
  const capturedReferral = (params.get('ref') || params.get('source') || '').trim().toUpperCase()
  const [packageCode, setPackageCode] = useState(allowedPackages.includes(requested) ? requested : 'FREE')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [referralCode, setReferralCode] = useState(capturedReferral)
  const [error, setError] = useState('')
  const [complete, setComplete] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    if (!supabase) return setError('Supabase is not configured.')
    setSubmitting(true)
    setError('')
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
        data: { full_name: fullName, selected_package: packageCode, referral_code: referralCode.trim().toUpperCase() || null },
      },
    })
    setSubmitting(false)
    if (signUpError) return setError(signUpError.message)
    setComplete(true)
  }

  if (complete) return <AuthShell title="Check your email" subtitle="We sent you a verification link. Verify your email before logging in.">
    <Link to="/login" className="btn-primary w-full">Go to login</Link>
  </AuthShell>

  return <AuthShell title="Create your account" subtitle="Choose a package now. Paid checkout starts after email verification.">
    <form onSubmit={submit} className="space-y-4">
      <label className="block">
        <span className="text-xs font-mono uppercase tracking-wider text-ink/60">Package</span>
        <select value={packageCode} onChange={e => setPackageCode(e.target.value)} className="w-full mt-1 px-4 py-3 rounded-xl border-2 border-ink bg-paper">
          <option value="FREE">Free Trial — 7 days</option>
          <option value="BASIC">Basic — ₹299</option>
          <option value="PRO">Pro — ₹999</option>
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
