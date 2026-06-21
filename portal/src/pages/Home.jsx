import { Link } from 'react-router-dom'
import {
  mcqs, useQuizScores, useScheduleDone, getTotalChapterCount,
  findChapterById, isDayComplete, useActiveSchedule,
} from '../hooks/useData.js'
import { todayISO, formatLong, parseISO, daysBetween } from '../utils/dates.js'

export default function Home() {
  const today = todayISO()
  const scores = useQuizScores()
  const [done] = useScheduleDone()
  const schedule = useActiveSchedule()

  const todayEntry = schedule.find(s => s.date === today)
  const start = schedule[0]?.date
  const end   = schedule[schedule.length - 1]?.date

  let bannerEntry = todayEntry
  let dayLabel = 'Today'
  let beforeStart = false
  let afterEnd = false

  if (!todayEntry && start && end) {
    if (daysBetween(start, today) < 0) {
      bannerEntry = schedule[0]
      dayLabel = 'Day 1 starts soon'
      beforeStart = true
    } else if (daysBetween(end, today) > 0) {
      bannerEntry = schedule[schedule.length - 1]
      dayLabel = 'Schedule complete'
      afterEnd = true
    }
  }

  const totalChapters = getTotalChapterCount()
  const quizzesTaken = Object.keys(scores).length
  const avgScore = quizzesTaken > 0
    ? Math.round(Object.values(scores).reduce((a, s) => a + (s.best || 0), 0) / quizzesTaken)
    : 0

  const streak = computeStreak(done, today, schedule)

  return (
    <div>
      {/* Hero */}
      <div className="relative pt-2 pb-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-ink/60">
              {beforeStart ? 'Get ready' : afterEnd ? 'You did it!' : `Day ${todayEntry?.day || ''}`}
            </div>
            <h1 className="font-display font-extrabold text-3xl sm:text-4xl leading-tight mt-1">
              Hi, Daksh 👋
            </h1>
            <div className="text-ink/70 mt-1 text-sm">{formatLong(today)}</div>
          </div>
          <div className="w-14 h-14 rounded-2xl border-2 border-ink bg-sun shadow-pop grid place-items-center font-display font-extrabold text-2xl">
            D
          </div>
        </div>
      </div>

      {/* Today's plan */}
      {bannerEntry && (
        <section className="card p-5 sm:p-6 mt-2 relative overflow-hidden">
          <div className="absolute -top-12 -right-10 w-44 h-44 rounded-full bg-sun/30 blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <span className="chip bg-sun">📚 {dayLabel}</span>
            </div>
            <h2 className="font-display font-extrabold text-xl mb-3">Today's plan</h2>
            <PlanItem
              title={bannerEntry.primary.title}
              subjectKey={bannerEntry.primary.subject}
              chapterId={bannerEntry.primary.id}
            />
            {bannerEntry.secondary ? (
              bannerEntry.secondary.type === 'chapter' ? (
                <PlanItem
                  title={bannerEntry.secondary.title}
                  subjectKey={bannerEntry.secondary.subject}
                  chapterId={bannerEntry.secondary.id}
                />
              ) : (
                <Link
                  to="/tests"
                  className="block mt-2 p-4 rounded-2xl bg-flame/15 border-2 border-ink tappable"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-flame border-2 border-ink grid place-items-center">📝</div>
                    <div className="flex-1">
                      <div className="font-display font-bold">Test Day!</div>
                      <div className="text-sm text-ink/70">{bannerEntry.secondary.title}</div>
                    </div>
                    <ArrowIcon />
                  </div>
                </Link>
              )
            ) : null}
          </div>
        </section>
      )}

      {/* Stats row */}
      <section className="grid grid-cols-3 gap-3 mt-5">
        <StatCard icon="🎯" label="Quizzes" value={quizzesTaken} max={totalChapters} color="bg-sea/20" />
        <StatCard icon="🔥" label="Streak" value={streak} suffix={streak === 1 ? 'day' : 'days'} color="bg-flame/20" />
        <StatCard icon="⚡" label="Avg score" value={`${avgScore}%`} color="bg-leaf/20" />
      </section>

      {/* Quick actions */}
      <section className="mt-6">
        <h3 className="font-display font-extrabold text-lg mb-3">Jump in</h3>
        <div className="grid grid-cols-2 gap-3">
          <QuickCard to="/chapters" icon="📚" title="Browse chapters" subtitle="50 chapters · MCQs & summaries" bg="bg-sky/30" />
          <QuickCard to="/schedule" icon="📅" title="Study plan" subtitle={`${schedule.length}-day schedule`} bg="bg-violet/25" />
          <QuickCard to="/tests" icon="📝" title="Mock tests" subtitle="Practice tests" bg="bg-flame/20" />
          <QuickCard to="/progress" icon="📊" title="Your stats" subtitle="See your progress" bg="bg-leaf/25" />
        </div>
      </section>

      <RecentActivity scores={scores} />
    </div>
  )
}

function PlanItem({ title, subjectKey, chapterId }) {
  const subject = mcqs.subjects[subjectKey]
  return (
    <Link
      to={`/chapter/${subjectKey}/${chapterId}`}
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
            {subject.parent ? `${subject.parent} · ${subject.name}` : subject.name}
          </div>
          <div className="font-display font-bold truncate">{title}</div>
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
      <div className="text-[11px] font-mono uppercase tracking-wider text-ink/60 mt-0.5">{label}</div>
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

function RecentActivity({ scores }) {
  const recent = Object.entries(scores)
    .filter(([_, v]) => v.last)
    .sort((a, b) => new Date(b[1].last.date) - new Date(a[1].last.date))
    .slice(0, 3)
  if (recent.length === 0) return null
  return (
    <section className="mt-6 mb-2">
      <h3 className="font-display font-extrabold text-lg mb-3">Recent quizzes</h3>
      <div className="space-y-2">
        {recent.map(([chapterId, info]) => {
          const found = findChapterById(chapterId)
          if (!found) return null
          const { subjectKey, subject, chapter } = found
          const pct = info.last.percent
          const colorClass = pct >= 75 ? 'bg-leaf/30' : pct >= 50 ? 'bg-sun/30' : 'bg-flame/20'
          return (
            <Link
              key={chapterId}
              to={`/chapter/${subjectKey}/${chapterId}`}
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
                <div className="text-xs text-ink/60">Best: {info.best}% · Last: {pct}%</div>
              </div>
              <div className="font-display font-extrabold text-xl">{pct}%</div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

function computeStreak(done, today, schedule) {
  let streak = 0
  for (let i = 0; i < 90; i++) {
    const d = parseISO(today)
    d.setDate(d.getDate() - i)
    const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    const entry = schedule.find(s => s.date === iso)
    if (!entry) break
    if (isDayComplete(done, entry)) {
      streak++
    } else {
      if (i === 0) continue
      break
    }
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
