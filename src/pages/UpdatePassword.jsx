import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { AuthShell } from './Login.jsx'

export default function UpdatePassword() {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [checking, setChecking] = useState(true)
  const [hasSession, setHasSession] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [complete, setComplete] = useState(false)

  const changePassword = value => {
    setPassword(value)
    if (error) setError('')
  }

  const changeConfirmation = value => {
    setConfirmation(value)
    if (error) setError('')
  }

  useEffect(() => {
    let active = true
    const checkSession = async () => {
      if (!supabase) {
        if (active) { setError('Password recovery is temporarily unavailable.'); setChecking(false) }
        return
      }
      const hash = new URLSearchParams(window.location.hash.slice(1))
      const linkError = hash.get('error_description')
      const { data } = await supabase.auth.getSession()
      if (!active) return
      setHasSession(Boolean(data.session))
      if (linkError) setError(linkError.replace(/\+/g, ' '))
      setChecking(false)
    }
    checkSession()
    if (!supabase) return () => { active = false }
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active && session) { setHasSession(true); setChecking(false) }
    })
    return () => { active = false; listener.subscription.unsubscribe() }
  }, [])

  const submit = async event => {
    event.preventDefault()
    setError('')
    if (password.length < 8) return setError('Password must be at least 8 characters.')
    if (password !== confirmation) return setError('Passwords do not match.')
    setSubmitting(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setSubmitting(false)
    if (updateError) return setError(updateError.message)
    await supabase.auth.signOut()
    setComplete(true)
  }

  if (checking) return <AuthShell title="Set a new password" subtitle="Checking your reset link…"><div /></AuthShell>
  if (complete) return <AuthShell title="Password updated" subtitle="Your new password is ready to use."><Link to="/login" className="btn-primary w-full">Log in</Link></AuthShell>
  if (!hasSession) return <AuthShell title="Reset link unavailable" subtitle="This password reset link is invalid or has expired.">
    {error && <div className="rounded-xl border-2 border-flame bg-flame/15 p-3 text-sm mb-4">{error}</div>}
    <Link to="/forgot-password" className="btn-primary w-full">Request a new link</Link>
  </AuthShell>

  return <AuthShell title="Set a new password" subtitle="Choose a password you don’t use elsewhere.">
    <form onSubmit={submit} className="space-y-4">
      <PasswordField label="New password" value={password} onChange={changePassword} />
      <PasswordField label="Confirm new password" value={confirmation} onChange={changeConfirmation} />
      <p className="text-xs text-ink/60">Use at least 8 characters.</p>
      {error && <div className="rounded-xl border-2 border-flame bg-flame/15 p-3 text-sm">{error}</div>}
      <button className="btn-primary w-full" disabled={submitting}>{submitting ? 'Updating…' : 'Update password →'}</button>
    </form>
  </AuthShell>
}

function PasswordField({ label, value, onChange }) {
  const [visible, setVisible] = useState(false)
  return <label className="block">
    <span className="text-xs font-mono uppercase tracking-wider text-ink/60">
      {label} <span className="text-flame" aria-hidden="true">*</span>
    </span>
    <span className="relative mt-1 block">
      <input
        type={visible ? 'text' : 'password'}
        required
        minLength="8"
        value={value}
        onChange={event => onChange(event.target.value)}
        autoComplete="new-password"
        className="w-full rounded-xl border-2 border-ink bg-paper px-4 py-3 pr-12 focus:outline-none focus:shadow-pop"
      />
      <button
        type="button"
        onClick={() => setVisible(current => !current)}
        className="absolute inset-y-0 right-0 grid w-12 place-items-center rounded-r-xl text-ink/65 hover:text-ink focus:outline-none focus:ring-2 focus:ring-inset focus:ring-ink"
        aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        aria-pressed={visible}
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </span>
  </label>
}

function EyeIcon() {
  return <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>
}

function EyeOffIcon() {
  return <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m3 3 18 18"/><path d="M10.6 5.2A11.6 11.6 0 0 1 12 5c6.5 0 10 7 10 7a16.6 16.6 0 0 1-2.1 3.1M6.6 6.6C3.6 8.6 2 12 2 12s3.5 7 10 7c1.6 0 3-.4 4.2-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>
}
