import { useState, useEffect, useRef } from 'react'
import { Link, useParams, Navigate, useNavigate } from 'react-router-dom'
import { getChapter, mcqs, recordQuizAttempt } from '../hooks/useData.js'
import { toHTML } from '../utils/text.js'

export default function Quiz() {
  const { subject, chapterId } = useParams()
  const navigate = useNavigate()
  const sub = mcqs.subjects[subject]
  const ch = getChapter(subject, chapterId)

  const [mode, setMode] = useState(null)            // 'practice' | 'test'
  const [phase, setPhase] = useState('intro')       // intro | active | review
  const [result, setResult] = useState(null)

  if (!sub || !ch) return <Navigate to="/chapters" replace />

  if (phase === 'intro') {
    return (
      <QuizIntro
        chapter={ch}
        subject={sub}
        onStart={(m) => { setMode(m); setPhase('active') }}
      />
    )
  }

  if (phase === 'active') {
    return (
      <ActiveQuiz
        chapter={ch}
        subject={sub}
        mode={mode}
        onFinish={(res) => {
          recordQuizAttempt(chapterId, {
            mode,
            score: res.score,
            total: res.total,
            percent: Math.round((res.score / res.total) * 100),
            date: new Date().toISOString(),
            durationSec: res.durationSec,
            answers: res.answers,
          })
          setResult(res)
          setPhase('review')
        }}
        onExit={() => navigate(`/chapter/${subject}/${chapterId}`)}
      />
    )
  }

  return (
    <QuizReview
      chapter={ch}
      subject={sub}
      mode={mode}
      result={result}
      onRetake={() => { setResult(null); setPhase('intro') }}
      backTo={`/chapter/${subject}/${chapterId}`}
    />
  )
}

/* Intro */
function QuizIntro({ chapter, subject, onStart }) {
  return (
    <div>
      <div className="card p-5 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-9 h-9 rounded-lg border-2 border-ink grid place-items-center"
            style={{ backgroundColor: subject.color }}
          >
            {subject.emoji}
          </div>
          <div className="text-xs font-mono uppercase tracking-wider text-ink/60">
            {subject.parent ? `${subject.parent} · ${subject.name}` : subject.name} · Chapter {chapter.number}
          </div>
        </div>
        <h1 className="heading-display text-2xl">{chapter.title}</h1>
        <div className="text-sm text-ink/70 mt-1">25 questions · 1 mark each · No negative marking</div>
      </div>

      <h2 className="font-display font-extrabold text-lg mb-2">Pick a mode</h2>

      <button
        onClick={() => onStart('practice')}
        className="card-pop tappable w-full p-5 mb-3 text-left bg-leaf/25"
      >
        <div className="flex items-start gap-3">
          <div className="text-3xl">🎓</div>
          <div className="flex-1">
            <div className="font-display font-extrabold text-lg">Practice mode</div>
            <ul className="text-sm text-ink/70 mt-1 space-y-0.5">
              <li>✓ Instant feedback after each question</li>
              <li>✓ See the correct answer right away</li>
              <li>✓ No timer — go at your own pace</li>
            </ul>
          </div>
        </div>
      </button>

      <button
        onClick={() => onStart('test')}
        className="card-pop tappable w-full p-5 mb-3 text-left bg-flame/20"
      >
        <div className="flex items-start gap-3">
          <div className="text-3xl">⏱️</div>
          <div className="flex-1">
            <div className="font-display font-extrabold text-lg">Test mode</div>
            <ul className="text-sm text-ink/70 mt-1 space-y-0.5">
              <li>✓ 25-minute timer</li>
              <li>✓ All answers revealed at the end</li>
              <li>✓ Real exam feel</li>
            </ul>
          </div>
        </div>
      </button>
    </div>
  )
}

/* Active */
function ActiveQuiz({ chapter, subject, mode, onFinish, onExit }) {
  const total = chapter.questions.length
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState(() => Array(total).fill(null))
  const [revealed, setRevealed] = useState(() => Array(total).fill(false))
  const [showSummary, setShowSummary] = useState(false)
  const startTimeRef = useRef(Date.now())

  const [secondsLeft, setSecondsLeft] = useState(25 * 60)
  useEffect(() => {
    if (mode !== 'test') return
    const t = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) { clearInterval(t); setShowSummary(true); return 0 }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [mode])

  const q = chapter.questions[idx]
  const correctLetter = chapter.answers[idx]
  const letters = ['A', 'B', 'C', 'D']
  const userAns = answers[idx]
  const isRevealed = revealed[idx]

  const select = (letter) => {
    if (isRevealed) return
    const next = [...answers]; next[idx] = letter; setAnswers(next)
    if (mode === 'practice') {
      const r = [...revealed]; r[idx] = true; setRevealed(r)
    }
  }
  const goNext = () => { if (idx < total - 1) setIdx(idx + 1); else setShowSummary(true) }
  const goPrev = () => { if (idx > 0) setIdx(idx - 1) }
  const answeredCount = answers.filter(Boolean).length

  const submit = () => {
    const score = answers.reduce((sum, a, i) => sum + (a === chapter.answers[i] ? 1 : 0), 0)
    const durationSec = Math.round((Date.now() - startTimeRef.current) / 1000)
    onFinish({ score, total, durationSec, answers })
  }

  if (showSummary) {
    return (
      <SubmitConfirm
        answeredCount={answeredCount}
        total={total}
        mode={mode}
        timeOut={mode === 'test' && secondsLeft === 0}
        onCancel={() => setShowSummary(false)}
        onSubmit={submit}
      />
    )
  }

  return (
    <div className="pb-24">
      <div className="sticky top-[60px] z-20 -mx-4 px-4 py-3 bg-cream/95 backdrop-blur border-b-2 border-ink/20">
        <div className="flex items-center gap-3">
          <button onClick={onExit} className="text-xs font-mono uppercase tracking-wider text-ink/70 hover:text-ink">
            Exit
          </button>
          <div className="flex-1 h-3 rounded-full bg-paper border-2 border-ink overflow-hidden">
            <div
              className="h-full transition-all"
              style={{ width: `${((idx + 1) / total) * 100}%`, backgroundColor: subject.color }}
            />
          </div>
          {mode === 'test' ? (
            <div className={`chip ${secondsLeft < 60 ? 'bg-flame/30 animate-pulse' : 'bg-paper'}`}>
              ⏱ {formatTime(secondsLeft)}
            </div>
          ) : (
            <div className="chip bg-leaf/30">🎓</div>
          )}
        </div>
        <div className="mt-2 text-center">
          <span className="font-display font-extrabold text-lg">Q{idx + 1}</span>
          <span className="text-ink/50 font-mono text-sm"> / {total}</span>
        </div>
      </div>

      <div className="card p-5 mt-4 animate-pop-in" key={idx}>
        <div
          className="font-display font-bold text-lg leading-snug"
          dangerouslySetInnerHTML={{ __html: toHTML(q.q) }}
        />
        <div className="mt-4 space-y-2">
          {q.opts.map((opt, i) => {
            const letter = letters[i]
            const isSelected = userAns === letter
            const isCorrect = letter === correctLetter
            let stateClass = 'bg-paper border-ink hover:bg-cream'
            if (isRevealed) {
              if (isCorrect) stateClass = 'bg-leaf/40 border-ink'
              else if (isSelected && !isCorrect) stateClass = 'bg-flame/40 border-ink'
              else stateClass = 'bg-paper border-ink/30 opacity-60'
            } else if (isSelected) {
              stateClass = 'bg-sun/40 border-ink shadow-pop'
            }
            return (
              <button
                key={i}
                onClick={() => select(letter)}
                className={`tappable w-full p-3 sm:p-4 text-left rounded-2xl border-2 transition-all ${stateClass}`}
                disabled={isRevealed}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 shrink-0 rounded-lg border-2 border-ink grid place-items-center font-display font-extrabold ${
                    isRevealed && isCorrect ? 'bg-leaf' :
                    isRevealed && isSelected && !isCorrect ? 'bg-flame text-paper' :
                    isSelected ? 'bg-sun' : 'bg-paper'
                  }`}>
                    {letter}
                  </div>
                  <div className="flex-1 pt-1" dangerouslySetInnerHTML={{ __html: toHTML(opt) }} />
                  {isRevealed && isCorrect && <span className="text-xl">✓</span>}
                  {isRevealed && isSelected && !isCorrect && <span className="text-xl">✗</span>}
                </div>
              </button>
            )
          })}
        </div>

        {mode === 'practice' && isRevealed && (
          <div className={`mt-4 p-3 rounded-xl border-2 border-ink ${userAns === correctLetter ? 'bg-leaf/20' : 'bg-flame/15'}`}>
            <div className="font-display font-bold">
              {userAns === correctLetter ? '🎉 Correct!' : `Not quite — the correct answer is ${correctLetter}`}
            </div>
          </div>
        )}
      </div>

      <div className="fixed left-0 right-0 bottom-[68px] sm:bottom-[72px] px-4 z-30">
        <div className="max-w-3xl mx-auto flex gap-2">
          <button
            onClick={goPrev}
            disabled={idx === 0}
            className="btn-secondary flex-1 disabled:opacity-40 disabled:pointer-events-none"
          >
            ← Prev
          </button>
          {idx < total - 1 ? (
            <button onClick={goNext} className="btn-primary flex-1">Next →</button>
          ) : (
            <button onClick={() => setShowSummary(true)} className="btn-primary flex-1 bg-leaf">
              Submit ✓
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* Submit confirmation */
function SubmitConfirm({ answeredCount, total, mode, timeOut, onCancel, onSubmit }) {
  return (
    <div className="card p-6 mt-6">
      <div className="text-5xl mb-3 text-center">{timeOut ? '⏰' : '🎯'}</div>
      <h2 className="heading-display text-2xl text-center mb-2">
        {timeOut ? "Time's up!" : 'Submit quiz?'}
      </h2>
      <p className="text-center text-ink/70 mb-4">
        You answered <strong>{answeredCount}</strong> of {total} questions.
        {answeredCount < total && !timeOut && ' Unanswered questions will be marked wrong.'}
      </p>
      <div className="flex gap-2">
        {!timeOut && (
          <button onClick={onCancel} className="btn-secondary flex-1">Keep going</button>
        )}
        <button onClick={onSubmit} className="btn-primary flex-1 bg-leaf">
          {timeOut ? 'See results' : 'Submit'}
        </button>
      </div>
    </div>
  )
}

/* Review */
function QuizReview({ chapter, subject, mode, result, onRetake, backTo }) {
  const [reviewIdx, setReviewIdx] = useState(null)
  const pct = Math.round((result.score / result.total) * 100)

  let mood, color, message
  if (pct >= 90)      { mood = '🏆'; color = 'bg-leaf';     message = 'Outstanding!' }
  else if (pct >= 75) { mood = '🌟'; color = 'bg-leaf/70';  message = 'Great work!' }
  else if (pct >= 50) { mood = '💪'; color = 'bg-sun';      message = 'Solid effort — keep going!' }
  else                { mood = '📚'; color = 'bg-flame/40'; message = 'Time to revise the chapter' }

  if (reviewIdx !== null) {
    return (
      <ReviewSingleQuestion
        chapter={chapter} result={result} subject={subject} idx={reviewIdx}
        onPrev={() => reviewIdx > 0 && setReviewIdx(reviewIdx - 1)}
        onNext={() => reviewIdx < result.total - 1 && setReviewIdx(reviewIdx + 1)}
        onClose={() => setReviewIdx(null)}
      />
    )
  }

  const wrongIndices = result.answers.map((a, i) => (a !== chapter.answers[i] ? i : -1)).filter(i => i >= 0)

  return (
    <div>
      <div className={`card p-6 mb-4 text-center ${color}`}>
        <div className="text-6xl animate-pop-in">{mood}</div>
        <div className="font-display font-extrabold text-5xl sm:text-6xl mt-2">{pct}%</div>
        <div className="font-mono text-sm uppercase tracking-widest text-ink/70 mt-1">
          {result.score} of {result.total} correct
        </div>
        <div className="font-display font-bold text-lg mt-3">{message}</div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <MiniStat icon="✓" label="Correct" value={result.score} color="bg-leaf/30" />
        <MiniStat icon="✗" label="Wrong" value={result.total - result.score} color="bg-flame/30" />
        <MiniStat icon="⏱" label="Time" value={formatDuration(result.durationSec)} color="bg-sky/30" />
      </div>

      <h2 className="font-display font-extrabold text-lg mb-2">Review answers</h2>
      <p className="text-sm text-ink/60 mb-3">Tap any question to see the explanation</p>
      <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 mb-5">
        {result.answers.map((a, i) => {
          const correct = a === chapter.answers[i]
          const unanswered = a == null
          return (
            <button
              key={i}
              onClick={() => setReviewIdx(i)}
              className={`tappable aspect-square rounded-xl border-2 border-ink font-display font-extrabold text-sm transition-all ${unanswered ? 'bg-paper text-ink/40' : correct ? 'bg-leaf' : 'bg-flame/40'}`}
            >
              {i + 1}
            </button>
          )
        })}
      </div>

      {wrongIndices.length > 0 && (
        <button
          onClick={() => setReviewIdx(wrongIndices[0])}
          className="card-pop block w-full p-4 mb-3 bg-flame/20 tappable text-left"
        >
          <div className="flex items-center gap-3">
            <div className="text-2xl">📝</div>
            <div className="flex-1">
              <div className="font-display font-bold">Review wrong answers</div>
              <div className="text-xs text-ink/60">{wrongIndices.length} question{wrongIndices.length === 1 ? '' : 's'} to revisit</div>
            </div>
            <Arrow />
          </div>
        </button>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button onClick={onRetake} className="btn-secondary">↻ Retake</button>
        <Link to={backTo} className="btn-primary">Done</Link>
      </div>
    </div>
  )
}

function MiniStat({ icon, label, value, color }) {
  return (
    <div className={`card p-3 ${color}`}>
      <div className="text-lg">{icon}</div>
      <div className="font-display font-extrabold text-xl leading-none mt-1">{value}</div>
      <div className="text-[10px] font-mono uppercase tracking-wider text-ink/60 mt-0.5">{label}</div>
    </div>
  )
}

function ReviewSingleQuestion({ chapter, result, subject, idx, onPrev, onNext, onClose }) {
  const q = chapter.questions[idx]
  const correctLetter = chapter.answers[idx]
  const userAns = result.answers[idx]
  const correct = userAns === correctLetter
  const letters = ['A', 'B', 'C', 'D']

  return (
    <div className="pb-24">
      <div className="sticky top-[60px] z-20 -mx-4 px-4 py-3 bg-cream/95 backdrop-blur border-b-2 border-ink/20 flex items-center gap-3">
        <button onClick={onClose} className="btn-ghost px-3 py-1 text-sm">← All</button>
        <div className="flex-1 text-center font-display font-extrabold">
          Q{idx + 1} <span className="text-ink/50 font-mono font-normal">/ {result.total}</span>
        </div>
        <div className={`chip ${correct ? 'bg-leaf/40' : userAns ? 'bg-flame/40' : 'bg-paper'}`}>
          {correct ? '✓ Correct' : userAns ? '✗ Wrong' : '— Skipped'}
        </div>
      </div>

      <div className="card p-5 mt-4">
        <div
          className="font-display font-bold text-lg leading-snug"
          dangerouslySetInnerHTML={{ __html: toHTML(q.q) }}
        />
        <div className="mt-4 space-y-2">
          {q.opts.map((opt, i) => {
            const letter = letters[i]
            const isCorrect = letter === correctLetter
            const isUser = letter === userAns
            return (
              <div
                key={i}
                className={`p-3 sm:p-4 rounded-2xl border-2 ${
                  isCorrect ? 'bg-leaf/40 border-ink' :
                  isUser ? 'bg-flame/40 border-ink' :
                  'bg-paper border-ink/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 shrink-0 rounded-lg border-2 border-ink grid place-items-center font-display font-extrabold ${
                    isCorrect ? 'bg-leaf' : isUser ? 'bg-flame text-paper' : 'bg-paper'
                  }`}>
                    {letter}
                  </div>
                  <div className="flex-1 pt-1" dangerouslySetInnerHTML={{ __html: toHTML(opt) }} />
                  {isCorrect && <span className="text-xl">✓</span>}
                  {isUser && !isCorrect && <span className="text-xl">✗</span>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="fixed left-0 right-0 bottom-[68px] sm:bottom-[72px] px-4 z-30">
        <div className="max-w-3xl mx-auto flex gap-2">
          <button onClick={onPrev} disabled={idx === 0} className="btn-secondary flex-1 disabled:opacity-40 disabled:pointer-events-none">
            ← Prev
          </button>
          <button onClick={onNext} disabled={idx === result.total - 1} className="btn-primary flex-1 disabled:opacity-40 disabled:pointer-events-none">
            Next →
          </button>
        </div>
      </div>
    </div>
  )
}

function formatTime(sec) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
function formatDuration(sec) {
  if (sec < 60) return `${sec}s`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return s ? `${m}m ${s}s` : `${m}m`
}
function Arrow() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}
