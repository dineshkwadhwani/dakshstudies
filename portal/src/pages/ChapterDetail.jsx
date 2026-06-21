import { Link, useParams, Navigate } from 'react-router-dom'
import { getChapter, mcqs, useQuizScores } from '../hooks/useData.js'

export default function ChapterDetail() {
  const { subject, chapterId } = useParams()
  const sub = mcqs.subjects[subject]
  const ch  = getChapter(subject, chapterId)
  const scores = useQuizScores()

  if (!sub || !ch) return <Navigate to="/chapters" replace />
  const score = scores[chapterId]

  return (
    <div>
      {/* Header */}
      <div className="card p-5 mb-4 relative overflow-hidden">
        <div
          className="absolute -top-12 -right-10 w-44 h-44 rounded-full opacity-30 blur-2xl"
          style={{ backgroundColor: sub.color }}
        />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-10 h-10 rounded-xl border-2 border-ink grid place-items-center text-xl"
              style={{ backgroundColor: sub.color }}
            >
              {sub.emoji}
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-ink/60">
                {sub.parent ? `${sub.parent} · ${sub.name}` : sub.name}
              </div>
              <div className="text-xs text-ink/60">Chapter {ch.number}</div>
            </div>
          </div>
          <h1 className="heading-display text-2xl sm:text-3xl leading-tight">
            {ch.title}
          </h1>
          {score && (
            <div className="mt-3 flex items-center gap-2">
              <div className={`chip ${score.best >= 75 ? 'bg-leaf/40' : score.best >= 50 ? 'bg-sun/40' : 'bg-flame/30'}`}>
                ⭐ Best: {score.best}%
              </div>
              <div className="text-xs text-ink/60">
                {score.attempts.length} attempt{score.attempts.length === 1 ? '' : 's'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Big call-to-action: Quiz */}
      <Link
        to={`/quiz/${subject}/${chapterId}`}
        className="card-pop block p-5 mb-3 bg-sun tappable"
      >
        <div className="flex items-center gap-4">
          <div className="text-4xl animate-float">🎯</div>
          <div className="flex-1">
            <div className="font-display font-extrabold text-xl">Take MCQ Quiz</div>
            <div className="text-sm text-ink/70">25 questions · Practice or Test mode</div>
          </div>
          <Arrow />
        </div>
      </Link>

      {/* Other resources */}
      {ch.pdfs.summary && (
        <ResourceLink
          to={`/pdf${ch.pdfs.summary}?title=${encodeURIComponent(ch.title + ' — Summary')}&back=/chapter/${subject}/${chapterId}`}
          icon="📄"
          title="Chapter Summary"
          subtitle="Quick revision notes (~700 words)"
          bg="bg-sky/30"
        />
      )}
      <ResourceLink
        to={`/pdf${ch.pdfs.worksheetA}?title=${encodeURIComponent(ch.title + ' — Worksheet A')}&back=/chapter/${subject}/${chapterId}`}
        icon="📝"
        title="MCQ Worksheet A (PDF)"
        subtitle="Set A · Print-friendly · 25 questions"
        bg="bg-leaf/25"
      />
      <ResourceLink
        to={`/pdf${ch.pdfs.answerKeyA}?title=${encodeURIComponent(ch.title + ' — Answer Key A')}&back=/chapter/${subject}/${chapterId}`}
        icon="✅"
        title="MCQ Answer Key A (PDF)"
        subtitle="Answers for Worksheet A"
        bg="bg-violet/25"
      />
      <ResourceLink
        to={`/pdf${ch.pdfs.worksheetB}?title=${encodeURIComponent(ch.title + ' — Worksheet B')}&back=/chapter/${subject}/${chapterId}`}
        icon="📝"
        title="MCQ Worksheet B (PDF)"
        subtitle="Set B · Harder mix · 25 questions"
        bg="bg-flame/20"
      />
      <ResourceLink
        to={`/pdf${ch.pdfs.answerKeyB}?title=${encodeURIComponent(ch.title + ' — Answer Key B')}&back=/chapter/${subject}/${chapterId}`}
        icon="✅"
        title="MCQ Answer Key B (PDF)"
        subtitle="Answers for Worksheet B"
        bg="bg-sun/25"
      />

      {/* Recent attempts */}
      {score && score.attempts.length > 0 && (
        <section className="mt-6">
          <h3 className="font-display font-extrabold text-lg mb-2">Recent attempts</h3>
          <div className="space-y-2">
            {score.attempts.slice(0, 5).map((a, i) => (
              <div key={i} className="card p-3 flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl border-2 border-ink grid place-items-center font-display font-extrabold ${a.percent >= 75 ? 'bg-leaf' : a.percent >= 50 ? 'bg-sun' : 'bg-flame text-paper'}`}>
                  {a.percent}%
                </div>
                <div className="flex-1">
                  <div className="font-bold text-sm">
                    {a.score}/{a.total} correct
                  </div>
                  <div className="text-xs text-ink/60">
                    {a.mode === 'test' ? '⏱️ Test mode' : '🎓 Practice'}
                    {' · '}
                    {new Date(a.date).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function ResourceLink({ to, icon, title, subtitle, bg }) {
  return (
    <Link to={to} className={`card-pop block p-4 mb-2 tappable ${bg}`}>
      <div className="flex items-center gap-3">
        <div className="text-2xl">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="font-display font-bold">{title}</div>
          <div className="text-xs text-ink/60">{subtitle}</div>
        </div>
        <Arrow />
      </div>
    </Link>
  )
}

function Arrow() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}
