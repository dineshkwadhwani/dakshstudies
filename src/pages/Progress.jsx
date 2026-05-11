import { Link } from 'react-router-dom'
import { mcqs, useQuizScores, useScheduleDone, useTestsAttempted, schedule, tests, getSubjectQuizProgress, findChapterById } from '../hooks/useData.js'
import { clearAllStorage } from '../hooks/useStorage.js'

export default function Progress() {
  const scores = useQuizScores()
  const [schedDone] = useScheduleDone()
  const [testsAttempted] = useTestsAttempted()

  const subjectKeys = Object.keys(mcqs.subjects)
  const totalChapters = subjectKeys.reduce((n, k) => n + mcqs.subjects[k].chapters.length, 0)
  const totalQuizzesTaken = Object.keys(scores).length
  const overallAvg = totalQuizzesTaken > 0
    ? Math.round(Object.values(scores).reduce((a, s) => a + (s.best || 0), 0) / totalQuizzesTaken)
    : 0
  const scheduleDone = Object.values(schedDone).filter(Boolean).length
  const testsDone = Object.values(testsAttempted).filter(Boolean).length

  const wrongQuestions = []
  for (const [chapterId, info] of Object.entries(scores)) {
    if (!info.last || !info.last.answers) continue
    const found = findChapterById(chapterId)
    if (!found) continue
    info.last.answers.forEach((a, i) => {
      if (a !== found.chapter.answers[i]) {
        wrongQuestions.push({
          chapterId, subject: found.subjectKey, qIdx: i,
          chapterTitle: found.chapter.title,
        })
      }
    })
  }

  const handleReset = () => {
    if (confirm('Reset all progress? This will clear quiz scores, schedule check-offs, and test marks. Cannot be undone.')) {
      clearAllStorage()
      // Force a soft reload of state
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
        <BigStat label="Schedule done" value={`${scheduleDone}/30`} sub="days" color="bg-sun/30" />
        <BigStat label="Quizzes taken" value={`${totalQuizzesTaken}/${totalChapters}`} sub="chapters" color="bg-sea/20" />
        <BigStat label="Average score" value={`${overallAvg}%`} sub="across attempted" color="bg-leaf/30" />
        <BigStat label="Tests" value={`${testsDone}/4`} sub="attempted" color="bg-flame/20" />
      </div>

      {/* Subject breakdown */}
      <h2 className="font-display font-extrabold text-lg mb-2">By subject</h2>
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

      {/* Reset */}
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
