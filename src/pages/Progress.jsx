import { Link } from 'react-router-dom'
import { useQuizAttempts } from '../hooks/useQuizAttempts.js'
import { planProgress, useStudyPlan } from '../hooks/useStudyPlan.js'

export default function Progress() {
  const { attempts, stats, loading, error } = useQuizAttempts()
  const { plan } = useStudyPlan()
  const schedule = planProgress(plan)
  const bySubject = aggregateBySubject(attempts)
  if (loading) return <div className="card p-8 text-center">Loading your progress…</div>

  return <div>
    <div className="mb-5"><div className="font-mono text-xs uppercase tracking-widest text-ink/60">Your reports</div><h1 className="heading-display text-3xl">Progress</h1><p className="text-sm text-ink/60 mt-1">Saved securely to your account.</p></div>
    {error && <div className="card p-3 bg-flame/20 mb-4">{error.message}</div>}
    <div className="grid grid-cols-2 gap-3 mb-6">
      <BigStat label="Schedule tasks" value={`${schedule.completed}/${schedule.total}`} sub="completed" color="bg-sun/30" />
      <BigStat label="Quiz attempts" value={stats.totalAttempts} sub={`${stats.chaptersAttempted} chapters`} color="bg-sea/20" />
      <BigStat label="Quiz average" value={`${stats.average}%`} sub="all attempts" color="bg-leaf/30" />
      <BigStat label="Plan status" value={!plan ? 'Not set' : schedule.complete ? 'Done' : plan.status === 'draft' ? 'Draft' : 'Active'} sub={plan?.name} color="bg-violet/20" />
    </div>

    <h2 className="font-display font-extrabold text-lg mb-2">Quiz performance by subject</h2>
    {!bySubject.length && <div className="card p-5 text-center text-ink/60">Complete your first quiz to see subject performance.</div>}
    <div className="space-y-2">{bySubject.map(item => <Link to={`/chapters/${item.subject.slug}`} key={item.subject.id} className="card p-3 flex items-center gap-3 tappable"><div className="w-10 h-10 rounded-xl border-2 border-ink grid place-items-center" style={{ backgroundColor: item.subject.color }}>{item.subject.emoji}</div><div className="flex-1"><div className="font-bold">{item.subject.name}</div><div className="text-xs text-ink/60">{item.attempts} attempt{item.attempts === 1 ? '' : 's'}</div><div className="h-2 mt-1 rounded-full bg-cream border border-ink overflow-hidden"><div className="h-full" style={{ width: `${item.average}%`, backgroundColor: item.subject.color }} /></div></div><div className="font-display font-extrabold text-xl">{item.average}%</div></Link>)}</div>

    <h2 className="font-display font-extrabold text-lg mt-6 mb-2">Recent attempts</h2>
    {!attempts.length && <div className="card p-5 text-center text-ink/60">No quiz attempts yet.</div>}
    <div className="space-y-2">{attempts.slice(0, 10).map(attempt => <AttemptRow key={attempt.id} attempt={attempt} />)}</div>
  </div>
}

function aggregateBySubject(attempts) {
  const groups = new Map()
  for (const attempt of attempts) {
    const subject = attempt.assessments?.chapters?.subjects
    if (!subject) continue
    const group = groups.get(subject.id) || { subject, attempts: 0, total: 0 }
    group.attempts += 1; group.total += Number(attempt.percentage || 0); groups.set(subject.id, group)
  }
  return [...groups.values()].map(group => ({ ...group, average: Math.round(group.total / group.attempts) }))
}

function AttemptRow({ attempt }) {
  const chapter = attempt.assessments?.chapters
  const subject = chapter?.subjects
  const percentage = Math.round(Number(attempt.percentage))
  return <Link to={`/results/${attempt.id}`} className="card-pop p-3 flex items-center gap-3"><div className={`w-12 h-12 rounded-xl border-2 border-ink grid place-items-center font-display font-extrabold ${percentage >= 75 ? 'bg-leaf' : percentage >= 50 ? 'bg-sun' : 'bg-flame/30'}`}>{percentage}%</div><div className="flex-1 min-w-0"><div className="font-bold truncate">{chapter?.title || attempt.assessments?.title}</div><div className="text-xs text-ink/60">{subject?.name} · {attempt.mode === 'practice' ? 'Practice' : 'MCQ test'} · {new Date(attempt.submitted_at).toLocaleDateString()}</div></div><div className="text-right"><div className="text-sm font-bold">{Number(attempt.score)}/{Number(attempt.maximum_score)}</div><div className="text-xs text-ink/50">View ›</div></div></Link>
}

function BigStat({ label, value, sub, color }) { return <div className={`card p-4 ${color}`}><div className="font-display font-extrabold text-3xl leading-none">{value}</div><div className="text-[11px] font-mono uppercase tracking-wider text-ink/60 mt-1">{label}</div>{sub && <div className="text-[10px] text-ink/60 truncate">{sub}</div>}</div> }
