import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { getTotalChapterCount } from '../hooks/useData.js'
import { todayISO, formatLong } from '../utils/dates.js'
import { useAuth } from '../auth/AuthContext.jsx'
import { planProgress, useStudyPlan } from '../hooks/useStudyPlan.js'
import { useQuizAttempts } from '../hooks/useQuizAttempts.js'
import { useQuizAllowance } from '../hooks/useQuizAllowance.js'

export default function Home() {
  const { profile, session } = useAuth()
  const [entitlement, setEntitlement] = useState(null)
  const [packages, setPackages] = useState([])
  const [upgradeError, setUpgradeError] = useState('')
  const [upgrading, setUpgrading] = useState(false)
  const today = todayISO()
  const { attempts, stats: quizStats } = useQuizAttempts()
  const { allowance } = useQuizAllowance()
  const { plan, loading: planLoading } = useStudyPlan()
  const progress = planProgress(plan)
  const todayTasks = progress.tasks.filter(task => task.due_on === today)

  const totalChapters = getTotalChapterCount()
  const quizzesTaken = allowance?.used ?? quizStats.totalAttempts
  const totalQuizzes = allowance?.limit ?? totalChapters
  const avgScore = quizStats.average

  useEffect(() => {
    let active = true
    async function loadPackageState() {
      if (!supabase || !session?.user) return
      const { data: entitlements } = await supabase.from('student_entitlements').select('status,ends_at,created_at,packages(code,name)').eq('student_id', session.user.id).order('created_at', { ascending: false }).limit(1)
      const { data: year } = await supabase.from('academic_years').select('id').eq('is_current', true).maybeSingle()
      const { data: available } = year ? await supabase.from('packages').select('code,name,price_paise,currency').eq('academic_year_id', year.id).eq('status', 'published').eq('sale_enabled', true).order('rank') : { data: [] }
      if (active) { setEntitlement(entitlements?.[0] || null); setPackages((available || []).filter(pkg => pkg.price_paise > 0)) }
    }
    loadPackageState()
    return () => { active = false }
  }, [session?.user?.id])
  const trialPackage = entitlement?.packages?.code === 'FREE'
  const packageExpired = trialPackage && (entitlement.status !== 'active' || new Date(entitlement.ends_at).getTime() <= Date.now())

  // Streak: number of consecutive past+today days marked done
  const streak = computeStreak(progress.tasks, today)

  return (
    <div>
      {trialPackage && <UpgradePrompt expired={packageExpired} packages={packages} session={session} upgrading={upgrading} setUpgrading={setUpgrading} error={upgradeError} setError={setUpgradeError} />}
      {/* Hero banner */}
      <div className="relative pt-2 pb-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-ink/60">
              {progress.complete ? 'You did it!' : plan?.status === 'active' ? 'Keep going' : 'Start planning'}
            </div>
            <h1 className="font-display font-extrabold text-3xl sm:text-4xl leading-tight mt-1">
              Hi, {profile?.full_name?.split(' ')[0] || 'Student'} 👋
            </h1>
            <div className="text-ink/70 mt-1 text-sm">
              {formatLong(today)}
            </div>
          </div>
        </div>
      </div>

      {/* Today's plan */}
      {!planLoading && !plan && <SchedulePrompt title="Create your schedule" text="Choose your dates and add the chapters you want to study." />}
      {!planLoading && plan?.status === 'draft' && <SchedulePrompt title="Finish your schedule" text={`${progress.total} task${progress.total === 1 ? '' : 's'} added · Review and activate your plan.`} />}
      {!planLoading && plan?.status === 'active' && (
        <section className="card p-5 sm:p-6 mt-2 relative overflow-hidden">
          <div className="absolute -top-12 -right-10 w-44 h-44 rounded-full bg-sun/30 blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <span className={`chip ${progress.complete ? 'bg-leaf' : 'bg-sun'}`}>📚 {progress.complete ? 'Schedule complete' : 'Active schedule'}</span>
            </div>

            <h2 className="font-display font-extrabold text-xl mb-3">{progress.complete ? 'All tasks completed' : "Today's plan"}</h2>
            {!progress.complete && todayTasks.length === 0 && <div className="rounded-2xl border-2 border-ink bg-paper p-4 text-sm">No tasks scheduled today—enjoy your rest day or review your plan.</div>}
            {todayTasks.map(task => <PlanItem key={task.id} task={task} />)}
          </div>
        </section>
      )}

      {/* Stats row */}
      <section className="grid grid-cols-3 gap-3 mt-5">
        <StatCard icon="🎯" label="Quiz attempts" value={quizzesTaken} max={totalQuizzes} color="bg-sea/20" />
        <StatCard icon="🔥" label="Streak" value={streak} suffix={streak === 1 ? 'day' : 'days'} color="bg-flame/20" />
        <StatCard icon="⚡" label="Avg score" value={`${avgScore}%`} color="bg-leaf/20" />
      </section>

      {/* Quick actions */}
      <section className="mt-6">
        <h3 className="font-display font-extrabold text-lg mb-3">Jump in</h3>
        <div className="grid grid-cols-2 gap-3">
          <QuickCard to="/chapters" icon="📚" title="Browse chapters" subtitle="50 chapters · MCQs & summaries" bg="bg-sky/30" />
          <QuickCard to="/schedule" icon="📅" title={plan ? 'Study plan' : 'Create a schedule'} subtitle={plan ? `${progress.completed}/${progress.total} tasks completed` : 'Build your personal plan'} bg="bg-violet/25" />
          <QuickCard to="/tests" icon="📝" title="Mock tests" subtitle="4 tests, 80 marks each" bg="bg-flame/20" />
          <QuickCard to="/progress" icon="📊" title="Your stats" subtitle="See your progress" bg="bg-leaf/25" />
        </div>
      </section>

      {/* Recently attempted */}
      <RecentActivity attempts={attempts} />
    </div>
  )
}

function UpgradePrompt({ expired, packages, session, upgrading, setUpgrading, error, setError }) {
  const [selected, setSelected] = useState(packages[0]?.code || '')
  useEffect(() => { if (!selected && packages[0]) setSelected(packages[0].code) }, [packages, selected])
  async function startUpgrade() {
    setUpgrading(true); setError('')
    try {
      const response = await fetch('/api/upgrade-payment', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ packageCode: selected }) })
      const body = await response.json().catch(() => ({}))
      if (!response.ok || !body.payment) throw new Error(body.error || 'Payment could not be started.')
      if (!window.Razorpay) await new Promise((resolve, reject) => { const script = document.createElement('script'); script.src = 'https://checkout.razorpay.com/v1/checkout.js'; script.onload = resolve; script.onerror = reject; document.body.appendChild(script) })
      const checkout = new window.Razorpay({ key: body.payment.keyId, amount: body.payment.amount, currency: body.payment.currency, order_id: body.payment.orderId, name: 'Tenth Ki Padhai', description: 'Package upgrade', prefill: { name: session.user.user_metadata?.full_name, email: session.user.email }, handler: async result => { const verify = await fetch('/api/verify-payment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ transactionId: body.payment.transactionId, razorpayOrderId: result.razorpay_order_id, razorpayPaymentId: result.razorpay_payment_id, razorpaySignature: result.razorpay_signature }) }); if (!verify.ok) throw new Error('Payment verification did not succeed.'); window.location.reload() } })
      checkout.open()
    } catch (upgradeFailure) { setError(upgradeFailure.message || 'Payment could not be started.') } finally { setUpgrading(false) }
  }
  return <section className={`card p-4 mt-2 ${expired ? 'bg-flame/10 border-flame/50' : 'bg-sun/10 border-ink/20'}`}><div className="font-mono text-[11px] uppercase tracking-widest text-ink/55">{expired ? 'Trial ended' : 'Free trial'}</div><h2 className="font-display font-bold text-lg mt-1">{expired ? 'Your trial package has expired' : 'Explore a paid package'}</h2><p className="text-sm text-ink/65 mt-1">{expired ? 'Upgrade to continue learning, taking quizzes and using mock tests.' : 'Upgrade whenever you are ready for full access to your study plan.'}</p><div className="flex flex-col sm:flex-row gap-2 mt-3"><select className="form-control flex-1" value={selected} onChange={event => setSelected(event.target.value)} disabled={upgrading}>{packages.map(pkg => <option value={pkg.code} key={pkg.code}>{pkg.name} — ₹{Math.round(pkg.price_paise / 100)}</option>)}</select><button type="button" className="btn-primary" disabled={upgrading || !selected} onClick={startUpgrade}>{upgrading ? 'Opening payment…' : 'View upgrade options →'}</button></div>{!packages.length && <p className="text-sm mt-2">No paid packages are currently available.</p>}{error && <p className="text-sm text-flame font-bold mt-2">{error}</p>}</section>
}

function SchedulePrompt({ title, text }) {
  return <section className="card p-5 sm:p-6 mt-2 bg-violet/20"><span className="chip bg-sun">📅 No active schedule</span><h2 className="font-display font-extrabold text-xl mt-4">{title}</h2><p className="text-sm text-ink/70 mt-1">{text}</p><Link to="/schedule" className="btn-primary inline-flex mt-4">{title} →</Link></section>
}

function PlanItem({ task }) {
  const chapter = task.chapters
  const subject = chapter?.subjects
  if (task.task_type === 'mock_test') return <Link to="/tests" className="block mt-2 p-4 rounded-2xl border-2 border-ink bg-flame/15 tappable"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl border-2 border-ink grid place-items-center">📝</div><div className="flex-1"><div className="text-xs font-mono uppercase text-ink/60">Mock test</div><div className="font-display font-bold">{task.assessments?.title}</div></div><ArrowIcon /></div></Link>
  return (
    <Link
      to={`/chapter/${subject.slug}/${chapter.legacy_id || chapter.slug}`}
      className="block mt-2 p-4 rounded-2xl border-2 border-ink bg-cream tappable hover:shadow-pop transition-shadow"
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl border-2 border-ink grid place-items-center text-xl"
          style={{ backgroundColor: subject.color }}
        >
          {subject.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-mono uppercase tracking-wider text-ink/60">
            {subject.name} · {task.task_type.replace('_', ' ')}
          </div>
          <div className="font-display font-bold truncate">{chapter.title}</div>
        </div>
        <ArrowIcon />
      </div>
    </Link>
  )
}

function StatCard({ icon, label, value, suffix, max, color }) {
  return (
    <div className={`card p-3 ${color || ''}`}>
      <div className="text-xl">{icon}</div>
      <div className="font-display font-extrabold text-2xl leading-none mt-1">
        {value}{max != null && <span className="text-sm font-bold text-ink/50">/{max}</span>}
        {suffix && <span className="text-xs font-bold text-ink/60 ml-1">{suffix}</span>}
      </div>
      <div className="text-[11px] font-mono uppercase tracking-wider text-ink/60 mt-0.5">
        {label}
      </div>
    </div>
  )
}

function QuickCard({ to, icon, title, subtitle, bg }) {
  return (
    <Link to={to} className={`card-pop p-4 tappable ${bg}`}>
      <div className="text-3xl">{icon}</div>
      <div className="font-display font-bold mt-2 leading-tight">{title}</div>
      <div className="text-xs text-ink/60 mt-0.5">{subtitle}</div>
    </Link>
  )
}

function RecentActivity({ attempts }) {
  const recent = attempts.slice(0, 3)

  if (recent.length === 0) return null

  return (
    <section className="mt-6 mb-2">
      <h3 className="font-display font-extrabold text-lg mb-3">Recent quizzes</h3>
      <div className="space-y-2">
        {recent.map(attempt => {
          const chapter = attempt.assessments?.chapters
          const subject = chapter?.subjects
          if (!chapter || !subject) return null
          const pct = Math.round(Number(attempt.percentage))
          const colorClass = pct >= 75 ? 'bg-leaf/30' : pct >= 50 ? 'bg-sun/30' : 'bg-flame/20'
          return (
            <Link
              key={attempt.id}
              to={`/results/${attempt.id}`}
              className={`card p-3 tappable flex items-center gap-3 ${colorClass}`}
            >
              <div
                className="w-9 h-9 rounded-lg border-2 border-ink grid place-items-center text-sm"
                style={{ backgroundColor: subject.color }}
              >
                {subject.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm truncate">{chapter.title}</div>
                <div className="text-xs text-ink/60">{attempt.mode === 'practice' ? 'Practice quiz' : 'MCQ test'} · {new Date(attempt.submitted_at).toLocaleDateString()}</div>
              </div>
              <div className="font-display font-extrabold text-xl">{pct}%</div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

function computeStreak(tasks, today) {
  const completedDates = new Set(tasks.filter(task => task.status === 'completed').map(task => task.due_on))
  let streak = 0
  for (let i = 0; i < 60; i++) {
    const d = new Date(`${today}T00:00:00`)
    d.setDate(d.getDate() - i)
    const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    if (completedDates.has(iso)) streak++
    else if (i > 0) break
  }
  return streak
}

function ArrowIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}
