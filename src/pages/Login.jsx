import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'

export default function Login() {
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (auth.user) return <Navigate to="/dashboard" replace />

  const submit = async (event) => {
    event.preventDefault()
    if (!supabase) return setError('Supabase is not configured.')
    setSubmitting(true)
    setError('')
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    setSubmitting(false)
    if (signInError) return setError(signInError.message)
    navigate(location.state?.from?.pathname || '/dashboard', { replace: true })
  }

  return <AuthShell title="Welcome back" subtitle="Log in to continue your study plan.">
    <form onSubmit={submit} className="space-y-4">
      <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
      <Field label="Password" type="password" value={password} onChange={setPassword} autoComplete="current-password" />
      {error && <div className="rounded-xl border-2 border-flame bg-flame/15 p-3 text-sm">{error}</div>}
      <button className="btn-primary w-full" disabled={submitting}>{submitting ? 'Logging in…' : 'Log in →'}</button>
      <div className="text-center text-sm text-ink/65">New here? <Link className="font-bold underline" to="/register">Create an account</Link></div>
    </form>
  </AuthShell>
}

export function AuthShell({ title, subtitle, children }) {
  return (
    <div className="min-h-screen grid place-items-center p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 mb-5">
          <img src="/tenthkipadhai_logo.jpeg" alt="Tenth Ki Padhai" className="w-12 h-12 rounded-xl border-2 border-ink object-cover" />
          <span className="font-display font-extrabold text-xl">Tenth Ki Padhai</span>
        </Link>
        <div className="card p-6">
          <h1 className="heading-display text-3xl">{title}</h1>
          <p className="text-ink/65 mt-1 mb-5">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  )
}

export function Field({ label, type = 'text', value, onChange, autoComplete, required = true }) {
  return <label className="block">
    <span className="text-xs font-mono uppercase tracking-wider text-ink/60">{label}</span>
    <input type={type} required={required} value={value} onChange={e => onChange(e.target.value)} autoComplete={autoComplete}
      className="w-full mt-1 px-4 py-3 rounded-xl border-2 border-ink bg-paper focus:outline-none focus:shadow-pop" />
  </label>
}
