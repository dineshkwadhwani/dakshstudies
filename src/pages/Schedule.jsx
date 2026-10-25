import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import { planProgress, useStudyPlan } from '../hooks/useStudyPlan.js'
import { supabase } from '../lib/supabase.js'
import { formatShort, todayISO } from '../utils/dates.js'

const PLAN_TYPES = [
  { id: 'daily', title: 'Daily plan', text: 'Plan individual tasks on any dates.' },
  { id: 'weekly', title: 'One-week plan', text: 'Plan a full seven-day week.' },
  { id: 'multi_week', title: 'Multi-week plan', text: 'Plan across several weeks.' },
]

export default function Schedule() {
  const { user } = useAuth()
  const { plan, loading, error, reload } = useStudyPlan()
  const [packageCode, setPackageCode] = useState('FREE')
  const [packageLoading, setPackageLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function loadPackage() {
      if (!user) return
      const { data } = await supabase
        .from('student_entitlements')
        .select('status,ends_at,packages(code)')
        .eq('student_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (active) {
        setPackageCode(data?.packages?.code || 'FREE')
        setPackageLoading(false)
      }
    }
    loadPackage()
    return () => { active = false }
  }, [user])

  if (loading || packageLoading) return <StateCard title="Loading your schedule…" />
  if (error) return <StateCard title="We couldn't load your schedule" detail={error.message} />
  if (!plan) return <CreatePlan packageCode={packageCode} onCreated={reload} />
  return <ScheduleEditor plan={plan} packageCode={packageCode} reload={reload} />
}

function CreatePlan({ packageCode, onCreated }) {
  const { user } = useAuth()
  const [planType, setPlanType] = useState('daily')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function createPlan(event) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    const { data: year, error: yearError } = await supabase
      .from('academic_years')
      .select('id,starts_on,ends_on')
      .eq('is_current', true)
      .single()
    if (yearError) { setBusy(false); return setMessage(yearError.message) }

    const today = todayISO()
    const start = planType === 'daily' ? today : startOfWeek(today)
    const end = planType === 'daily'
      ? year.ends_on
      : addDays(start, planType === 'weekly' ? 6 : 27)
    const { error } = await supabase.from('study_plans').insert({
      student_id: user.id,
      academic_year_id: year.id,
      name: planType === 'daily' ? 'My daily plan' : planType === 'weekly' ? 'My weekly plan' : 'My multi-week plan',
      plan_type: planType,
      starts_on: start < year.starts_on ? year.starts_on : start,
      ends_on: end > year.ends_on ? year.ends_on : end,
      status: 'active',
      activated_at: new Date().toISOString(),
    })
    setBusy(false)
    if (error) return setMessage(error.message)
    onCreated()
  }

  return <div>
    <Header eyebrow="No plan yet" title="Create your study plan" text="Choose the planning style that fits your study routine." />
    <form onSubmit={createPlan} className="space-y-3 max-w-xl">
      {PLAN_TYPES.map(type => {
        const locked = type.id === 'multi_week' && !['BASIC', 'PRO'].includes(packageCode)
        return <label key={type.id} className={`card p-4 flex gap-3 items-start cursor-pointer ${locked ? 'opacity-70' : ''}`}>
          <input className="mt-1 w-5 h-5 accent-[#FFC857]" type="radio" name="plan-type" value={type.id} checked={planType === type.id} disabled={locked} onChange={() => setPlanType(type.id)} />
          <span className="flex-1"><span className="font-display font-extrabold block">{type.title}{locked && <span className="chip bg-sun/40 text-[10px] ml-2 align-middle">Basic or Pro</span>}</span><span className="text-sm text-ink/60">{type.text}</span></span>
          {locked && <Link className="btn-secondary text-xs px-2 py-1" to="/">Upgrade</Link>}
        </label>
      })}
      {packageCode === 'FREE' && <Notice>Free plans can use Daily or One-week planning. Daily planning allows up to 7 total tasks, spread across any dates.</Notice>}
      {message && <Notice>{message}</Notice>}
      <button className="btn-primary w-full" disabled={busy}>{busy ? 'Creating…' : 'Start planning →'}</button>
    </form>
  </div>
}

function ScheduleEditor({ plan, packageCode, reload }) {
  const [catalog, setCatalog] = useState({ subjects: [], chapters: [], tests: [] })
  const [catalogError, setCatalogError] = useState('')
  const [selectedDate, setSelectedDate] = useState(null)
  const [message, setMessage] = useState('')
  const progress = planProgress(plan)

  useEffect(() => {
    let active = true
    async function loadCatalog() {
      const [subjectResult, chapterResult, testResult] = await Promise.all([
        supabase.from('subjects').select('id,name,parent_subject_id,sort_order,slug').eq('status', 'published').order('sort_order'),
        supabase.from('chapters').select('id,subject_id,title,chapter_number,slug,legacy_id').eq('status', 'published').order('chapter_number'),
        supabase.from('assessments').select('id,title,subject_id,assessment_type,status,assessment_sections(subject_id)').eq('assessment_type', 'pdf_mock_test').eq('status', 'published').order('title'),
      ])
      if (!active) return
      const error = subjectResult.error || chapterResult.error || testResult.error
      if (error) setCatalogError(error.message)
      setCatalog({ subjects: subjectResult.data || [], chapters: chapterResult.data || [], tests: testResult.data || [] })
    }
    loadCatalog()
    return () => { active = false }
  }, [])

  async function savePlanName(name) {
    const { error } = await supabase.from('study_plans').update({ name: name.trim() || plan.name }).eq('id', plan.id)
    if (error) setMessage(error.message)
    else reload()
  }

  async function saveTask(values, task = null) {
    setMessage('')
    if (!values.due_on || !values.subject_id || (!values.chapter_id && !values.assessment_id)) return setMessage('Choose a date, subject and study item.')
    if (values.due_on < plan.starts_on || values.due_on > plan.ends_on) return setMessage('Choose a date inside this plan.')
    if (!task && plan.plan_type === 'daily' && packageCode === 'FREE' && activeTaskCount(plan) >= 7) return setMessage('Your Free Daily plan allows 7 total tasks. Upgrade to add more.')
    const existingOnDate = plan.schedule_tasks.some(item => item.due_on === values.due_on && item.id !== task?.id && item.status !== 'cancelled')
    const row = {
      task_type: values.kind === 'test' ? 'mock_test' : 'chapter_study',
      due_on: values.due_on,
      chapter_id: values.kind === 'study' ? values.chapter_id : null,
      assessment_id: values.kind === 'test' ? values.assessment_id : null,
      overlap_confirmed: existingOnDate,
      status: task?.status === 'completed' ? 'completed' : 'scheduled',
      completed_at: task?.status === 'completed' ? task.completed_at : null,
    }
    const result = task
      ? await supabase.from('schedule_tasks').update(row).eq('id', task.id)
      : await supabase.from('schedule_tasks').insert({ ...row, study_plan_id: plan.id, original_due_on: values.due_on })
    if (result.error) return setMessage(result.error.message)
    reload()
    setSelectedDate(null)
  }

  async function removeTask(task) {
    setMessage('')
    const { error } = await supabase.from('schedule_tasks').update({ status: 'cancelled', cancelled_at: new Date().toISOString() }).eq('id', task.id)
    if (error) setMessage(error.message)
    else reload()
  }

  async function toggleTask(task) {
    const completed = task.status !== 'completed'
    const { error } = await supabase.from('schedule_tasks').update({ status: completed ? 'completed' : 'scheduled', completed_at: completed ? new Date().toISOString() : null, missed_at: null }).eq('id', task.id)
    if (error) setMessage(error.message)
    else reload()
  }

  const visibleTasks = plan.schedule_tasks.filter(task => task.status !== 'cancelled')
  const selectedTasks = selectedDate ? visibleTasks.filter(task => task.due_on === selectedDate) : []
  return <div>
    <div className="flex flex-wrap gap-3 items-end justify-between mb-4">
      <div className="flex-1"><Header eyebrow={`${labelForPlan(plan.plan_type)} · ${progress.completed}/${progress.total} complete`} title={plan.name} text={`${formatShort(plan.starts_on)} to ${formatShort(plan.ends_on)}`} compact /></div>
      <PlanNameEditor name={plan.name} onSave={savePlanName} />
    </div>
    {plan.plan_type === 'daily' && packageCode === 'FREE' && <Notice>{Math.min(activeTaskCount(plan), 7)}/7 Free Daily tasks used. Tasks can be spread across any dates.</Notice>}
    {message && <Notice>{message}</Notice>}
    {catalogError && <Notice>{catalogError}</Notice>}
    <Calendar plan={plan} tasks={visibleTasks} onSelect={setSelectedDate} />
    <div className="flex gap-2 mt-4"><Link to="/tests" className="btn-secondary flex-1">+ Add a test</Link><Link to="/chapters" className="btn-secondary flex-1">Browse chapters</Link></div>
    <div className="card p-4 mt-4"><div className="flex items-center justify-between"><h2 className="font-display font-extrabold text-lg">Plan summary</h2><span className="chip bg-sky/20">{visibleTasks.length} tasks</span></div><p className="text-sm text-ink/60 mt-1">Select any date to add, edit, complete or remove tasks. Completed dates remain editable.</p></div>
    {selectedDate && <TaskModal date={selectedDate} tasks={selectedTasks} catalog={catalog} plan={plan} onClose={() => setSelectedDate(null)} onSave={saveTask} onDelete={removeTask} onToggle={toggleTask} />}
  </div>
}

function Calendar({ plan, tasks, onSelect }) {
  const [cursor, setCursor] = useState(plan.starts_on)
  const weekly = plan.plan_type !== 'daily'
  const dates = weekly ? weekDates(cursor) : monthDates(cursor)
  const byDate = useMemo(() => tasks.reduce((map, task) => { (map[task.due_on] ||= []).push(task); return map }, {}), [tasks])
  function move(direction) { setCursor(weekly ? addDays(cursor, direction * 7) : addMonths(cursor, direction)) }
  return <section className="card p-3 sm:p-4">
    <div className="flex items-center justify-between mb-3"><button type="button" className="btn-secondary px-3 py-2" aria-label="Previous period" onClick={() => move(-1)}>←</button><div className="font-display font-extrabold text-lg">{weekly ? `Week of ${formatShort(startOfWeek(cursor))}` : monthLabel(cursor)}</div><button type="button" className="btn-secondary px-3 py-2" aria-label="Next period" onClick={() => move(1)}>→</button></div>
    <div className="grid grid-cols-7 gap-1 mb-1">{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day => <div className="text-center text-[10px] font-mono uppercase text-ink/50" key={day}>{day}</div>)}</div>
    <div className="grid grid-cols-7 gap-1">{dates.map(date => <CalendarCell key={date} date={date} tasks={byDate[date] || []} muted={weekly ? false : !date.startsWith(cursor.slice(0, 7))} onSelect={onSelect} />)}</div>
  </section>
}

function CalendarCell({ date, tasks, muted, onSelect }) {
  const complete = tasks.length > 0 && tasks.every(task => task.status === 'completed')
  const missed = tasks.some(task => task.status === 'missed')
  const partial = tasks.some(task => task.status === 'completed') && !complete
  return <button type="button" onClick={() => onSelect(date)} className={`min-h-24 sm:min-h-28 rounded-xl border-2 text-left p-1.5 transition-all ${muted ? 'opacity-40' : ''} ${missed ? 'bg-flame/15 border-flame' : complete ? 'bg-leaf/20 border-leaf' : partial ? 'bg-sun/20 border-sun' : 'bg-paper border-ink/15 hover:border-ink'}`}>
    <div className="flex items-center justify-between"><span className="font-display font-extrabold text-sm">{dayNumber(date)}</span><span>{complete ? '✓' : missed ? '×' : partial ? '•' : ''}</span></div>
    <div className="space-y-1 mt-1">{tasks.slice(0, 3).map(task => <div key={task.id} className={`rounded-md px-1 py-0.5 text-[10px] leading-tight truncate ${task.status === 'completed' ? 'bg-leaf/40 line-through' : task.status === 'missed' ? 'bg-flame/30' : 'bg-sky/25'}`}>{taskLabel(task)}</div>)}{tasks.length > 3 && <div className="text-[10px] text-ink/55">+{tasks.length - 3} more</div>}</div>
  </button>
}

function TaskModal({ date, tasks, catalog, plan, onClose, onSave, onDelete, onToggle }) {
  const [form, setForm] = useState({ kind: 'study', due_on: date, subject_id: '', chapter_id: '', assessment_id: '' })
  const [editing, setEditing] = useState(null)
  const [localError, setLocalError] = useState('')
  const subjects = catalog.subjects.filter(subject => !subject.parent_subject_id)
  const subjectIds = subjectAndChildren(catalog.subjects, form.subject_id)
  const chapters = catalog.chapters.filter(chapter => subjectIds.has(chapter.subject_id))
  const tests = catalog.tests.filter(test => testSubjectIds(test).some(id => subjectIds.has(id)) || (test.subject_id && subjectIds.has(test.subject_id)))
  const edit = task => {
    const kind = task.task_type === 'mock_test' ? 'test' : 'study'
    const subjectId = kind === 'study' ? task.chapters?.subjects?.id || task.chapters?.subjects?.parent_subject_id || '' : testSubjectIds(task.assessments || {})[0] || ''
    setEditing(task)
    setForm({ kind, due_on: task.due_on, subject_id: subjectId, chapter_id: task.chapter_id || '', assessment_id: task.assessment_id || '' })
    setLocalError('')
  }
  const reset = () => { setEditing(null); setForm({ kind: 'study', due_on: date, subject_id: '', chapter_id: '', assessment_id: '' }); setLocalError('') }
  const submit = async event => { event.preventDefault(); setLocalError(''); try { await onSave(form, editing); reset() } catch (error) { setLocalError(error.message) } }
  return <div className="fixed inset-0 z-50 bg-ink/60 p-4 grid place-items-center" role="dialog" aria-modal="true" aria-label={`Schedule for ${formatShort(date)}`}>
    <div className="card bg-paper w-full max-w-xl max-h-[90vh] overflow-y-auto p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3"><div><div className="font-mono text-xs uppercase tracking-widest text-ink/55">Schedule date</div><h2 className="heading-display text-2xl">{formatShort(date)}</h2></div><button type="button" className="btn-secondary px-3 py-2" onClick={onClose}>Close</button></div>
      {tasks.length > 0 && <div className="space-y-2 mt-5"><h3 className="font-display font-extrabold">Existing tasks</h3>{tasks.map(task => <div key={task.id} className="rounded-xl border-2 border-ink/20 p-3 flex gap-3 items-center"><div className="flex-1 min-w-0"><div className="text-xs font-mono uppercase text-ink/55">{task.status} · {task.task_type === 'mock_test' ? 'Test' : 'Study'}</div><div className="font-bold truncate">{task.task_type === 'mock_test' ? task.assessments?.title : task.chapters?.title}</div></div><button type="button" className="btn-secondary text-xs px-2 py-1" onClick={() => onToggle(task)}>{task.status === 'completed' ? 'Mark open' : 'Complete'}</button><button type="button" className="btn-secondary text-xs px-2 py-1" onClick={() => edit(task)}>Edit</button><button type="button" className="btn-secondary text-xs px-2 py-1" onClick={() => onDelete(task)}>Remove</button></div>)}</div>}
      <form onSubmit={submit} className="border-t-2 border-ink/15 mt-5 pt-5 space-y-3"><h3 className="font-display font-extrabold">{editing ? 'Edit task' : 'Add another task'}</h3>{localError && <Notice>{localError}</Notice>}<Field label="Date" type="date" value={form.due_on} min={plan.starts_on} max={plan.ends_on} onChange={due_on => setForm({ ...form, due_on })} /><SelectField label="Activity" value={form.kind} onChange={kind => setForm({ ...form, kind, chapter_id: '', assessment_id: '' })} options={[{ id: 'study', name: 'Study' }, { id: 'test', name: 'Test' }]} /><SelectField label="Subject" required placeholder="Choose a subject" value={form.subject_id} onChange={subject_id => setForm({ ...form, subject_id, chapter_id: '', assessment_id: '' })} options={subjects} />{form.kind === 'study' ? <SelectField label="Chapter" required disabled={!form.subject_id} placeholder="Choose a chapter" value={form.chapter_id} onChange={chapter_id => setForm({ ...form, chapter_id })} options={chapters.map(chapter => ({ id: chapter.id, name: `${chapter.chapter_number}. ${chapter.title}` }))} /> : <SelectField label="Test" required disabled={!form.subject_id} placeholder="Choose a test" value={form.assessment_id} onChange={assessment_id => setForm({ ...form, assessment_id })} options={tests.map(test => ({ id: test.id, name: test.title }))} />}<div className="flex gap-2"><button className="btn-primary" type="submit">{editing ? 'Save changes' : 'Save task'}</button>{editing && <button type="button" className="btn-secondary" onClick={reset}>Cancel edit</button>}</div></form>
    </div>
  </div>
}

function PlanNameEditor({ name, onSave }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(name)
  if (!editing) return <button type="button" className="btn-secondary text-xs" onClick={() => setEditing(true)}>Edit plan name</button>
  return <form className="flex gap-2" onSubmit={event => { event.preventDefault(); onSave(value); setEditing(false) }}><input className="form-control max-w-44" value={value} onChange={event => setValue(event.target.value)} aria-label="Plan name" /><button className="btn-primary text-xs">Save</button></form>
}

function activeTaskCount(plan) { return plan.schedule_tasks.filter(task => task.status !== 'cancelled').length }
function labelForPlan(type) { return type === 'multi_week' ? 'Multi-week plan' : type === 'weekly' ? 'One-week plan' : 'Daily plan' }
function taskLabel(task) { if (task.task_type === 'mock_test') return `Test · ${task.assessments?.title || 'Mock test'}`; const subject = task.chapters?.subjects; const prefix = subject?.name ? subject.name.slice(0, 3).toUpperCase() : 'ST'; return `${prefix} · Ch ${task.chapters?.chapter_number || ''}` }
function subjectAndChildren(subjects, subjectId) { return new Set([subjectId, ...subjects.filter(subject => subject.parent_subject_id === subjectId).map(subject => subject.id)].filter(Boolean)) }
function testSubjectIds(test) { return (test.assessment_sections || []).map(section => section.subject_id).filter(Boolean) }
function parseDate(iso) { const [year, month, day] = iso.split('-').map(Number); return new Date(year, month - 1, day) }
function isoDate(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }
function addDays(iso, amount) { const date = parseDate(iso); date.setDate(date.getDate() + amount); return isoDate(date) }
function addMonths(iso, amount) { const date = parseDate(iso); date.setMonth(date.getMonth() + amount); return isoDate(date) }
function startOfWeek(iso) { const date = parseDate(iso); const mondayOffset = (date.getDay() + 6) % 7; date.setDate(date.getDate() - mondayOffset); return isoDate(date) }
function weekDates(iso) { const start = startOfWeek(iso); return Array.from({ length: 7 }, (_, index) => addDays(start, index)) }
function monthDates(iso) { const date = parseDate(iso); const first = new Date(date.getFullYear(), date.getMonth(), 1); const offset = (first.getDay() + 6) % 7; const start = new Date(date.getFullYear(), date.getMonth(), 1 - offset); return Array.from({ length: 42 }, (_, index) => { const current = new Date(start); current.setDate(start.getDate() + index); return isoDate(current) }) }
function dayNumber(iso) { return parseDate(iso).getDate() }
function monthLabel(iso) { return parseDate(iso).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) }

function Header({ eyebrow, title, text, compact }) { return <div className={compact ? '' : 'mb-5'}><div className="font-mono text-xs uppercase tracking-widest text-ink/60">{eyebrow}</div><h1 className="heading-display text-3xl">{title}</h1><p className="text-ink/65 mt-1">{text}</p></div> }
function StateCard({ title, detail }) { return <div className="card p-8 text-center"><h1 className="font-display font-extrabold text-xl">{title}</h1>{detail && <p className="text-sm mt-2">{detail}</p>}</div> }
function Notice({ children }) { return <div className="card p-3 mb-4 bg-sky/20 text-sm">{children}</div> }
function Label({ children }) { return <span className="text-xs font-mono uppercase text-ink/60">{children}</span> }
function Field({ label, type = 'text', value, onChange, min, max }) { return <label className="block"><Label>{label}</Label><input className="form-control" required type={type} min={min} max={max} value={value} onChange={event => onChange(event.target.value)} /></label> }
function SelectField({ label, value, onChange, options, placeholder, required, disabled }) { return <label className="block"><Label>{label}</Label><select className="form-control" required={required} disabled={disabled} value={value} onChange={event => onChange(event.target.value)}>{placeholder && <option value="">{placeholder}</option>}{options.map(option => <option value={option.id} key={option.id}>{option.name}</option>)}</select></label> }
