import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'

const normalizePhone = value => {
  const digits = value.replace(/\D/g, '')
  const indianNumber = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits
  return /^[6-9]\d{9}$/.test(indianNumber) ? `+91${indianNumber}` : ''
}

const validCity = value => /^[\p{L}\p{M}][\p{L}\p{M} .'-]{1,79}$/u.test(value.trim())

export default function ProfileCompletionPrompt() {
  const { profile, session, reloadProfile } = useAuth()
  const dismissalKey = profile?.id ? `contact-prompt:${profile.id}` : ''
  const loginMarker = session?.user?.last_sign_in_at || ''
  const [dismissed, setDismissed] = useState(false)
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const contactDetailsMissing = !profile?.phone?.trim() || !profile?.city?.trim()

  useEffect(() => {
    if (!profile) return
    setPhone(profile.phone || '')
    setCity(profile.city || '')
    setError('')
    setDismissed(Boolean(dismissalKey && window.sessionStorage.getItem(dismissalKey) === loginMarker))
  }, [profile?.id, profile?.phone, profile?.city, dismissalKey, loginMarker])

  const close = () => {
    if (dismissalKey) window.sessionStorage.setItem(dismissalKey, loginMarker)
    setDismissed(true)
  }

  useEffect(() => {
    if (dismissed || !contactDetailsMissing) return undefined
    const onKeyDown = event => { if (event.key === 'Escape') close() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [dismissed, contactDetailsMissing, dismissalKey, loginMarker])

  if (!profile || dismissed || !contactDetailsMissing) return null

  const save = async event => {
    event.preventDefault()
    setError('')
    const cleanPhone = phone.trim() ? normalizePhone(phone) : ''
    const cleanCity = city.trim().replace(/\s+/g, ' ')
    if (!cleanPhone && !cleanCity) return setError('Enter a phone number or city, or close this message for now.')
    if (phone.trim() && !cleanPhone) return setError('Enter a valid 10-digit Indian mobile number.')
    if (cleanCity && !validCity(cleanCity)) return setError('Enter a valid city name using 2–80 characters.')

    setSaving(true)
    const { error: saveError } = await supabase.rpc('update_my_contact_details', {
      phone_input: cleanPhone || null,
      city_input: cleanCity || null,
    })
    setSaving(false)
    if (saveError) return setError(saveError.message)
    await reloadProfile()
    close()
  }

  return <div className="fixed inset-0 z-[90] flex items-center justify-center bg-ink/60 p-4" role="presentation">
    <section className="card relative w-full max-w-md p-6" role="dialog" aria-modal="true" aria-labelledby="contact-prompt-title">
      <button type="button" onClick={close} className="absolute right-4 top-4 w-9 h-9 rounded-full border-2 border-ink bg-paper font-bold text-xl leading-none" aria-label="Close profile reminder">×</button>
      <div className="pr-10">
        <div className="text-xs font-mono uppercase tracking-wider text-ink/55">Complete your profile</div>
        <h2 id="contact-prompt-title" className="heading-display text-2xl mt-1">Help us keep in touch</h2>
        <p className="text-sm text-ink/60 mt-2">Your phone number or city is missing. You can add them now or close this reminder.</p>
      </div>
      <form onSubmit={save} className="space-y-4 mt-5" noValidate>
        <label className="block"><span className="text-xs font-mono uppercase text-ink/60">Phone number <span className="normal-case">(optional)</span></span><input type="tel" inputMode="numeric" autoComplete="tel" className="form-control" value={phone} onChange={event => setPhone(event.target.value)} placeholder="98765 43210" maxLength="18" /></label>
        <label className="block"><span className="text-xs font-mono uppercase text-ink/60">City <span className="normal-case">(optional)</span></span><input type="text" autoComplete="address-level2" className="form-control" value={city} onChange={event => setCity(event.target.value)} maxLength="80" /></label>
        {error && <div className="rounded-xl border-2 border-flame bg-flame/15 p-3 text-sm" role="alert">{error}</div>}
        <button type="submit" className="btn-primary w-full" disabled={saving}>{saving ? 'Saving…' : 'Save details'}</button>
      </form>
    </section>
  </div>
}
