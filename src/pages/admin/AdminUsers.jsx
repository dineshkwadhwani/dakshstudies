import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../auth/AuthContext.jsx'
import { supabase } from '../../lib/supabase.js'
import { PageTitle } from './AdminSubjects.jsx'

function UserDetailsModal({ user, loading, error, onClose }) {
  useEffect(() => {
    const onKeyDown = event => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  const fields = user ? [
    ['Name', user.full_name || 'Not provided'],
    ['Email', user.email || 'Not provided'],
    ['Status', user.status || 'Not available'],
    ['Package', user.package_name || 'No package assigned'],
    ['Package status', user.package_status === 'expired' ? 'Package Expired' : user.package_status === 'active' ? 'Active' : 'No package assigned'],
    ['Registration date', formatDate(user.created_at)],
    ['Current package ends', user.package_ends_at ? formatDate(user.package_ends_at) : 'No package assigned'],
    ['Phone', user.phone || 'Not provided'],
    ['City', user.city || 'Not provided'],
  ] : []

  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/60 p-4" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <section className="card w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="user-details-title">
      <div className="flex items-start justify-between gap-4">
        <div><div className="text-xs font-mono uppercase text-ink/55">User details</div><h2 id="user-details-title" className="font-display font-extrabold text-2xl mt-1">{user?.full_name || 'User'}</h2></div>
        <button type="button" className="btn-secondary px-3 py-1.5" onClick={onClose} aria-label="Close user details">Close</button>
      </div>
      {loading && <div className="py-10 text-center text-ink/60" aria-live="polite">Loading user details…</div>}
      {error && <div className="mt-5 rounded-xl border-2 border-flame bg-flame/10 p-3 text-sm text-flame" role="alert">{error}</div>}
      {!loading && !error && user && <dl className="grid sm:grid-cols-2 gap-3 mt-6">
        {fields.map(([label, value]) => <div key={label} className="rounded-xl border-2 border-ink/15 bg-cream/40 p-3"><dt className="text-xs font-mono uppercase text-ink/55">{label}</dt><dd className={`mt-1 font-semibold break-words ${label === 'Status' ? 'capitalize' : ''}`}>{value}</dd></div>)}
      </dl>}
    </section>
  </div>
}

function formatDate(value) {
  if (!value) return 'Not available'
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function packageState(entitlement) {
  if (!entitlement) return 'none'
  const now = Date.now()
  const active = entitlement.status === 'active' && new Date(entitlement.starts_at).getTime() <= now && new Date(entitlement.ends_at).getTime() > now
  return active ? 'active' : 'expired'
}

export default function AdminUsers() {
  const { profile: me, session, startImpersonation } = useAuth()
  const [users, setUsers] = useState([])
  const [message, setMessage] = useState('')
  const [creating, setCreating] = useState(false)
  const [sendingFor, setSendingFor] = useState('')
  const [impersonatingFor, setImpersonatingFor] = useState('')
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [verificationFilter, setVerificationFilter] = useState('all')
  const [packageFilter, setPackageFilter] = useState('all')
  const [selectedUser, setSelectedUser] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState('')
  const [form, setForm] = useState({ fullName: '', email: '', password: '' })
  async function load() {
    const [{ data: profiles, error: profileError }, { data: entitlements, error: entitlementError }] = await Promise.all([
      supabase.from('profiles').select('id,email,email_verified,full_name,role,status,created_at,referral_code,referred_by_user_id,acquisition_source_code').order('created_at', { ascending: false }),
      supabase.from('student_entitlements').select('student_id,status,starts_at,ends_at,created_at,packages(name,code)').order('created_at', { ascending: false }),
    ])
    if (profileError || entitlementError) return setMessage((profileError || entitlementError).message)
    const latest = new Map()
    for (const entitlement of entitlements || []) if (!latest.has(entitlement.student_id)) latest.set(entitlement.student_id, entitlement)
    setUsers((profiles || []).map(user => {
      const entitlement = latest.get(user.id)
      return { ...user, entitlement, package_name: entitlement?.packages?.name || null, package_status: packageState(entitlement) }
    }))
  }
  useEffect(() => { load() }, [])
  async function openUserDetails(user) {
    setSelectedUser(user)
    setDetailsLoading(true)
    setDetailsError('')
    const { data, error } = await supabase.rpc('get_user_directory_details', { user_id_input: user.id }).single()
    if (error) setDetailsError(error.message)
    else setSelectedUser({ ...data, created_at: user.created_at, package_status: data.package_ends_at && new Date(data.package_ends_at).getTime() > Date.now() && data.entitlement_status === 'active' ? 'active' : data.package_ends_at ? 'expired' : 'none' })
    setDetailsLoading(false)
  }
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
  async function impersonate(user) {
    if (!window.confirm(`Continue as ${user.full_name || user.email}? You will see and use the product as this user.`)) return
    setImpersonatingFor(user.id); setMessage('')
    try {
      const response = await fetch('/api/impersonate', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ userId: user.id }) })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'Unable to impersonate user')
      await startImpersonation(body.tokenHash, user)
      window.location.assign('/dashboard')
    } catch (error) { setMessage(error.message); setImpersonatingFor('') }
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
  const filteredUsers = useMemo(() => {
    const term = search.trim().toLocaleLowerCase()
    return users.filter(user => {
      const referrer = users.find(item => item.id === user.referred_by_user_id)
      const searchable = [user.full_name, user.email, user.referral_code, user.acquisition_source_code, referrer?.full_name, referrer?.email, referrer?.referral_code]
        .filter(Boolean).join(' ').toLocaleLowerCase()
      return (!term || searchable.includes(term))
        && (me?.role !== 'account_manager' || user.role === 'student')
        && (roleFilter === 'all' || user.role === roleFilter)
        && (statusFilter === 'all' || user.status === statusFilter)
        && (packageFilter === 'all' || user.package_status === packageFilter)
        && (verificationFilter === 'all' || user.email_verified === (verificationFilter === 'verified'))
    })
  }, [users, search, roleFilter, statusFilter, verificationFilter, packageFilter, me?.role])
  const availableUserCount = me?.role === 'account_manager' ? users.filter(user => user.role === 'student').length : users.length
  const clearFilters = () => { setSearch(''); setRoleFilter('all'); setStatusFilter('all'); setVerificationFilter('all'); setPackageFilter('all') }
  return <div><PageTitle eyebrow="Platform accounts" title="Users" text={me?.role === 'super_admin' ? 'Create Account Managers and manage platform access.' : 'Search and view all students in the platform.'} />
    {message && <div className="card p-3 mb-4 bg-sky/20">{message}</div>}
    {me?.role === 'super_admin' && <form onSubmit={createManager} className="card p-5 mb-6"><h2 className="font-display font-extrabold text-lg">Create Account Manager</h2><p className="text-xs text-ink/60 mt-1 mb-3">The email is confirmed immediately. Give the manager their temporary password securely.</p><div className="grid sm:grid-cols-3 gap-3"><label><span className="text-xs font-mono uppercase">Full name</span><input required value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} /></label><label><span className="text-xs font-mono uppercase">Email</span><input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label><label><span className="text-xs font-mono uppercase">Temporary password</span><input required type="password" minLength="12" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></label></div><button disabled={creating} className="btn-primary mt-4">{creating ? 'Creating…' : 'Create Account Manager'}</button></form>}
    <section className="card p-4 mb-4" aria-label="Filter users">
      <div className={`grid ${me?.role === 'super_admin' ? 'sm:grid-cols-6' : 'sm:grid-cols-5'} gap-3 items-end`}>
        <label className="sm:col-span-2"><span className="text-xs font-mono uppercase text-ink/60">Search users or referrals</span><input type="search" className="form-control" placeholder="Name, email, referral or source…" value={search} onChange={event => setSearch(event.target.value)} /></label>
        {me?.role === 'super_admin' && <label><span className="text-xs font-mono uppercase text-ink/60">Role</span><select className="form-control" value={roleFilter} onChange={event => setRoleFilter(event.target.value)}><option value="all">All roles</option><option value="student">Students</option><option value="account_manager">Account Managers</option><option value="super_admin">SuperAdmins</option></select></label>}
        <label><span className="text-xs font-mono uppercase text-ink/60">Status</span><select className="form-control" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="all">All statuses</option><option value="active">Active</option><option value="deactivated">Deactivated</option></select></label>
        <label><span className="text-xs font-mono uppercase text-ink/60">Email</span><select className="form-control" value={verificationFilter} onChange={event => setVerificationFilter(event.target.value)}><option value="all">Any verification</option><option value="verified">Verified</option><option value="unverified">Unverified</option></select></label>
        <label><span className="text-xs font-mono uppercase text-ink/60">Package</span><select className="form-control" value={packageFilter} onChange={event => setPackageFilter(event.target.value)}><option value="all">All packages</option><option value="active">Active packages</option><option value="expired">Expired packages</option></select></label>
        <button type="button" className="btn-secondary py-3" onClick={clearFilters} disabled={!search && roleFilter === 'all' && statusFilter === 'all' && verificationFilter === 'all' && packageFilter === 'all'}>Clear</button>
      </div>
      <div className="text-xs text-ink/55 mt-3">Showing <strong>{filteredUsers.length}</strong> of <strong>{availableUserCount}</strong> users</div>
    </section>
    <div className="space-y-2">{filteredUsers.map(user => { const referralCount = users.filter(item => item.referred_by_user_id === user.id).length; const referrer = users.find(item => item.id === user.referred_by_user_id); return <div key={user.id} className="card p-4 flex flex-col sm:flex-row sm:items-center gap-3 cursor-pointer transition-transform hover:-translate-y-0.5" role="button" tabIndex="0" aria-label={`View details for ${user.full_name || user.email}`} onClick={() => openUserDetails(user)} onKeyDown={event => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); openUserDetails(user) } }}><div className="flex-1 min-w-0"><div className="font-bold truncate">{user.full_name || 'Unnamed user'}</div><div className="text-xs text-ink/60 truncate">{user.email} · {user.role.replace('_', ' ')}</div><div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-ink/55"><span>Code: <strong>{user.referral_code || '—'}</strong></span><span>Referrals: <strong>{referralCount}</strong></span><span>Source: <strong>{referrer?.full_name || user.acquisition_source_code || 'DIRECT'}</strong></span></div></div><div className="flex flex-wrap items-center gap-2"><span className={`chip text-[10px] ${user.email_verified ? 'bg-leaf/30' : 'bg-sun/40'}`}>{user.email_verified ? 'verified' : 'unverified'}</span><span className={`chip text-[10px] ${user.status === 'active' ? 'bg-leaf/30' : 'bg-flame/20'}`}>{user.status}</span>{user.package_status === 'expired' && <span className="chip text-[10px] bg-flame/20">Package Expired</span>}{me?.role === 'super_admin' && user.id !== me.id && <button disabled={Boolean(impersonatingFor)} className="btn-primary text-xs px-2 py-1" onClick={event => { event.stopPropagation(); impersonate(user) }}>{impersonatingFor === user.id ? 'Switching…' : 'Impersonate'}</button>}{me?.role === 'super_admin' && <button disabled={Boolean(sendingFor)} className="btn-secondary text-xs px-2 py-1" onClick={event => { event.stopPropagation(); sendAuthEmail(user) }}>{sendingFor === user.id ? 'Sending…' : 'Send verification/reset email'}</button>}{me?.role === 'super_admin' && user.id !== me.id && <button className="btn-secondary text-xs px-2 py-1" onClick={event => { event.stopPropagation(); toggle(user) }}>{user.status === 'active' ? 'Deactivate' : 'Activate'}</button>}</div></div>})}{!filteredUsers.length && <div className="card p-6 text-center text-ink/60">No users match the selected filters.</div>}</div>
    {selectedUser && <UserDetailsModal user={selectedUser} loading={detailsLoading} error={detailsError} onClose={() => { setSelectedUser(null); setDetailsError('') }} />}
  </div>
}
