import { Link } from 'react-router-dom'
import { schedule, mcqs, useScheduleDone, findChapterById } from '../hooks/useData.js'
import { formatShort, todayISO, isToday, isPast, isFuture } from '../utils/dates.js'
import { useEffect, useRef } from 'react'

export default function Schedule() {
  const [done, setDone] = useScheduleDone()
  const todayRef = useRef(null)
  const today = todayISO()

  useEffect(() => {
    // Scroll to today's row on mount
    if (todayRef.current) {
      todayRef.current.scrollIntoView({ behavior: 'auto', block: 'center' })
    }
  }, [])

  const toggle = (day) => {
    setDone(prev => ({ ...prev, [day]: !prev[day] }))
  }

  const completed = Object.values(done).filter(Boolean).length

  return (
    <div>
      <div className="flex items-end justify-between mb-4">
        <div>
          <div className="font-mono text-xs uppercase tracking-widest text-ink/60">30-day plan</div>
          <h1 className="heading-display text-3xl">Schedule</h1>
        </div>
        <div className="text-right">
          <div className="font-display font-extrabold text-3xl">{completed}<span className="text-base text-ink/50">/30</span></div>
          <div className="text-xs font-mono uppercase tracking-wider text-ink/60">days done</div>
        </div>
      </div>

      <div className="card p-3 mb-4 bg-sky/20 text-sm">
        <strong className="font-display">Tip:</strong> Tap a day to mark it complete. Check off both tasks before sleeping.
      </div>

      <div className="space-y-2">
        {schedule.map(entry => (
          <div ref={isToday(entry.date) ? todayRef : null} key={entry.day}>
            <ScheduleRow
              entry={entry}
              done={!!done[entry.day]}
              onToggle={() => toggle(entry.day)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

function ScheduleRow({ entry, done, onToggle }) {
  const today = isToday(entry.date)
  const past = isPast(entry.date)
  const future = isFuture(entry.date)

  let bgClass = 'bg-paper'
  if (today) bgClass = 'bg-sun/30'
  else if (done) bgClass = 'bg-leaf/15'
  else if (past) bgClass = 'bg-paper opacity-70'

  return (
    <div className={`card p-3 ${bgClass} ${today ? 'ring-2 ring-sun ring-offset-2 ring-offset-cream' : ''}`}>
      <div className="flex items-start gap-3">
        {/* Day badge */}
        <div className="flex flex-col items-center">
          <button
            onClick={onToggle}
            className={`w-10 h-10 rounded-xl border-2 border-ink font-display font-extrabold transition-all tappable ${done ? 'bg-leaf shadow-pop' : 'bg-paper'}`}
            aria-label={done ? 'Mark incomplete' : 'Mark complete'}
          >
            {done ? '✓' : entry.day}
          </button>
          <div className="text-[10px] font-mono mt-1 text-ink/60 whitespace-nowrap">
            {formatShort(entry.date).split(',')[1]}
          </div>
        </div>

        {/* Items */}
        <div className="flex-1 min-w-0 space-y-2">
          <ScheduleItem item={entry.primary} />
          {entry.secondary.type === 'chapter' ? (
            <ScheduleItem item={entry.secondary} />
          ) : (
            <Link
              to="/tests"
              className="flex items-center gap-2 p-2 rounded-xl bg-flame/15 border-2 border-ink"
            >
              <span className="text-base">📝</span>
              <span className="font-bold text-sm">
                Test {entry.secondary.testNumber}
                {entry.secondary.isCumulative && ' (Cumulative)'}
              </span>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

function ScheduleItem({ item }) {
  const subject = mcqs.subjects[item.subject]
  return (
    <Link
      to={`/chapter/${item.subject}/${item.id}`}
      className="flex items-center gap-2 p-2 rounded-xl bg-paper border-2 border-ink hover:bg-cream transition-colors"
    >
      <div
        className="w-8 h-8 rounded-lg border-2 border-ink grid place-items-center text-base shrink-0"
        style={{ backgroundColor: subject.color }}
      >
        {subject.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-mono uppercase tracking-wider text-ink/60 leading-none mb-0.5">
          {subject.parent ? `${subject.parent} · ${subject.name}` : subject.name}
        </div>
        <div className="font-bold text-sm leading-tight truncate">{item.title}</div>
      </div>
    </Link>
  )
}
