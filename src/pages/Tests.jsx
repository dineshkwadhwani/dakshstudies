import { Link } from 'react-router-dom'
import { useState } from 'react'
import { tests, useTestsAttempted, setTestAttempted, setTestScore } from '../hooks/useData.js'
import { formatShort, todayISO, isPast, isToday } from '../utils/dates.js'

export default function Tests() {
  const [attempted] = useTestsAttempted()

  return (
    <div>
      <div className="mb-5">
        <div className="font-mono text-xs uppercase tracking-widest text-ink/60">CBSE pattern · 80 marks each</div>
        <h1 className="heading-display text-3xl">Mock Tests</h1>
        <p className="text-ink/70 mt-1">4 tests across the 30-day plan</p>
      </div>

      <div className="card p-3 mb-4 bg-sky/20 text-sm">
        <strong className="font-display">How it works:</strong> Open the QP, take it on paper, check with the answer key, then record your marks (out of 80) below.
      </div>

      <div className="space-y-3">
        {tests.map(t => {
          const info = attempted[t.number] || { attempted: false, scores: {} }
          return <TestCard key={t.number} test={t} info={info} />
        })}
      </div>
    </div>
  )
}

function TestCard({ test, info }) {
  const past = isPast(test.date)
  const today = isToday(test.date)
  const isAttempted = !!info.attempted

  const scores = info.scores || {}
  const scoredPapers = Object.keys(scores).length
  const totalMarks = Object.values(scores).reduce((a, b) => a + Number(b || 0), 0)
  const maxMarks = test.papers.length * 80
  const overallPct = scoredPapers > 0 ? Math.round((totalMarks / (scoredPapers * 80)) * 100) : null

  const bg = today ? 'bg-sun/30' : isAttempted ? 'bg-leaf/15' : 'bg-paper'

  const [editing, setEditing] = useState(false)

  return (
    <div className={`card p-4 ${bg} ${today ? 'ring-2 ring-sun ring-offset-2 ring-offset-cream' : ''}`}>
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-12 h-12 rounded-xl border-2 border-ink grid place-items-center font-display font-extrabold text-xl shrink-0 ${isAttempted ? 'bg-leaf' : 'bg-flame text-paper'}`}>
          {isAttempted ? '✓' : test.number}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h2 className="font-display font-extrabold text-lg">Test {test.number}</h2>
            {test.isCumulative && <span className="chip text-[10px] py-0 px-2 bg-violet/30">Cumulative</span>}
            {today && <span className="chip text-[10px] py-0 px-2 bg-sun">Today</span>}
            {past && !isAttempted && !today && <span className="chip text-[10px] py-0 px-2 bg-flame/30">Overdue</span>}
          </div>
          <div className="text-xs text-ink/70 font-mono">
            Day {test.day} · {formatShort(test.date)}
          </div>
        </div>
        {overallPct !== null && (
          <div className={`shrink-0 rounded-xl border-2 border-ink px-3 py-2 text-center ${overallPct >= 75 ? 'bg-leaf' : overallPct >= 50 ? 'bg-sun' : 'bg-flame/30'}`}>
            <div className="font-display font-extrabold text-xl leading-none">{overallPct}%</div>
            <div className="text-[9px] font-mono uppercase tracking-wider text-ink/70 mt-0.5">
              {totalMarks}/{scoredPapers * 80}
            </div>
          </div>
        )}
      </div>

      {/* 3 papers */}
      <div className="grid sm:grid-cols-3 gap-2">
        {test.papers.map(p => (
          <PaperCard key={p.subject} testNumber={test.number} paper={p} score={scores[p.subject]} editing={editing} />
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <button
          onClick={() => setEditing(!editing)}
          className={`flex-1 text-sm font-bold py-2 rounded-xl border-2 border-ink transition-colors ${editing ? 'bg-sun' : 'bg-paper hover:bg-cream'}`}
        >
          {editing ? '✓ Done editing scores' : (scoredPapers > 0 ? '✎ Edit scores' : '✎ Enter scores')}
        </button>
        <button
          onClick={() => setTestAttempted(test.number, !isAttempted)}
          className={`flex-1 text-sm font-bold py-2 rounded-xl border-2 border-ink transition-colors ${isAttempted ? 'bg-leaf' : 'bg-paper hover:bg-cream'}`}
        >
          {isAttempted ? '✓ Attempted' : 'Mark as attempted'}
        </button>
      </div>
    </div>
  )
}

function PaperCard({ testNumber, paper, score, editing }) {
  const [val, setVal] = useState(score != null ? String(score) : '')

  const save = (newVal) => {
    if (newVal === '') {
      setTestScore(testNumber, paper.subject, null)
    } else {
      const n = Math.max(0, Math.min(80, Number(newVal) || 0))
      setTestScore(testNumber, paper.subject, n)
    }
  }

  return (
    <div className="border-2 border-ink rounded-2xl p-3 bg-paper">
      <div className="flex items-center justify-between mb-2">
        <div className="font-display font-bold text-sm">{paper.subject}</div>
        {score != null && !editing && (
          <span className="chip text-[10px] py-0 px-2 bg-leaf/40">
            {score}/80
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-1.5 mb-2">
        <Link
          to={`/pdf${paper.qp}?title=${encodeURIComponent('Test ' + testNumber + ' · ' + paper.subject + ' · QP')}&back=/tests`}
          className="text-[11px] font-bold text-center py-1.5 px-2 rounded-lg border-2 border-ink bg-flame/20 hover:bg-flame/30 transition-colors"
        >
          Question
        </Link>
        <Link
          to={`/pdf${paper.key}?title=${encodeURIComponent('Test ' + testNumber + ' · ' + paper.subject + ' · Answer Key')}&back=/tests`}
          className="text-[11px] font-bold text-center py-1.5 px-2 rounded-lg border-2 border-ink bg-leaf/30 hover:bg-leaf/40 transition-colors"
        >
          Answers
        </Link>
      </div>
      {editing && (
        <div className="mt-1">
          <label className="text-[10px] font-mono uppercase tracking-wider text-ink/60">Marks (out of 80)</label>
          <input
            type="number"
            min="0"
            max="80"
            value={val}
            onChange={e => setVal(e.target.value)}
            onBlur={() => save(val)}
            onKeyDown={e => { if (e.key === 'Enter') { save(val); e.target.blur() } }}
            className="w-full mt-1 px-2 py-1.5 text-sm rounded-lg border-2 border-ink bg-cream font-display font-bold focus:outline-none focus:bg-paper focus:shadow-pop"
            placeholder="—"
          />
        </div>
      )}
    </div>
  )
}
