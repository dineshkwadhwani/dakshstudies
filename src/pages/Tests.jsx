import { Link } from 'react-router-dom'
import { tests, useTestsAttempted } from '../hooks/useData.js'
import { formatShort, todayISO, isPast, isToday, isFuture } from '../utils/dates.js'

export default function Tests() {
  const [attempted, setAttempted] = useTestsAttempted()

  return (
    <div>
      <div className="mb-5">
        <div className="font-mono text-xs uppercase tracking-widest text-ink/60">CBSE pattern · 80 marks each</div>
        <h1 className="heading-display text-3xl">Mock Tests</h1>
        <p className="text-ink/70 mt-1">4 tests across the 30-day plan</p>
      </div>

      <div className="card p-3 mb-4 bg-sky/20 text-sm">
        <strong className="font-display">How it works:</strong> Each test has 3 papers (Maths, Science, Social Science). Open the QP, take it on paper, then check with the answer key.
      </div>

      <div className="space-y-3">
        {tests.map(t => {
          const past = isPast(t.date)
          const today = isToday(t.date)
          const isAttempted = !!attempted[t.number]
          const bg = today ? 'bg-sun/30' : isAttempted ? 'bg-leaf/15' : 'bg-paper'
          return (
            <div key={t.number} className={`card p-4 ${bg} ${today ? 'ring-2 ring-sun ring-offset-2 ring-offset-cream' : ''}`}>
              <div className="flex items-start gap-3 mb-3">
                <div className={`w-12 h-12 rounded-xl border-2 border-ink grid place-items-center font-display font-extrabold text-xl shrink-0 ${isAttempted ? 'bg-leaf' : 'bg-flame text-paper'}`}>
                  {isAttempted ? '✓' : t.number}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h2 className="font-display font-extrabold text-lg">Test {t.number}</h2>
                    {t.isCumulative && <span className="chip text-[10px] py-0 px-2 bg-violet/30">Cumulative</span>}
                    {today && <span className="chip text-[10px] py-0 px-2 bg-sun">Today</span>}
                    {past && !isAttempted && !today && <span className="chip text-[10px] py-0 px-2 bg-flame/30">Overdue</span>}
                  </div>
                  <div className="text-xs text-ink/70 font-mono">
                    Day {t.day} · {formatShort(t.date)}
                  </div>
                </div>
              </div>

              {/* 3 papers */}
              <div className="grid sm:grid-cols-3 gap-2">
                {t.papers.map(p => (
                  <div key={p.subject} className="border-2 border-ink rounded-2xl p-3 bg-paper">
                    <div className="font-display font-bold text-sm mb-2">{p.subject}</div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <Link
                        to={`/pdf${p.qp}?title=${encodeURIComponent('Test ' + t.number + ' · ' + p.subject + ' · QP')}&back=/tests`}
                        className="text-[11px] font-bold text-center py-1.5 px-2 rounded-lg border-2 border-ink bg-flame/20 hover:bg-flame/30 transition-colors"
                      >
                        Question
                      </Link>
                      <Link
                        to={`/pdf${p.key}?title=${encodeURIComponent('Test ' + t.number + ' · ' + p.subject + ' · Answer Key')}&back=/tests`}
                        className="text-[11px] font-bold text-center py-1.5 px-2 rounded-lg border-2 border-ink bg-leaf/30 hover:bg-leaf/40 transition-colors"
                      >
                        Answers
                      </Link>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setAttempted(prev => ({ ...prev, [t.number]: !prev[t.number] }))}
                className={`mt-3 w-full text-sm font-bold py-2 rounded-xl border-2 border-ink transition-colors ${isAttempted ? 'bg-leaf' : 'bg-paper hover:bg-cream'}`}
              >
                {isAttempted ? '✓ Marked attempted' : 'Mark as attempted'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
