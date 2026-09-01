import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/AuthContext.jsx'
import { supabase } from '../../lib/supabase.js'
import { Link } from 'react-router-dom'

const initialStats = { students: 0, managers: 0, chapters: 0, assessments: 0, activeEntitlements: 0, payments: 0 }

export default function AdminDashboard() {
  const { profile } = useAuth()
  const [stats, setStats] = useState(initialStats)
  const [packages, setPackages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const isSuperAdmin = profile?.role === 'super_admin'

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError('')
      const queries = [
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'account_manager'),
        supabase.from('chapters').select('id', { count: 'exact', head: true }),
        supabase.from('assessments').select('id', { count: 'exact', head: true }),
        supabase.from('student_entitlements').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('payment_transactions').select('id', { count: 'exact', head: true }).eq('status', 'paid'),
        supabase.from('packages').select('id,code,name,price_paise,sale_enabled,fixed_expires_on,trial_days').order('rank'),
      ]
      const results = await Promise.all(queries)
      if (!active) return
      const firstError = results.find(result => result.error)?.error
      if (firstError) {
        setError(firstError.message)
      } else {
        setStats({
          students: results[0].count || 0,
          managers: results[1].count || 0,
          chapters: results[2].count || 0,
          assessments: results[3].count || 0,
          activeEntitlements: results[4].count || 0,
          payments: results[5].count || 0,
        })
        setPackages(results[6].data || [])
      }
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [])

  return (
    <div>
      <div className="mb-5">
        <div className="font-mono text-xs uppercase tracking-widest text-ink/60">Platform administration</div>
        <h1 className="heading-display text-3xl">{isSuperAdmin ? 'SuperAdmin dashboard' : 'Account Manager dashboard'}</h1>
        <p className="text-ink/65 mt-1">Live information from Supabase.</p>
      </div>

      {error && <div className="card p-4 bg-flame/15 mb-4"><strong>Unable to load dashboard:</strong> {error}</div>}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Stat label="Students" value={stats.students} loading={loading} color="bg-sky/25" />
        <Stat label="Account Managers" value={stats.managers} loading={loading} color="bg-violet/20" />
        <Stat label="Chapters" value={stats.chapters} loading={loading} color="bg-leaf/25" />
        <Stat label="Assessments" value={stats.assessments} loading={loading} color="bg-sun/30" />
        <Stat label="Active packages" value={stats.activeEntitlements} loading={loading} color="bg-sea/15" />
        <Stat label="Paid transactions" value={stats.payments} loading={loading} color="bg-flame/15" />
      </div>

      {isSuperAdmin && (
        <section className="mt-7">
          <h2 className="font-display font-extrabold text-xl mb-3">Manage platform</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-7">
            <AdminLink to="/admin/subjects" icon="📚" label="Subjects & chapters" />
            <AdminLink to="/admin/content" icon="⬆️" label="Upload content" />
            <AdminLink to="/admin/users" icon="👥" label="Manage users" />
            <AdminLink to="/admin/config" icon="⚙️" label="Package config" />
          </div>
          <h2 className="font-display font-extrabold text-xl mb-3">Packages</h2>
          <div className="grid sm:grid-cols-3 gap-3">
            {packages.map(pkg => (
              <div key={pkg.id} className="card p-4">
                <div className="flex justify-between gap-2 items-start">
                  <div className="font-display font-extrabold text-lg">{pkg.name}</div>
                  <span className={`chip text-[10px] px-2 py-0.5 ${pkg.sale_enabled ? 'bg-leaf/30' : 'bg-flame/20'}`}>{pkg.sale_enabled ? 'On sale' : 'Hidden'}</span>
                </div>
                <div className="heading-display text-3xl mt-3">₹{Math.round(pkg.price_paise / 100)}</div>
                <div className="text-xs text-ink/60 mt-1">{pkg.trial_days ? `${pkg.trial_days} days` : `Expires ${pkg.fixed_expires_on}`}</div>
              </div>
            ))}
          </div>
        </section>
      )}

    </div>
  )
}

function AdminLink({ to, icon, label }) {
  return <Link to={to} className="card-pop tappable p-4 text-center"><div className="text-3xl">{icon}</div><div className="font-display font-bold text-sm mt-2">{label}</div></Link>
}

function Stat({ label, value, color, loading }) {
  return <div className={`card p-4 ${color}`}>
    <div className="heading-display text-3xl">{loading ? '—' : value}</div>
    <div className="text-[11px] font-mono uppercase tracking-wider text-ink/60 mt-1">{label}</div>
  </div>
}
