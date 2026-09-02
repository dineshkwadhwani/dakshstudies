import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { AuthShell, Field } from './Login.jsx'

const recoveryRedirectUrl = () => `${import.meta.env.PROD ? 'https://tenthkipadhai.online' : window.location.origin}/update-password`

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [complete, setComplete] = useState(false)
  const [error, setError] = useState('')

  const submit = async event => {
    event.preventDefault()
    if (!supabase) return setError('Password recovery is temporarily unavailable.')
    setSubmitting(true)
    setError('')
    // Always show the same result so this page cannot reveal registered emails.
    const { error: sendError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: recoveryRedirectUrl() })
    setSubmitting(false)
    if (sendError) return setError('We could not send the reset email right now. Please wait a moment and try again.')
    setComplete(true)
  }

  if (complete) return <AuthShell title="Check your email" subtitle="If an account exists for that email, we sent a password reset link.">
    <Link to="/login" className="btn-primary w-full">Back to login</Link>
  </AuthShell>

  return <AuthShell title="Reset your password" subtitle="Enter your registered email and we’ll send you a secure reset link.">
    <form onSubmit={submit} className="space-y-4">
      <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
      {error && <div className="rounded-xl border-2 border-flame bg-flame/15 p-3 text-sm">{error}</div>}
      <button className="btn-primary w-full" disabled={submitting}>{submitting ? 'Sending…' : 'Send reset link →'}</button>
      <div className="text-center text-sm text-ink/65"><Link className="font-bold underline" to="/login">Back to login</Link></div>
    </form>
  </AuthShell>
}
