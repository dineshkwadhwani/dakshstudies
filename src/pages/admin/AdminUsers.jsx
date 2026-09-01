import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/AuthContext.jsx'
import { supabase } from '../../lib/supabase.js'
import { PageTitle } from './AdminSubjects.jsx'

export default function AdminUsers() {
  const { profile: me, session } = useAuth()
  const [users, setUsers] = useState([])
  const [message, setMessage] = useState('')
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ fullName: '', email: '', password: '' })
  async function load() { const { data, error } = await supabase.from('profiles').select('id,email,full_name,role,status,created_at').order('created_at', { ascending: false }); if (error) setMessage(error.message); else setUsers(data || []) }
  useEffect(() => { load() }, [])
  async function toggle(user) { const status = user.status === 'active' ? 'deactivated' : 'active'; const { error } = await supabase.from('profiles').update({ status }).eq('id', user.id); if (error) setMessage(error.message); else load() }
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
    <div className="space-y-2">{users.map(user => <div key={user.id} className="card p-4 flex items-center gap-3"><div className="flex-1 min-w-0"><div className="font-bold truncate">{user.full_name || 'Unnamed user'}</div><div className="text-xs text-ink/60 truncate">{user.email} · {user.role.replace('_', ' ')}</div></div><span className={`chip text-[10px] ${user.status === 'active' ? 'bg-leaf/30' : 'bg-flame/20'}`}>{user.status}</span>{me?.role === 'super_admin' && user.id !== me.id && <button className="btn-secondary text-xs px-2 py-1" onClick={() => toggle(user)}>{user.status === 'active' ? 'Deactivate' : 'Activate'}</button>}</div>)}</div></div>
}
