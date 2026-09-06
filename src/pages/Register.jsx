import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { AuthShell, Field } from './Login.jsx'
import Turnstile from '../components/Turnstile.jsx'

const allowedPackages = ['FREE', 'BASIC', 'PRO']
const turnstileSiteKey = String(import.meta.env.VITE_TURNSTILE_SITE_KEY || '').trim()
const validName = value => /^[\p{L}][\p{L}\p{M} .'-]{1,79}$/u.test(value.trim())

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
  const [captchaToken, setCaptchaToken] = useState('')
  const [captchaKey, setCaptchaKey] = useState(0)
  const [website, setWebsite] = useState('')
  const formOpenedAt = useRef(Date.now())
  const captchaError = useCallback(() => setError('The security check could not be completed. Please try again.'), [])

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
    const cleanName = fullName.trim().replace(/\s+/g, ' ')
    const cleanEmail = email.trim().toLowerCase()
    const cleanReferral = referralCode.trim().toUpperCase()
    if (website || Date.now() - formOpenedAt.current < 1500) return setError('Please wait a moment and try again.')
    if (!validName(cleanName)) return setError('Enter a valid full name using letters, spaces, apostrophes or hyphens.')
    if (password.length < 8) return setError('Password must be at least 8 characters.')
    if (turnstileSiteKey && !captchaToken) return setError('Please complete the security check.')
    setSubmitting(true)
    setError('')
    if (cleanReferral) {
      const { data: referralValid, error: referralError } = await supabase.rpc('is_valid_referral_code', { code_input: cleanReferral })
      if (referralError || !referralValid) {
        setSubmitting(false)
        return setError(referralError ? 'Referral validation is temporarily unavailable.' : 'This referral code is not valid.')
      }
    }
    const { error: signUpError } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        captchaToken: captchaToken || undefined,
        emailRedirectTo: `${import.meta.env.PROD ? 'https://tenthkipadhai.online' : window.location.origin}/login`,
        data: { full_name: cleanName, selected_package: packageCode, referral_code: cleanReferral || null },
      },
    })
    setSubmitting(false)
    if (signUpError) {
      if (turnstileSiteKey) { setCaptchaToken(''); setCaptchaKey(value => value + 1) }
      fetch('/api/client-audit-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventType: 'registration.failed', errorCode: signUpError.code, status: signUpError.status, message: signUpError.message }),
      }).catch(() => {})
      return setError(signUpError.message)
    }
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
      <Field label="Full name" value={fullName} onChange={setFullName} autoComplete="name" minLength="2" maxLength="80" title="Use letters, spaces, apostrophes or hyphens." />
      <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
      <Field label="Password" type="password" minLength="8" value={password} onChange={setPassword} autoComplete="new-password" />
      <Field label="Referral code" value={referralCode} onChange={setReferralCode} required={false} />
      <label className="hidden" aria-hidden="true">Website<input tabIndex="-1" autoComplete="off" value={website} onChange={event => setWebsite(event.target.value)} /></label>
      {turnstileSiteKey && <Turnstile key={captchaKey} siteKey={turnstileSiteKey} onToken={setCaptchaToken} onError={captchaError} />}
      <p className="text-xs text-ink/60">Use at least 8 characters. By registering, you agree to the platform terms and privacy policy.</p>
      {error && <div className="rounded-xl border-2 border-flame bg-flame/15 p-3 text-sm">{error}</div>}
      <button className="btn-primary w-full" disabled={submitting}>{submitting ? 'Creating account…' : 'Create account →'}</button>
      <div className="text-center text-sm text-ink/65">Already registered? <Link className="font-bold underline" to="/login">Log in</Link></div>
    </form>
  </AuthShell>
}
