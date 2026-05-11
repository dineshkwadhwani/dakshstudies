import { Link, useParams, Navigate } from 'react-router-dom'
import { mcqs, useQuizScores } from '../hooks/useData.js'

export default function SubjectChapters() {
  const { subject } = useParams()
  const sub = mcqs.subjects[subject]
  const scores = useQuizScores()

  if (!sub) return <Navigate to="/chapters" replace />

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-14 h-14 rounded-2xl border-2 border-ink grid place-items-center text-3xl shrink-0"
          style={{ backgroundColor: sub.color }}
        >
          {sub.emoji}
        </div>
        <div>
          <div className="font-mono text-xs uppercase tracking-widest text-ink/60">
            {sub.parent || 'Subject'}
          </div>
          <h1 className="heading-display text-2xl leading-tight">{sub.name}</h1>
          <div className="text-xs text-ink/60">{sub.chapters.length} chapters</div>
        </div>
      </div>

      <div className="space-y-2">
        {sub.chapters.map(ch => {
          const score = scores[ch.id]
          return (
            <Link
              key={ch.id}
              to={`/chapter/${subject}/${ch.id}`}
              className="card-pop tappable block p-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl border-2 border-ink bg-cream grid place-items-center font-display font-extrabold">
                  {ch.number}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display font-bold text-base leading-tight">{ch.title}</div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {ch.pdfs.summary && <span className="chip text-[10px] py-0.5 px-2 bg-sky/30">📄 Summary</span>}
                    <span className="chip text-[10px] py-0.5 px-2 bg-sun/30">🎯 25 MCQs</span>
                    {score && (
                      <span className={`chip text-[10px] py-0.5 px-2 ${score.best >= 75 ? 'bg-leaf/40' : score.best >= 50 ? 'bg-sun/40' : 'bg-flame/30'}`}>
                        ⭐ {score.best}%
                      </span>
                    )}
                  </div>
                </div>
                <Arrow />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

function Arrow() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}
