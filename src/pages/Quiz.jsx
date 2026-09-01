import { useState, useEffect, useRef } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useChapter } from '../hooks/useCatalog.js'
import { supabase } from '../lib/supabase.js'
import { useQuizAllowance } from '../hooks/useQuizAllowance.js'
import { toHTML } from '../utils/text.js'

/* ============================================================
   Helpers
   ============================================================ */

/* Fisher–Yates shuffle, returns a new array */
function shuffled(arr) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Build a shuffled quiz set of `count` questions, drawn from the chapter's
 * combined pool (questions + questions2). For each picked question, also
 * shuffle the A/B/C/D option order. Returns array of:
 *   { q: stem, opts: [opt0..opt3], correctIndex: 0..3 }
 *
 * `correctIndex` is the index (into the shuffled opts) of the correct option.
 */
export default function Quiz() {
  const { subject, chapterId } = useParams()
  const navigate = useNavigate()
  const { data, loading, error } = useChapter(subject, chapterId)
  const { allowance, reload: reloadAllowance } = useQuizAllowance()
  const sub = data?.subject ? { ...data.subject, parent: data.subject.parent?.name } : null
  const ch = data?.chapter ? { ...data.chapter, number: data.chapter.chapter_number } : null

  const [mode, setMode] = useState(null)            // 'practice' | 'test'
  const [phase, setPhase] = useState('intro')       // intro | active | review
  const [result, setResult] = useState(null)
  const [attempt, setAttempt] = useState(null)
  const [startError, setStartError] = useState('')
  const [starting, setStarting] = useState(false)

  if (loading) return <div className="card p-8 text-center">Loading quiz…</div>
  if (error || !sub || !ch) return <div className="card p-8 text-center">This quiz could not be loaded.</div>

  async function start(selectedMode) {
    setStarting(true); setStartError('')
    const { data: started, error: startFailure } = await supabase.rpc('start_chapter_quiz', { p_chapter_id: ch.id, p_mode: selectedMode })
    setStarting(false)
    if (startFailure) return setStartError(startFailure.message.includes('QUIZ_ALLOWANCE_REACHED') ? 'You have used all quiz attempts in your current package. Upgrade to continue taking quizzes.' : startFailure.message)
    const quizSet = (started.questions || []).map(question => {
      const shuffledOptions = shuffled(question.opts)
      return { attemptQuestionId: question.attemptQuestionId, q: question.q, opts: shuffledOptions.map(option => option.text), optionIds: shuffledOptions.map(option => option.id), correctIndex: question.correctOptionId ? shuffledOptions.findIndex(option => option.id === question.correctOptionId) : -1 }
    })
    setAttempt({ ...started, quizSet }); setMode(selectedMode); setPhase('active')
  }

  if (phase === 'intro') {
    return (
      <QuizIntro
        chapter={ch}
        subject={sub}
        onStart={start}
        starting={starting}
        error={startError}
        allowance={allowance}
      />
    )
  }

  if (phase === 'active') {
    return (
      <ActiveQuiz
        chapter={ch}
        subject={sub}
        mode={mode}
        quizSet={attempt.quizSet}
        durationMinutes={attempt.durationMinutes || 25}
        onFinish={async (res) => {
          const selectedIds = res.answers.map((answer, index) => answer == null ? null : res.quizSet[index].optionIds[answer])
          const { data: graded, error: submitError } = await supabase.rpc('submit_chapter_quiz', { p_attempt_id: attempt.attemptId, p_selected_option_ids: selectedIds, p_duration_seconds: res.durationSec })
          if (submitError) throw submitError
          const gradedSet = res.quizSet.map((question, index) => ({ ...question, correctIndex: question.optionIds.findIndex(id => id === graded.correctOptionIds[index]) }))
          setResult({ ...res, quizSet: gradedSet, score: Number(graded.score), total: Number(graded.total), scheduleTaskCompleted: graded.scheduleTaskCompleted })
          reloadAllowance()
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
function QuizIntro({ chapter, subject, onStart, starting, error, allowance }) {
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
      {allowance && <div className={`card p-3 mb-3 text-sm ${allowance.allowed ? 'bg-sky/20' : 'bg-flame/20'}`}><strong>{allowance.used}/{allowance.limit}</strong> quiz attempts used on the {allowance.packageName} package.{!allowance.allowed && <Link to="/" className="font-bold underline ml-1">Upgrade to continue</Link>}</div>}
      {error && <div className="card p-3 mb-3 bg-flame/20 text-sm">{error}</div>}

      <button
        onClick={() => onStart('practice')}
        disabled={starting || allowance?.allowed === false}
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
        disabled={starting || allowance?.allowed === false}
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
function ActiveQuiz({ chapter, subject, mode, quizSet, durationMinutes, onFinish, onExit }) {
  const total = quizSet.length

  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState(() => Array(total).fill(null))  // stores chosen option INDEX (0..3) or null
  const [revealed, setRevealed] = useState(() => Array(total).fill(false))
  const [showSummary, setShowSummary] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const startTimeRef = useRef(Date.now())

  const [secondsLeft, setSecondsLeft] = useState(durationMinutes * 60)
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

  const q = quizSet[idx]
  const correctIdx = q.correctIndex
  const letters = ['A', 'B', 'C', 'D']
  const userAnsIdx = answers[idx]
  const isRevealed = revealed[idx]

  const select = (optIdx) => {
    if (isRevealed) return
    const next = [...answers]; next[idx] = optIdx; setAnswers(next)
    if (mode === 'practice') {
      const r = [...revealed]; r[idx] = true; setRevealed(r)
    }
  }
  const goNext = () => { if (idx < total - 1) setIdx(idx + 1); else setShowSummary(true) }
  const goPrev = () => { if (idx > 0) setIdx(idx - 1) }
  const answeredCount = answers.filter(a => a !== null).length

  const submit = async () => {
    const score = mode === 'practice' ? answers.reduce((sum, a, i) => sum + (a === quizSet[i].correctIndex ? 1 : 0), 0) : 0
    const durationSec = Math.round((Date.now() - startTimeRef.current) / 1000)
    setSubmitting(true); setSubmitError('')
    try { await onFinish({ score, total, durationSec, answers, quizSet }) }
    catch (error) { setSubmitting(false); setSubmitError(error.message || 'Quiz could not be submitted') }
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
        submitting={submitting}
        error={submitError}
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
            const isSelected = userAnsIdx === i
            const isCorrect = i === correctIdx
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
                onClick={() => select(i)}
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
          <div className={`mt-4 p-3 rounded-xl border-2 border-ink ${userAnsIdx === correctIdx ? 'bg-leaf/20' : 'bg-flame/15'}`}>
            <div className="font-display font-bold">
              {userAnsIdx === correctIdx ? '🎉 Correct!' : `Not quite — the correct answer is ${letters[correctIdx]}`}
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
function SubmitConfirm({ answeredCount, total, mode, timeOut, onCancel, onSubmit, submitting, error }) {
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
      {error && <div className="rounded-xl border-2 border-ink bg-flame/20 p-3 text-sm mb-3">{error}</div>}
      <div className="flex gap-2">
        {!timeOut && (
          <button onClick={onCancel} className="btn-secondary flex-1">Keep going</button>
        )}
        <button disabled={submitting} onClick={onSubmit} className="btn-primary flex-1 bg-leaf disabled:opacity-60">
          {submitting ? 'Submitting…' : timeOut ? 'See results' : 'Submit'}
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

  const wrongIndices = result.answers.map((a, i) => (a !== result.quizSet[i].correctIndex ? i : -1)).filter(i => i >= 0)

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
          const correct = a === result.quizSet[i].correctIndex
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
  const q = result.quizSet[idx]
  const correctIdx = q.correctIndex
  const userAnsIdx = result.answers[idx]
  const correct = userAnsIdx === correctIdx
  const letters = ['A', 'B', 'C', 'D']

  return (
    <div className="pb-24">
      <div className="sticky top-[60px] z-20 -mx-4 px-4 py-3 bg-cream/95 backdrop-blur border-b-2 border-ink/20 flex items-center gap-3">
        <button onClick={onClose} className="btn-ghost px-3 py-1 text-sm">← All</button>
        <div className="flex-1 text-center font-display font-extrabold">
          Q{idx + 1} <span className="text-ink/50 font-mono font-normal">/ {result.total}</span>
        </div>
        <div className={`chip ${correct ? 'bg-leaf/40' : (userAnsIdx != null) ? 'bg-flame/40' : 'bg-paper'}`}>
          {correct ? '✓ Correct' : (userAnsIdx != null) ? '✗ Wrong' : '— Skipped'}
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
            const isCorrect = i === correctIdx
            const isUser = i === userAnsIdx
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
