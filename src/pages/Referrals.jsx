import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'
import ReferralShare from '../components/ReferralShare.jsx'

export default function Referrals() {
  const { profile } = useAuth()
  const [referrals, setReferrals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => { supabase.rpc('get_my_referrals').then(({ data, error: loadError }) => { setReferrals(data || []); setError(loadError?.message || ''); setLoading(false) }) }, [])
  return <div>
    <div className="mb-5"><div className="font-mono text-xs uppercase tracking-widest text-ink/60">Share and grow</div><h1 className="heading-display text-3xl">My referrals</h1><p className="text-ink/65 mt-1">People who created an account using your personal referral link.</p></div>
    <section className="card p-5 sm:p-6 bg-sun/15"><div className="mb-5"><div className="text-xs font-mono uppercase text-ink/55">Your referral code</div><div className="heading-display text-3xl mt-1">{profile?.referral_code}</div></div><ReferralShare code={profile?.referral_code} /></section>
    <section className="mt-6"><div className="flex items-center justify-between mb-3"><h2 className="heading-display text-xl">Referred users</h2><span className="chip bg-leaf/25">{referrals.length} total</span></div>{loading ? <div className="card p-5">Loading referrals…</div> : error ? <div className="card p-5 bg-flame/15">{error}</div> : referrals.length === 0 ? <div className="card p-6 text-center"><div className="text-4xl">🔗</div><div className="font-display font-bold mt-3">No referrals yet</div><p className="text-sm text-ink/55 mt-1">Share your link to invite someone to Tenth Ki Padhai.</p></div> : <div className="space-y-2">{referrals.map(item => <div className="card p-4 flex items-center gap-3" key={item.user_id}><div className="w-10 h-10 rounded-xl border-2 border-ink bg-leaf/25 grid place-items-center font-bold">{initials(item.full_name)}</div><div><div className="font-bold">{item.full_name || 'New student'}</div><div className="text-xs text-ink/55">Joined {new Date(item.joined_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div></div></div>)}</div>}</section>
  </div>
}

function initials(name = '') { return name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || '?' }
