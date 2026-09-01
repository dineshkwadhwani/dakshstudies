import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { toHTML } from '../utils/text.js'

export default function AttemptResult() {
  const { attemptId } = useParams()
  const [state, setState] = useState({ attempt: null, loading: true, error: null })
  useEffect(() => {
    let active = true
    supabase.from('assessment_attempts').select('id,mode,status,started_at,submitted_at,duration_seconds,score,maximum_score,percentage,assessments(id,title,chapters(id,title,slug,legacy_id,subjects(id,name,slug,color,emoji))),attempt_questions(id,position,prompt_snapshot,options_snapshot,correct_option_snapshot,marks,attempt_responses(selected_option,is_correct,marks_awarded))').eq('id', attemptId).eq('status', 'submitted').single().then(({ data, error }) => active && setState({ attempt: data, loading: false, error }))
    return () => { active = false }
  }, [attemptId])

  if (state.loading) return <div className="card p-8 text-center">Loading your result…</div>
  if (state.error || !state.attempt) return <div className="card p-8 text-center"><h1 className="font-display font-extrabold text-xl">Result not found</h1><p className="text-sm text-ink/60 mt-2">This result may not belong to your account.</p><Link to="/progress" className="btn-secondary inline-flex mt-4">Back to progress</Link></div>

  const attempt = state.attempt
  const questions = [...(attempt.attempt_questions || [])].sort((a, b) => a.position - b.position)
  const percentage = Math.round(Number(attempt.percentage || 0))
  const chapter = attempt.assessments?.chapters
  const subject = chapter?.subjects

  return <div>
    <div className={`card p-6 text-center ${percentage >= 75 ? 'bg-leaf/40' : percentage >= 50 ? 'bg-sun/40' : 'bg-flame/25'}`}><div className="font-mono text-xs uppercase tracking-widest text-ink/60">Saved result</div><div className="heading-display text-5xl mt-2">{percentage}%</div><h1 className="font-display font-extrabold text-xl mt-2">{chapter?.title || attempt.assessments?.title}</h1><div className="text-sm text-ink/65 mt-1">{subject?.name} · {attempt.mode === 'practice' ? 'Practice quiz' : 'MCQ test'}</div></div>
    <div className="grid grid-cols-3 gap-2 my-4"><MiniStat label="Score" value={`${Number(attempt.score)}/${Number(attempt.maximum_score)}`} /><MiniStat label="Time" value={formatDuration(attempt.duration_seconds)} /><MiniStat label="Date" value={new Date(attempt.submitted_at).toLocaleDateString()} /></div>
    <div className="flex gap-2 mb-6"><Link to="/progress" className="btn-secondary flex-1">← Progress</Link>{chapter && <Link to={`/quiz/${subject.slug}/${chapter.legacy_id || chapter.slug}`} className="btn-primary flex-1">Retake quiz</Link>}</div>
    <h2 className="font-display font-extrabold text-xl mb-3">Answer review</h2>
    {!questions.length && <div className="card p-5 text-center text-ink/60">This test does not contain online questions.</div>}
    <div className="space-y-3">{questions.map(question => <QuestionResult key={question.id} question={question} />)}</div>
  </div>
}

function QuestionResult({ question }) {
  const response = question.attempt_responses?.[0]
  const selected = response?.selected_option
  const correct = question.correct_option_snapshot
  return <article className={`card p-4 ${response?.is_correct ? 'bg-leaf/10' : 'bg-flame/10'}`}><div className="flex justify-between gap-3"><div className="font-mono text-xs uppercase text-ink/60">Question {question.position}</div><span className={`chip text-[10px] py-0.5 ${response?.is_correct ? 'bg-leaf/40' : 'bg-flame/30'}`}>{response?.is_correct ? '✓ Correct' : selected ? '✗ Incorrect' : '— Skipped'}</span></div><div className="font-display font-bold mt-3" dangerouslySetInnerHTML={{ __html: toHTML(question.prompt_snapshot) }} /><div className="space-y-2 mt-3">{(question.options_snapshot || []).map((option, index) => { const isCorrect = option.id === correct; const isSelected = option.id === selected; return <div key={option.id} className={`rounded-xl border-2 p-3 flex gap-2 ${isCorrect ? 'border-ink bg-leaf/35' : isSelected ? 'border-ink bg-flame/30' : 'border-ink/20 bg-paper'}`}><span className="font-bold">{String.fromCharCode(65 + index)}.</span><span className="flex-1" dangerouslySetInnerHTML={{ __html: toHTML(option.text) }} />{isCorrect && <span>✓</span>}{isSelected && !isCorrect && <span>✗</span>}</div>})}</div></article>
}

function MiniStat({ label, value }) { return <div className="card p-3 text-center"><div className="font-display font-extrabold text-lg leading-tight">{value}</div><div className="text-[10px] font-mono uppercase text-ink/60 mt-1">{label}</div></div> }
function formatDuration(seconds = 0) { const minutes = Math.floor(seconds / 60); const remaining = seconds % 60; return minutes ? `${minutes}m ${remaining}s` : `${remaining}s` }

