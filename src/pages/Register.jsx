import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { AuthShell, Field } from './Login.jsx'
import Turnstile from '../components/Turnstile.jsx'
import CitySelect from '../components/CitySelect.jsx'

const allowedPackages = ['FREE', 'BASIC', 'PRO']
const turnstileSiteKey = String(import.meta.env.VITE_TURNSTILE_SITE_KEY || '').trim()
const isDevelopmentEnvironment = import.meta.env.DEV || ['localhost', '127.0.0.1'].includes(window.location.hostname)
const validName = value => /^[\p{L}][\p{L}\p{M} .'-]{1,79}$/u.test(value.trim())
const validEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
const normalizePhone = value => {
  const digits = value.replace(/\D/g, '')
  const indianNumber = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits
  return /^[6-9]\d{9}$/.test(indianNumber) ? `+91${indianNumber}` : ''
}
const validReferral = value => /^[A-Z0-9]{3,20}$/.test(value)
const validCity = value => /^[\p{L}\p{M}][\p{L}\p{M} .'-]{1,79}$/u.test(value)

export default function Register() {
  const [params] = useSearchParams()
  const requested = params.get('package')?.toUpperCase()
  const capturedReferral = (params.get('ref') || params.get('source') || window.sessionStorage.getItem('tenthkipadhai_referral_code') || '').trim().toUpperCase()
  const [packageCode, setPackageCode] = useState(allowedPackages.includes(requested) ? requested : 'FREE')
  const [availablePackages, setAvailablePackages] = useState([])
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [password, setPassword] = useState('')
  const [referralCode, setReferralCode] = useState(capturedReferral)
  const [error, setError] = useState('')
  const [complete, setComplete] = useState(false)
  const [paymentMessage, setPaymentMessage] = useState('')
  const [pendingPayment, setPendingPayment] = useState(null)
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
    const cleanPhone = normalizePhone(phone)
    const cleanCity = city.trim()
    const cleanReferral = referralCode.trim().toUpperCase()
    if (website || Date.now() - formOpenedAt.current < 1500) return setError('Please wait a moment and try again.')
    if (!allowedPackages.includes(packageCode) || !availablePackages.some(pkg => pkg.code === packageCode)) return setError('Please select an available package.')
    if (!validName(cleanName)) return setError('Enter a valid full name using letters, spaces, apostrophes or hyphens.')
    if (!validEmail(cleanEmail)) return setError('Enter a valid email address.')
    if (!cleanPhone) return setError('Enter a valid 10-digit Indian mobile number.')
    if (!validCity(cleanCity)) return setError('Please select your city.')
    if (password.length < 8) return setError('Password must be at least 8 characters.')
    if (cleanReferral && !validReferral(cleanReferral)) return setError('Enter a valid referral code using 3–20 letters and numbers.')
    if (!isDevelopmentEnvironment && !turnstileSiteKey) return setError('Registration security is temporarily unavailable.')
    if (!isDevelopmentEnvironment && !captchaToken) return setError('Please complete the security check.')
    setSubmitting(true)
    setError('')
    if (cleanReferral) {
      const { data: referralIsValid, error: referralError } = await supabase.rpc('is_valid_referral_code', { code_input: cleanReferral })
      if (referralError || !referralIsValid) {
        setSubmitting(false)
        return setError(referralError ? 'Referral validation is temporarily unavailable.' : 'This referral code is not valid.')
      }
    }
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName: cleanName, email: cleanEmail, phone: cleanPhone, city: cleanCity, password, packageCode, referralCode: cleanReferral || null, captchaToken, website }),
    })
    const responseBody = await response.json().catch(() => ({}))
    setSubmitting(false)
    if (!response.ok) {
      setCaptchaToken(''); setCaptchaKey(value => value + 1)
      return setError(responseBody.error || 'Your account could not be created. Please try again.')
    }
    window.sessionStorage.removeItem('tenthkipadhai_referral_code')
    if (responseBody.payment) return setPendingPayment(responseBody.payment)
    if (packageCode !== 'FREE') setPaymentMessage(`${responseBody.paymentError || 'Payment could not be started.'} Your account has been registered with the free trial package.`)
    setComplete(true)
  }

  async function openPayment(payment) {
    const recordOutcome = outcome => fetch('/api/payment-fallback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ transactionId: payment.transactionId, outcome }) }).catch(() => null)
    setSubmitting(true)
    try {
      if (!window.Razorpay) {
        await new Promise((resolve, reject) => { const script = document.createElement('script'); script.src = 'https://checkout.razorpay.com/v1/checkout.js'; script.onload = resolve; script.onerror = () => reject(new Error('Unable to load payment checkout')) ; document.body.appendChild(script) })
      }
      const checkout = new window.Razorpay({ key: payment.keyId, amount: payment.amount, currency: payment.currency, name: 'Tenth Ki Padhai', description: 'Paid study package', order_id: payment.orderId, prefill: { name: fullName, email, contact: phone }, theme: { color: '#f6c453' }, handler: async result => {
        let verify = null
        let body = {}
        try {
          verify = await fetch('/api/verify-payment', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ transactionId: payment.transactionId, razorpayOrderId: result.razorpay_order_id, razorpayPaymentId: result.razorpay_payment_id, razorpaySignature: result.razorpay_signature }) })
          body = await verify.json().catch(() => ({}))
        } catch (verificationError) {
          console.error('Razorpay verification request failed', verificationError)
        }
        setPaymentMessage(verify?.ok ? 'Payment successful. Your paid package will be activated after verification.' : `Payment verification did not succeed${body.error ? `: ${body.error}` : ''}. Your account has been registered with the free trial package.`)
        setComplete(true)
      }, modal: { ondismiss: () => { recordOutcome('cancelled'); setPaymentMessage('The payment was not completed. Your account has been registered with the free trial package.'); setComplete(true) } } })
      checkout.on('payment.failed', () => { recordOutcome('failed'); setPaymentMessage('The payment was not completed. Your account has been registered with the free trial package.'); setComplete(true) })
      checkout.open()
    } catch (error) { await recordOutcome('failed'); setPaymentMessage('Payment could not be started. Your account has been registered with the free trial package.'); setComplete(true) } finally { setSubmitting(false) }
  }

  if (pendingPayment) return <PaymentReview payment={pendingPayment} packageName={availablePackages.find(pkg => pkg.code === packageCode)?.name || packageCode} openPayment={openPayment} />
  if (complete) return <AuthShell title="Registration complete" subtitle={[paymentMessage, 'We sent a verification link to your email. Please check your inbox and confirm your account before logging in.'].filter(Boolean).join(' ')}>
    <Link to="/login" className="btn-primary w-full">Go to login</Link>
  </AuthShell>

  return <AuthShell title="Create your account" subtitle="Choose a package now. Paid checkout starts after email verification.">
    <form onSubmit={submit} className="space-y-3">
      <label className="block">
          <span className="text-xs font-mono uppercase tracking-wider text-ink/60">Package <span className="text-flame" aria-hidden="true">*</span></span>
        <select required value={packageCode} onChange={e => setPackageCode(e.target.value)} className="form-control">
          {!availablePackages.length && <option value="">Loading available packages…</option>}
          {availablePackages.map(pkg => <option value={pkg.code} key={pkg.code}>{pkg.name} — {pkg.price_paise ? `₹${Math.round(pkg.price_paise / 100)}` : `${pkg.trial_days} days free`}</option>)}
        </select>
      </label>
      <Field label="Full name" value={fullName} onChange={setFullName} autoComplete="name" minLength="2" maxLength="80" title="Use letters, spaces, apostrophes or hyphens." />
      <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
      <Field label="Phone number" type="tel" value={phone} onChange={setPhone} autoComplete="tel" inputMode="numeric" minLength="10" maxLength="18" pattern="[+0-9 ()-]{10,18}" placeholder="98765 43210" title="Enter a valid 10-digit Indian mobile number." />
      <CitySelect value={city} onChange={setCity} />
      <Field label="Password" type="password" minLength="8" value={password} onChange={setPassword} autoComplete="new-password" />
      <Field label="Referral code" value={referralCode} onChange={value => setReferralCode(value.toUpperCase())} required={false} minLength="3" maxLength="20" pattern="[A-Za-z0-9]{3,20}" autoComplete="off" title="Use 3–20 letters and numbers." />
      <label className="hidden" aria-hidden="true">Website<input tabIndex="-1" autoComplete="off" value={website} onChange={event => setWebsite(event.target.value)} /></label>
      {!isDevelopmentEnvironment && turnstileSiteKey && <Turnstile key={captchaKey} siteKey={turnstileSiteKey} onToken={setCaptchaToken} onError={captchaError} />}
      <p className="text-xs text-ink/60">All fields except referral code are required. Use at least 8 characters for your password. By registering, you agree to the platform terms and privacy policy.</p>
      {error && <div className="rounded-xl border-2 border-flame bg-flame/15 p-3 text-sm">{error}</div>}
      <button className="btn-primary w-full" disabled={submitting}>{submitting ? 'Creating account…' : 'Create account →'}</button>
      <div className="text-center text-sm text-ink/65">Already registered? <Link className="font-bold underline" to="/login">Log in</Link></div>
    </form>
  </AuthShell>
}

function PaymentReview({ payment, packageName, openPayment }) {
  const [coupon, setCoupon] = useState(''); const [applied, setApplied] = useState(''); const [summary, setSummary] = useState(null); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [cancelled, setCancelled] = useState(false)
  async function review() { setBusy(true); setError(''); const response = await fetch('/api/payment-order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ transactionId: payment.transactionId, couponCode: applied ? '' : coupon }) }); const body = await response.json().catch(() => ({})); setBusy(false); if (!response.ok) return setError(body.error || 'Coupon could not be applied.'); setSummary(body); if (!applied && coupon.trim()) setApplied(coupon.trim().toUpperCase()) }
  async function cancel() { if (!window.confirm('Your purchase is not completed. You will be assigned the free trial package. Continue?')) return; setBusy(true); await fetch('/api/payment-fallback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ transactionId: payment.transactionId, outcome: 'cancelled' }) }).catch(() => null); setBusy(false); setCancelled(true) }
  if (cancelled) return <AuthShell title="Registration complete" subtitle="Your purchase is not completed. Your account has been registered with the free trial package. We sent a verification link to your email. Please check your inbox and confirm your account before logging in."><Link to="/login" className="btn-primary w-full">Go to login</Link></AuthShell>
  return <AuthShell title="Review your payment" subtitle="Check your package and discount before continuing to Razorpay."><div className="space-y-4"><div className="card p-4 bg-cream"><div className="font-mono text-xs uppercase text-ink/60">Package</div><div className="font-display font-extrabold text-xl mt-1">{summary?.packageName || packageName}</div><div className="text-sm mt-2">Amount: ₹{Math.round((summary?.originalAmount || payment.amount) / 100)}</div>{summary?.discount > 0 && <div className="text-sm text-green-700">Discount: −₹{Math.round(summary.discount / 100)}</div>}<div className="heading-display text-3xl mt-2">₹{Math.round((summary?.amount || payment.amount) / 100)}</div></div><div className="flex gap-2"><input className="form-control flex-1" placeholder="Coupon code" value={coupon} disabled={Boolean(applied) || busy} onChange={e => setCoupon(e.target.value.toUpperCase())} /><button type="button" className="btn-secondary" disabled={!coupon.trim() || Boolean(applied) || busy} onClick={review}>Apply</button>{applied && <button type="button" className="btn-secondary" onClick={() => { setApplied(''); setSummary(null); setCoupon('') }}>Remove</button>}</div>{error && <div className="text-sm text-flame font-bold">{error}</div>}<div className="grid sm:grid-cols-2 gap-2"><button type="button" className="btn-primary" disabled={busy} onClick={() => summary ? openPayment(summary.payment) : review()}>{busy ? 'Checking…' : 'Continue to Razorpay →'}</button><button type="button" className="btn-secondary" disabled={busy} onClick={cancel}>Cancel</button></div></div></AuthShell>
}
