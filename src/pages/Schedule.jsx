import { Link } from 'react-router-dom'
import { schedule, mcqs, useScheduleDone, toggleScheduleSlot, isDayComplete, getScheduleSummary } from '../hooks/useData.js'
import { formatShort, todayISO, isToday, isPast, isFuture } from '../utils/dates.js'
import { useEffect, useRef } from 'react'

export default function Schedule() {
  const [done] = useScheduleDone()
  const todayRef = useRef(null)

  useEffect(() => {
    if (todayRef.current) {
      todayRef.current.scrollIntoView({ behavior: 'auto', block: 'center' })
    }
  }, [])

  const summary = getScheduleSummary(done)

  return (
    <div>
      <div className="flex items-end justify-between mb-4">
        <div>
          <div className="font-mono text-xs uppercase tracking-widest text-ink/60">30-day plan</div>
          <h1 className="heading-display text-3xl">Schedule</h1>
        </div>
        <div className="text-right">
          <div className="font-display font-extrabold text-3xl">{summary.daysFullyDone}<span className="text-base text-ink/50">/30</span></div>
          <div className="text-xs font-mono uppercase tracking-wider text-ink/60">days done</div>
        </div>
      </div>

      <div className="card p-3 mb-4 bg-sky/20 text-sm">
        <strong className="font-display">Tip:</strong> Tap each task as you finish it. Done one subject but not the other? No problem — tick only what you did.
      </div>

      <div className="space-y-2">
        {schedule.map(entry => (
          <div ref={isToday(entry.date) ? todayRef : null} key={entry.day}>
            <ScheduleRow
              entry={entry}
              slots={done[entry.day] || { primary: false, secondary: false }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

function ScheduleRow({ entry, slots }) {
  const today = isToday(entry.date)
  const past = isPast(entry.date)
  const complete = isDayComplete({ [entry.day]: slots }, entry)

  let bgClass = 'bg-paper'
  if (today) bgClass = 'bg-sun/30'
  else if (complete) bgClass = 'bg-leaf/15'
  else if (past) bgClass = 'bg-paper opacity-80'

  // Status badge for the day number
  let badgeBg = 'bg-paper'
  let badgeContent = entry.day
  if (complete) {
    badgeBg = 'bg-leaf shadow-pop'
    badgeContent = '✓'
  } else if (slots.primary || slots.secondary) {
    badgeBg = 'bg-sun'   // half-done
  }

  return (
    <div className={`card p-3 ${bgClass} ${today ? 'ring-2 ring-sun ring-offset-2 ring-offset-cream' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center">
          <div
            className={`w-10 h-10 rounded-xl border-2 border-ink font-display font-extrabold transition-all grid place-items-center ${badgeBg}`}
            aria-label="Day status"
          >
            {badgeContent}
          </div>
          <div className="text-[10px] font-mono mt-1 text-ink/60 whitespace-nowrap">
            {formatShort(entry.date).split(',')[1]}
          </div>
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <ScheduleItemRow
            item={entry.primary}
            checked={!!slots.primary}
            onToggle={() => toggleScheduleSlot(entry.day, 'primary')}
          />
          {entry.secondary.type === 'chapter' ? (
            <ScheduleItemRow
              item={entry.secondary}
              checked={!!slots.secondary}
              onToggle={() => toggleScheduleSlot(entry.day, 'secondary')}
            />
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

function ScheduleItemRow({ item, checked, onToggle }) {
  const subject = mcqs.subjects[item.subject]
  return (
    <div className={`flex items-center gap-2 p-2 rounded-xl border-2 border-ink transition-colors ${checked ? 'bg-leaf/20' : 'bg-paper'}`}>
      {/* Checkbox */}
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle() }}
        className={`w-7 h-7 shrink-0 rounded-lg border-2 border-ink grid place-items-center transition-all tappable ${checked ? 'bg-leaf shadow-[2px_2px_0_0_#0F0E17]' : 'bg-paper hover:bg-cream'}`}
        aria-label={checked ? 'Mark not done' : 'Mark done'}
      >
        {checked && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12l5 5L20 7" />
          </svg>
        )}
      </button>

      {/* Subject icon + title (link) */}
      <Link
        to={`/chapter/${item.subject}/${item.id}`}
        className="flex items-center gap-2 flex-1 min-w-0"
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
          <div className={`font-bold text-sm leading-tight truncate ${checked ? 'line-through text-ink/60' : ''}`}>
            {item.title}
          </div>
        </div>
      </Link>
    </div>
  )
}
