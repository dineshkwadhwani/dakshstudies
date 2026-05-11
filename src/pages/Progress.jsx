import { Link } from 'react-router-dom'
import {
  mcqs, useQuizScores, useScheduleDone, useTestsAttempted,
  schedule, tests, getSubjectQuizProgress,
  getScheduleSummary, getScheduleCoverageBySubject,
} from '../hooks/useData.js'
import { clearAllStorage } from '../hooks/useStorage.js'

export default function Progress() {
  const scores = useQuizScores()
  const [schedDone] = useScheduleDone()
  const [testsData] = useTestsAttempted()

  const subjectKeys = Object.keys(mcqs.subjects)
  const totalChapters = subjectKeys.reduce((n, k) => n + mcqs.subjects[k].chapters.length, 0)
  const totalQuizzesTaken = Object.keys(scores).length
  const overallAvg = totalQuizzesTaken > 0
    ? Math.round(Object.values(scores).reduce((a, s) => a + (s.best || 0), 0) / totalQuizzesTaken)
    : 0

  const schedSummary = getScheduleSummary(schedDone)
  const coverage = getScheduleCoverageBySubject(schedDone)
  const testsDone = Object.values(testsData).filter(t => t.attempted).length

  // Mock-test average across all entered scores
  const allTestScores = []
  for (const t of Object.values(testsData)) {
    for (const v of Object.values(t.scores || {})) {
      if (typeof v === 'number') allTestScores.push(v)
    }
  }
  const testAvgPct = allTestScores.length > 0
    ? Math.round((allTestScores.reduce((a, b) => a + b, 0) / (allTestScores.length * 80)) * 100)
    : null

  const handleReset = () => {
    if (confirm('Reset all progress? This will clear quiz scores, schedule check-offs, and test marks. Cannot be undone.')) {
      clearAllStorage()
      window.dispatchEvent(new CustomEvent('daksh:storage', { detail: { key: '*' } }))
    }
  }

  return (
    <div>
      <div className="mb-5">
        <div className="font-mono text-xs uppercase tracking-widest text-ink/60">Your stats</div>
        <h1 className="heading-display text-3xl">Progress</h1>
      </div>

      {/* Big numbers */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <BigStat label="Days fully done" value={`${schedSummary.daysFullyDone}/30`} sub="both tasks ticked" color="bg-sun/30" />
        <BigStat label="Quizzes taken" value={`${totalQuizzesTaken}/${totalChapters}`} sub="chapters" color="bg-sea/20" />
        <BigStat label="Quiz avg" value={`${overallAvg}%`} sub="across attempted" color="bg-leaf/30" />
        <BigStat label="Tests" value={testAvgPct !== null ? `${testAvgPct}%` : `${testsDone}/4`} sub={testAvgPct !== null ? `avg of entered` : 'attempted'} color="bg-flame/20" />
      </div>

      {/* Schedule coverage by subject (NEW) */}
      <h2 className="font-display font-extrabold text-lg mb-2">Schedule coverage</h2>
      <p className="text-xs text-ink/60 mb-2">How many scheduled days you've ticked off, per subject.</p>
      <div className="card p-3 mb-5 bg-paper">
        <div className="space-y-2">
          {Object.entries(coverage).map(([k, c]) => {
            const sub = mcqs.subjects[k]
            if (!sub) return null
            const pct = c.total > 0 ? Math.round((c.covered / c.total) * 100) : 0
            return (
              <div key={k} className="flex items-center gap-2">
                <div
                  className="w-7 h-7 shrink-0 rounded-lg border-2 border-ink grid place-items-center text-sm"
                  style={{ backgroundColor: sub.color }}
                >
                  {sub.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2 text-xs">
                    <span className="font-bold truncate">
                      {sub.parent ? `${sub.parent} · ${sub.name}` : sub.name}
                    </span>
                    <span className="font-mono text-ink/60">{c.covered}/{c.total}</span>
                  </div>
                  <div className="h-2 mt-1 rounded-full bg-cream border border-ink overflow-hidden">
                    <div className="h-full" style={{ width: `${pct}%`, backgroundColor: sub.color }} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Quiz progress by subject */}
      <h2 className="font-display font-extrabold text-lg mb-2">Quiz performance by subject</h2>
      <div className="space-y-2 mb-5">
        {subjectKeys.map(k => {
          const sub = mcqs.subjects[k]
          const p = getSubjectQuizProgress(scores, k)
          const pct = p.total > 0 ? Math.round((p.taken / p.total) * 100) : 0
          return (
            <Link
              key={k}
              to={`/chapters/${k}`}
              className="card p-3 flex items-center gap-3 tappable hover:shadow-pop transition-shadow"
            >
              <div
                className="w-10 h-10 rounded-xl border-2 border-ink grid place-items-center text-lg shrink-0"
                style={{ backgroundColor: sub.color }}
              >
                {sub.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display font-bold text-sm leading-tight">
                  {sub.parent ? `${sub.parent} · ${sub.name}` : sub.name}
                </div>
                <div className="h-2 mt-1.5 rounded-full bg-cream border border-ink overflow-hidden">
                  <div
                    className="h-full"
                    style={{ width: `${pct}%`, backgroundColor: sub.color }}
                  />
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-display font-extrabold text-base leading-none">
                  {p.taken}<span className="text-xs text-ink/50">/{p.total}</span>
                </div>
                <div className="text-[10px] font-mono text-ink/60">
                  {p.taken > 0 ? `avg ${p.avgPercent}%` : 'no quizzes'}
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Test scores breakdown */}
      {allTestScores.length > 0 && (
        <>
          <h2 className="font-display font-extrabold text-lg mb-2">Mock test scores</h2>
          <div className="space-y-2 mb-5">
            {tests.map(t => {
              const info = testsData[t.number]
              if (!info?.scores || Object.keys(info.scores).length === 0) return null
              const sum = Object.values(info.scores).reduce((a, b) => a + Number(b || 0), 0)
              const cnt = Object.values(info.scores).length
              const max = cnt * 80
              const pct = Math.round((sum / max) * 100)
              return (
                <div key={t.number} className="card p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-display font-bold">
                      Test {t.number} {t.isCumulative && <span className="text-xs font-normal text-ink/60">(Cumulative)</span>}
                    </div>
                    <div className={`chip text-xs ${pct >= 75 ? 'bg-leaf/40' : pct >= 50 ? 'bg-sun/40' : 'bg-flame/30'}`}>
                      {sum}/{max} · {pct}%
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {t.papers.map(p => {
                      const s = info.scores[p.subject]
                      return (
                        <div key={p.subject} className="rounded-lg border-2 border-ink/40 p-2 bg-cream">
                          <div className="font-mono text-[10px] uppercase tracking-wider text-ink/60">{p.subject}</div>
                          <div className="font-display font-extrabold text-lg leading-none mt-0.5">
                            {s != null ? `${s}` : '—'}
                            {s != null && <span className="text-xs text-ink/50 font-normal">/80</span>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      <div className="card p-4 bg-cream">
        <div className="text-sm text-ink/70 mb-2">All your progress is saved on this device only. Reset if you want to start over.</div>
        <button onClick={handleReset} className="btn-secondary text-sm w-full">
          Reset all progress
        </button>
      </div>
    </div>
  )
}

function BigStat({ label, value, sub, color }) {
  return (
    <div className={`card p-4 ${color}`}>
      <div className="font-display font-extrabold text-3xl leading-none">{value}</div>
      <div className="text-[11px] font-mono uppercase tracking-wider text-ink/60 mt-1">{label}</div>
      {sub && <div className="text-[10px] text-ink/60">{sub}</div>}
    </div>
  )
}
