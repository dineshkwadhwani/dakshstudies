import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { AuthShell, Field } from './Login.jsx'

export default function UpdatePassword() {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [checking, setChecking] = useState(true)
  const [hasSession, setHasSession] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [complete, setComplete] = useState(false)

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
      <Field label="New password" type="password" value={password} onChange={setPassword} autoComplete="new-password" />
      <Field label="Confirm new password" type="password" value={confirmation} onChange={setConfirmation} autoComplete="new-password" />
      <p className="text-xs text-ink/60">Use at least 8 characters.</p>
      {error && <div className="rounded-xl border-2 border-flame bg-flame/15 p-3 text-sm">{error}</div>}
      <button className="btn-primary w-full" disabled={submitting}>{submitting ? 'Updating…' : 'Update password →'}</button>
    </form>
  </AuthShell>
}
