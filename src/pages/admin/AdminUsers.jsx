import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/AuthContext.jsx'
import { supabase } from '../../lib/supabase.js'
import { PageTitle } from './AdminSubjects.jsx'

export default function AdminUsers() {
  const { profile: me, session } = useAuth()
  const [users, setUsers] = useState([])
  const [message, setMessage] = useState('')
  const [creating, setCreating] = useState(false)
  const [sendingFor, setSendingFor] = useState('')
  const [form, setForm] = useState({ fullName: '', email: '', password: '' })
  async function load() { const { data, error } = await supabase.from('profiles').select('id,email,full_name,role,status,created_at,referral_code,referred_by_user_id,acquisition_source_code').order('created_at', { ascending: false }); if (error) setMessage(error.message); else setUsers(data || []) }
  useEffect(() => { load() }, [])
  async function toggle(user) { const status = user.status === 'active' ? 'deactivated' : 'active'; const { error } = await supabase.from('profiles').update({ status }).eq('id', user.id); if (error) setMessage(error.message); else load() }
  async function sendAuthEmail(user) {
    setSendingFor(user.id); setMessage('')
    try {
      const response = await fetch('/api/user-auth-email', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ userId: user.id }) })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'Unable to send email')
      setMessage(body.message)
    } catch (error) { setMessage(error.message) } finally { setSendingFor('') }
  }
  async function createManager(event) {
    event.preventDefault(); setCreating(true); setMessage('')
    try {
      const response = await fetch('/api/account-managers', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify(form) })
      const responseText = await response.text()
      let body = {}
      try { body = responseText ? JSON.parse(responseText) : {} } catch { body = { error: responseText } }
      if (!response.ok) throw new Error(body.error || 'Unable to create Account Manager')
      setForm({ fullName: '', email: '', password: '' }); setMessage('Account Manager created successfully. Share the temporary password securely.'); load()
    } catch (error) { setMessage(error.message) } finally { setCreating(false) }
  }
  return <div><PageTitle eyebrow="Platform accounts" title="Users" text="Create Account Managers and activate or deactivate platform access." />
    {message && <div className="card p-3 mb-4 bg-sky/20">{message}</div>}
    {me?.role === 'super_admin' && <form onSubmit={createManager} className="card p-5 mb-6"><h2 className="font-display font-extrabold text-lg">Create Account Manager</h2><p className="text-xs text-ink/60 mt-1 mb-3">The email is confirmed immediately. Give the manager their temporary password securely.</p><div className="grid sm:grid-cols-3 gap-3"><label><span className="text-xs font-mono uppercase">Full name</span><input required value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} /></label><label><span className="text-xs font-mono uppercase">Email</span><input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label><label><span className="text-xs font-mono uppercase">Temporary password</span><input required type="password" minLength="12" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></label></div><button disabled={creating} className="btn-primary mt-4">{creating ? 'Creating…' : 'Create Account Manager'}</button></form>}
    <div className="space-y-2">{users.map(user => { const referralCount = users.filter(item => item.referred_by_user_id === user.id).length; const referrer = users.find(item => item.id === user.referred_by_user_id); return <div key={user.id} className="card p-4 flex flex-col sm:flex-row sm:items-center gap-3"><div className="flex-1 min-w-0"><div className="font-bold truncate">{user.full_name || 'Unnamed user'}</div><div className="text-xs text-ink/60 truncate">{user.email} · {user.role.replace('_', ' ')}</div><div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-ink/55"><span>Code: <strong>{user.referral_code || '—'}</strong></span><span>Referrals: <strong>{referralCount}</strong></span><span>Source: <strong>{referrer?.full_name || user.acquisition_source_code || 'DIRECT'}</strong></span></div></div><div className="flex flex-wrap items-center gap-2"><span className={`chip text-[10px] ${user.status === 'active' ? 'bg-leaf/30' : 'bg-flame/20'}`}>{user.status}</span>{me?.role === 'super_admin' && <button disabled={Boolean(sendingFor)} className="btn-secondary text-xs px-2 py-1" onClick={() => sendAuthEmail(user)}>{sendingFor === user.id ? 'Sending…' : 'Send verification/reset email'}</button>}{me?.role === 'super_admin' && user.id !== me.id && <button className="btn-secondary text-xs px-2 py-1" onClick={() => toggle(user)}>{user.status === 'active' ? 'Deactivate' : 'Activate'}</button>}</div></div>})}</div></div>
}
