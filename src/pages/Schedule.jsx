import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import { planProgress, useStudyPlan } from '../hooks/useStudyPlan.js'
import { supabase } from '../lib/supabase.js'
import { formatShort, todayISO } from '../utils/dates.js'

export default function Schedule() {
  const { plan, loading, error, reload } = useStudyPlan()
  if (loading) return <StateCard title="Loading your schedule…" />
  if (error) return <StateCard title="We couldn't load your schedule" detail={error.message} />
  if (!plan) return <CreatePlan onCreated={reload} />
  if (plan.status === 'draft') return <BuildPlan plan={plan} reload={reload} />
  return <ActivePlan plan={plan} reload={reload} />
}

function CreatePlan({ onCreated }) {
  const { user } = useAuth()
  const today = todayISO()
  const defaultEnd = new Date(); defaultEnd.setDate(defaultEnd.getDate() + 30)
  const end = `${defaultEnd.getFullYear()}-${String(defaultEnd.getMonth() + 1).padStart(2, '0')}-${String(defaultEnd.getDate()).padStart(2, '0')}`
  const [form, setForm] = useState({ name: 'My study plan', starts_on: today, ends_on: end })
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event) {
    event.preventDefault(); setBusy(true); setMessage('')
    const { data: year, error: yearError } = await supabase.from('academic_years').select('id,starts_on,ends_on').eq('is_current', true).single()
    if (yearError) { setBusy(false); return setMessage(yearError.message) }
    const { error } = await supabase.from('study_plans').insert({ student_id: user.id, academic_year_id: year.id, name: form.name.trim(), starts_on: form.starts_on, ends_on: form.ends_on, status: 'draft' })
    setBusy(false); if (error) setMessage(error.message); else onCreated()
  }
  return <div><Header eyebrow="No schedule yet" title="Create your schedule" text="Choose the dates for your plan. Next, add the chapters you want to study." />
    <form onSubmit={submit} className="card p-5 max-w-xl space-y-4">{message && <Notice>{message}</Notice>}<Field label="Plan name" value={form.name} onChange={name => setForm({ ...form, name })} /><div className="grid grid-cols-2 gap-3"><Field label="Starts on" type="date" value={form.starts_on} onChange={starts_on => setForm({ ...form, starts_on })} /><Field label="Ends on" type="date" min={form.starts_on} value={form.ends_on} onChange={ends_on => setForm({ ...form, ends_on })} /></div><button className="btn-primary w-full" disabled={busy}>{busy ? 'Creating…' : 'Continue to add tasks →'}</button></form>
  </div>
}

function BuildPlan({ plan, reload }) {
  const [chapters, setChapters] = useState([])
  const [subjects, setSubjects] = useState([])
  const [allSubjects, setAllSubjects] = useState([])
  const [form, setForm] = useState({ due_on: plan.starts_on, subject_id: '', chapter_id: '', task_type: 'chapter_study', overlap_confirmed: false })
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    Promise.all([
      supabase.from('subjects').select('id,name,parent_subject_id,sort_order').eq('status', 'published').order('sort_order'),
      supabase.from('chapters').select('id,subject_id,title,chapter_number').eq('status', 'published').order('chapter_number'),
    ]).then(([subjectResult, chapterResult]) => {
      const allSubjects = subjectResult.data || []
      const chapterSubjectIds = new Set((chapterResult.data || []).map(chapter => chapter.subject_id))
      setAllSubjects(allSubjects)
      setSubjects(allSubjects.filter(subject => !subject.parent_subject_id && (chapterSubjectIds.has(subject.id) || allSubjects.some(child => child.parent_subject_id === subject.id && chapterSubjectIds.has(child.id)))))
      setChapters(chapterResult.data || [])
    })
  }, [])
  const selectedSubjectIds = new Set([form.subject_id, ...allSubjects.filter(subject => subject.parent_subject_id === form.subject_id).map(subject => subject.id)])
  const visibleChapters = chapters.filter(chapter => selectedSubjectIds.has(chapter.subject_id))
  const overlaps = plan.schedule_tasks.some(task => task.due_on === form.due_on)
  async function addTask(event) {
    event.preventDefault(); setMessage('')
    if (overlaps && !form.overlap_confirmed) return setMessage('You already have a task on this date. Tick “Save anyway” to confirm the overlap.')
    setBusy(true)
    const { error } = await supabase.from('schedule_tasks').insert({ study_plan_id: plan.id, task_type: form.task_type, due_on: form.due_on, original_due_on: form.due_on, chapter_id: form.chapter_id, overlap_confirmed: overlaps && form.overlap_confirmed })
    setBusy(false); if (error) setMessage(error.message); else { setForm(current => ({ ...current, chapter_id: '', overlap_confirmed: false })); reload() }
  }
  async function activate() {
    if (!plan.schedule_tasks.length) return setMessage('Add at least one task before activating your schedule.')
    setBusy(true); const { error } = await supabase.from('study_plans').update({ status: 'active', activated_at: new Date().toISOString() }).eq('id', plan.id); setBusy(false); if (error) setMessage(error.message); else reload()
  }
  return <div><Header eyebrow="Draft schedule" title="Add your study tasks" text={`${formatShort(plan.starts_on)} to ${formatShort(plan.ends_on)} · Multiple tasks on one date are allowed with confirmation.`} />
    {message && <Notice>{message}</Notice>}
    <form onSubmit={addTask} className="card p-5 sm:p-6 space-y-4 max-w-xl">
      <Field label="Date" type="date" min={plan.starts_on} max={plan.ends_on} value={form.due_on} onChange={due_on => setForm({ ...form, due_on, overlap_confirmed: false })} />
      <SelectField label="Activity" value={form.task_type} onChange={task_type => setForm({ ...form, task_type })} options={[{ id: 'chapter_study', name: 'Study chapter' }, { id: 'chapter_quiz', name: 'Take chapter quiz' }]} />
      <SelectField label="Subject" required placeholder="Choose a subject" value={form.subject_id} onChange={subject_id => setForm({ ...form, subject_id, chapter_id: '' })} options={subjects} />
      <SelectField label="Chapter" required disabled={!form.subject_id} placeholder={form.subject_id ? 'Choose a chapter' : 'Select a subject first'} value={form.chapter_id} onChange={chapter_id => setForm({ ...form, chapter_id })} options={visibleChapters.map(chapter => { const owner = allSubjects.find(subject => subject.id === chapter.subject_id); return { id: chapter.id, name: owner?.parent_subject_id ? `${owner.name} · ${chapter.chapter_number}. ${chapter.title}` : `${chapter.chapter_number}. ${chapter.title}` } })} />
      {overlaps && <label className="flex gap-3 items-start rounded-2xl border-2 border-ink bg-sun/15 p-3 text-sm"><input className="mt-1" type="checkbox" checked={form.overlap_confirmed} onChange={e => setForm({ ...form, overlap_confirmed: e.target.checked })} /><span>Save anyway—I understand there are multiple tasks on this date.</span></label>}
      <button className="btn-secondary w-full sm:w-auto" disabled={busy}>+ Add task</button>
    </form>
    <TaskList tasks={plan.schedule_tasks} editable={false} />
    <button className="btn-primary w-full mt-5" onClick={activate} disabled={busy || !plan.schedule_tasks.length}>Activate my schedule</button>
  </div>
}

function ActivePlan({ plan, reload }) {
  const progress = planProgress(plan)
  async function complete(task) { if (task.status === 'completed') return; await supabase.from('schedule_tasks').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', task.id); reload() }
  return <div><div className="flex items-end justify-between mb-4"><Header eyebrow={progress.complete ? 'Plan completed' : 'Active study plan'} title={plan.name} text={`${formatShort(plan.starts_on)} to ${formatShort(plan.ends_on)}`} compact /><div className="text-right"><div className="font-display font-extrabold text-3xl">{progress.completed}<span className="text-base text-ink/50">/{progress.total}</span></div><div className="text-xs font-mono uppercase text-ink/60">tasks done</div></div></div>{progress.complete && <Notice>🎉 Schedule complete—all planned tasks are finished.</Notice>}<div className="grid grid-cols-2 gap-2 mb-4"><Link to="/tests" className="btn-primary">+ Add a test</Link><Link to="/chapters" className="btn-secondary">Browse chapters</Link></div><TaskList tasks={progress.tasks} onComplete={complete} editable /></div>
}

function TaskList({ tasks, onComplete, editable }) { return <div className="space-y-2 mt-5">{tasks.length === 0 && <div className="card p-5 text-center text-ink/60">No tasks added yet.</div>}{tasks.map(task => { const chapter = task.chapters; const subject = chapter?.subjects; const isTest = task.task_type === 'mock_test'; return <div className={`card p-3 flex gap-3 items-center ${task.status === 'completed' ? 'bg-leaf/15' : ''}`} key={task.id}>{editable && !isTest && <button onClick={() => onComplete(task)} disabled={task.status === 'completed'} className={`w-9 h-9 rounded-xl border-2 border-ink grid place-items-center ${task.status === 'completed' ? 'bg-leaf' : 'bg-paper'}`}>{task.status === 'completed' ? '✓' : ''}</button>}<div className="w-10 h-10 rounded-xl border-2 border-ink grid place-items-center" style={{ backgroundColor: subject?.color || '#fff' }}>{isTest ? '📝' : subject?.emoji || '📚'}</div><div className="flex-1 min-w-0"><div className="text-[10px] font-mono uppercase text-ink/60">{formatShort(task.due_on)} · {task.task_type.replace('_', ' ')}</div><div className={`font-bold truncate ${task.status === 'completed' ? 'line-through text-ink/60' : ''}`}>{isTest ? task.assessments?.title : chapter?.title}</div></div>{isTest ? <Link className="text-xl" to="/tests">›</Link> : chapter && <Link className="text-xl" to={`/chapter/${subject.slug}/${chapter.legacy_id || chapter.slug}`}>›</Link>}</div>})}</div> }
function Header({ eyebrow, title, text, compact }) { return <div className={compact ? '' : 'mb-5'}><div className="font-mono text-xs uppercase tracking-widest text-ink/60">{eyebrow}</div><h1 className="heading-display text-3xl">{title}</h1><p className="text-ink/65 mt-1">{text}</p></div> }
function StateCard({ title, detail }) { return <div className="card p-8 text-center"><h1 className="font-display font-extrabold text-xl">{title}</h1>{detail && <p className="text-sm mt-2">{detail}</p>}</div> }
function Notice({ children }) { return <div className="card p-3 mb-4 bg-sky/20 text-sm">{children}</div> }
function Label({ children }) { return <span className="text-xs font-mono uppercase text-ink/60">{children}</span> }
function Field({ label, type = 'text', value, onChange, min, max }) { return <label className="block"><Label>{label}</Label><input className="form-control" required type={type} min={min} max={max} value={value} onChange={e => onChange(e.target.value)} /></label> }
function SelectField({ label, value, onChange, options, placeholder, required, disabled }) { return <label className="block"><Label>{label}</Label><select className="form-control" required={required} disabled={disabled} value={value} onChange={e => onChange(e.target.value)}>{placeholder && <option value="">{placeholder}</option>}{options.map(option => <option value={option.id} key={option.id}>{option.name}</option>)}</select></label> }
