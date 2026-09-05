import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { PageTitle } from './AdminSubjects.jsx'

const LABELS = {
  'user.created': 'User created',
  'user.logged_in': 'User logged in',
  'registration.failed': 'Registration failed',
  'account_manager.created': 'Account Manager created',
  'user.verification_email_resent': 'Verification email resent',
  'user.password_reset_email_sent': 'Password reset email sent',
  'user.impersonation_started': 'Impersonation started',
  'profile.updated': 'Profile updated',
  'quiz.attempt_finished': 'Quiz completed',
}

export default function AdminAudit() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  async function load(from = fromDate, to = toDate) {
    setLoading(true); setError('')
    let query = supabase.from('audit_events').select('id,event_type,outcome,actor_role,actor_user_id,affected_user_id,entity_type,metadata,created_at,actor:profiles!audit_events_actor_user_id_fkey(full_name,email),affected:profiles!audit_events_affected_user_id_fkey(full_name,email)').order('created_at', { ascending: false }).limit(250)
    if (from) query = query.gte('created_at', new Date(`${from}T00:00:00`).toISOString())
    if (to) query = query.lte('created_at', new Date(`${to}T23:59:59.999`).toISOString())
    const { data, error: loadError } = await query
    if (loadError) setError(loadError.message)
    else setEvents(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])
  const visible = useMemo(() => events.filter(event => filter === 'all' || (filter === 'failure' ? isFailure(event) : event.event_type.startsWith(filter))), [events, filter])
  const clearDates = () => { setFromDate(''); setToDate(''); load('', '') }

  return <div>
    <PageTitle eyebrow="Security and operations" title="Audit log" text="Major platform activity and client-reported operational failures. Most recent 250 events are shown." />
    <form className="card p-4 mb-4 grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto_auto] gap-3 items-end" onSubmit={event => { event.preventDefault(); load() }}>
      <label><span className="text-xs font-mono uppercase text-ink/60">From date</span><input className="form-control" type="date" value={fromDate} max={toDate || undefined} onChange={event => setFromDate(event.target.value)} /></label>
      <label><span className="text-xs font-mono uppercase text-ink/60">To date</span><input className="form-control" type="date" value={toDate} min={fromDate || undefined} onChange={event => setToDate(event.target.value)} /></label>
      <button className="btn-primary py-3" type="submit" disabled={loading}>Apply dates</button>
      <button className="btn-secondary py-3" type="button" onClick={clearDates} disabled={loading || (!fromDate && !toDate)}>Clear</button>
    </form>
    <div className="flex flex-wrap gap-2 mb-4">
      {[['all', 'All'], ['failure', 'Failures'], ['user.', 'Users'], ['registration.', 'Registration']].map(([value, label]) => <button key={value} type="button" onClick={() => setFilter(value)} className={`btn-secondary text-xs px-3 py-2 ${filter === value ? 'bg-sun' : ''}`}>{label}</button>)}
      <button type="button" onClick={() => load()} className="btn-secondary text-xs px-3 py-2 ml-auto">Refresh</button>
    </div>
    {error && <div className="card p-4 bg-flame/15 mb-4"><strong>Unable to load audit log:</strong> {error}</div>}
    {loading ? <div className="card p-6 text-center text-ink/60">Loading audit events…</div> : <div className="space-y-2">
      {visible.map(event => <AuditRow key={event.id} event={event} />)}
      {!visible.length && <div className="card p-6 text-center text-ink/60">No matching events.</div>}
    </div>}
  </div>
}

function AuditRow({ event }) {
  const person = event.actor?.full_name || event.actor?.email || event.affected?.full_name || event.affected?.email
  const detail = event.metadata?.message || event.metadata?.error_code || event.entity_type
  const failed = isFailure(event)
  return <article className={`card p-4 border-l-4 ${failed ? 'border-l-flame bg-flame/10' : 'border-l-leaf'}`}>
    <div className="flex gap-3 justify-between items-start"><div><div className={`font-bold ${failed ? 'text-flame' : ''}`}>{LABELS[event.event_type] || event.event_type.replace(/[._]/g, ' ')}</div><div className="text-xs text-ink/60 mt-1">{[person, detail].filter(Boolean).join(' · ') || 'Platform event'}</div></div><span className={`chip text-[10px] ${failed ? 'bg-flame text-paper' : 'bg-leaf/30'}`}>{event.outcome}</span></div>
    <time className="block text-[11px] font-mono text-ink/45 mt-2" dateTime={event.created_at}>{new Date(event.created_at).toLocaleString()}</time>
  </article>
}

function isFailure(event) {
  return event.outcome !== 'success' || /(?:failed|failure|error)/i.test(event.event_type)
}
