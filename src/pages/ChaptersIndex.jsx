import { Link } from 'react-router-dom'
import { mcqs, useQuizScores, getSubjectQuizProgress } from '../hooks/useData.js'

export default function ChaptersIndex() {
  const scores = useQuizScores()

  // Group: Maths, Science, Social Science (4 sub-subjects under SS)
  const groupedSS = ['geography', 'history', 'civics', 'economics']

  return (
    <div>
      <div className="mb-5">
        <div className="font-mono text-xs uppercase tracking-widest text-ink/60">Subjects</div>
        <h1 className="heading-display text-3xl">Browse chapters</h1>
        <p className="text-ink/70 mt-1">All 50 chapters · Summaries, MCQ quizzes & worksheets</p>
      </div>

      <SubjectCard subjectKey="maths" scores={scores} />
      <SubjectCard subjectKey="science" scores={scores} />

      {/* Social Science group */}
      <div className="card p-4 mb-3">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl border-2 border-ink bg-violet/40 grid place-items-center text-2xl">
            🌐
          </div>
          <div>
            <h2 className="font-display font-extrabold text-xl">Social Science</h2>
            <div className="text-xs font-mono uppercase tracking-wider text-ink/60">22 chapters · 4 sections</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {groupedSS.map(k => (
            <SubjectMiniCard key={k} subjectKey={k} scores={scores} />
          ))}
        </div>
      </div>
    </div>
  )
}

function SubjectCard({ subjectKey, scores }) {
  const sub = mcqs.subjects[subjectKey]
  const progress = getSubjectQuizProgress(scores, subjectKey)
  const pct = progress.total > 0 ? Math.round((progress.taken / progress.total) * 100) : 0

  return (
    <Link to={`/chapters/${subjectKey}`} className="card-pop block p-4 mb-3 tappable">
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-xl border-2 border-ink grid place-items-center text-2xl shrink-0"
          style={{ backgroundColor: sub.color }}
        >
          {sub.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-display font-extrabold text-xl leading-tight">{sub.name}</h2>
          <div className="text-xs font-mono uppercase tracking-wider text-ink/60 mt-0.5">
            {sub.chapters.length} chapters · {progress.taken} attempted
          </div>
        </div>
        <ArrowIcon />
      </div>
      {/* Progress bar */}
      <div className="mt-3 h-2 rounded-full bg-cream border-2 border-ink overflow-hidden">
        <div
          className="h-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: sub.color }}
        />
      </div>
    </Link>
  )
}

function SubjectMiniCard({ subjectKey, scores }) {
  const sub = mcqs.subjects[subjectKey]
  const progress = getSubjectQuizProgress(scores, subjectKey)
  return (
    <Link
      to={`/chapters/${subjectKey}`}
      className="block p-3 rounded-2xl border-2 border-ink bg-paper tappable hover:shadow-pop transition-shadow"
    >
      <div className="flex items-center gap-2 mb-1">
        <div
          className="w-8 h-8 rounded-lg border-2 border-ink grid place-items-center"
          style={{ backgroundColor: sub.color }}
        >
          {sub.emoji}
        </div>
        <div className="font-display font-bold text-sm">{sub.name}</div>
      </div>
      <div className="text-[10px] font-mono uppercase tracking-wider text-ink/60">
        {progress.taken}/{progress.total} done
      </div>
    </Link>
  )
}

function ArrowIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}
