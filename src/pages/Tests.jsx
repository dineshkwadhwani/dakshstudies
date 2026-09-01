import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import { useStudyPlan } from '../hooks/useStudyPlan.js'
import { supabase } from '../lib/supabase.js'
import { formatShort, todayISO } from '../utils/dates.js'

export default function Tests() {
  const { user } = useAuth()
  const { plan, loading, reload: reloadPlan } = useStudyPlan()
  const [tests, setTests] = useState([])
  const [attempts, setAttempts] = useState([])
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ assessmentId: '', dueOn: todayISO() })
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    const [catalog, history] = await Promise.all([
      supabase.from('assessments').select('id,title,maximum_marks,assessment_resources(id,purpose,assessment_sections(id,title,sort_order),content_resources(id,title,content_resource_versions(version,storage_path,mime_type)))').eq('assessment_type', 'pdf_mock_test').eq('status', 'published').order('title'),
      user ? supabase.from('assessment_attempts').select('id,assessment_id,schedule_task_id,status,started_at,submitted_at').eq('student_id', user.id).eq('mode', 'manual').order('started_at', { ascending: false }) : Promise.resolve({ data: [] }),
    ])
    if (catalog.error) setMessage(catalog.error.message)
    setTests(catalog.data || []); setAttempts(history.data || [])
  }
  useEffect(() => { load() }, [user])

  const scheduled = (plan?.schedule_tasks || []).filter(task => task.task_type === 'mock_test' && task.status !== 'cancelled')
  const unscheduled = tests.filter(test => !scheduled.some(task => task.assessment_id === test.id))

  async function execute(assessmentId, dueOn, startNow) {
    if (!plan) return setMessage('Create your study plan before adding a mock test.')
    setBusy(true); setMessage('')
    const { error } = await supabase.rpc('schedule_mock_test', { p_assessment_id: assessmentId, p_due_on: dueOn, p_start_now: startNow })
    setBusy(false)
    if (error) return setMessage(error.message)
    setMessage(startNow ? 'Test started and added to today’s schedule.' : 'Test added to your schedule.')
    await Promise.all([reloadPlan(), load()])
  }
  async function scheduleTest(event) { event.preventDefault(); await execute(form.assessmentId, form.dueOn, false); setAdding(false); setForm({ assessmentId: '', dueOn: todayISO() }) }
  async function finish(attemptId) {
    setBusy(true); const { error } = await supabase.rpc('finish_mock_test', { p_attempt_id: attemptId }); setBusy(false)
    if (error) setMessage(error.message); else { setMessage('Test completed. Answer keys are now available.'); await Promise.all([reloadPlan(), load()]) }
  }

  if (loading) return <div className="card p-8 text-center">Loading tests…</div>
  return <div>
    <div className="mb-5"><div className="font-mono text-xs uppercase tracking-widest text-ink/60">Your study plan</div><h1 className="heading-display text-3xl">Mock Tests</h1><p className="text-ink/70 mt-1">Schedule a test for later or start one immediately.</p></div>
    {message && <div className="card p-3 mb-4 bg-sky/20 text-sm">{message}</div>}
    {!plan ? <EmptyPlan /> : <>
      <div className="grid grid-cols-2 gap-2 mb-5"><button className="btn-primary" onClick={() => setAdding(!adding)}>+ Add test</button>{unscheduled[0] && <button disabled={busy} className="btn-secondary" onClick={() => execute(unscheduled[0].id, todayISO(), true)}>▶ Run test now</button>}</div>
      {adding && <AddTestForm form={form} setForm={setForm} tests={unscheduled} busy={busy} onSubmit={scheduleTest} />}
      <h2 className="font-display font-extrabold text-xl mb-3">Scheduled tests</h2>
      {!scheduled.length && <div className="card p-5 text-center text-ink/60">No tests scheduled yet.</div>}
      <div className="space-y-3">{scheduled.map(task => { const test = tests.find(item => item.id === task.assessment_id); if (!test) return null; const attempt = attempts.find(item => item.schedule_task_id === task.id); return <TestCard key={task.id} task={task} test={test} attempt={attempt} busy={busy} onRun={() => execute(test.id, todayISO(), true)} onFinish={() => finish(attempt.id)} /> })}</div>
      {!!unscheduled.length && <AvailableTests tests={unscheduled} busy={busy} onRun={id => execute(id, todayISO(), true)} />}
    </>}
  </div>
}

function EmptyPlan() { return <div className="card p-6 text-center"><h2 className="font-display font-extrabold text-xl">Create a schedule first</h2><p className="text-sm text-ink/60 mt-1">Tests belong to your personal study plan.</p><Link to="/schedule" className="btn-primary inline-flex mt-4">Create schedule</Link></div> }
function AddTestForm({ form, setForm, tests, busy, onSubmit }) { return <form onSubmit={onSubmit} className="card p-5 mb-5 space-y-4"><label className="block"><span className="text-xs font-mono uppercase">Test</span><select required className="form-control" value={form.assessmentId} onChange={e => setForm({ ...form, assessmentId: e.target.value })}><option value="">Choose a test…</option>{tests.map(test => <option value={test.id} key={test.id}>{test.title}</option>)}</select></label><label className="block"><span className="text-xs font-mono uppercase">Date</span><input required className="form-control" type="date" value={form.dueOn} onChange={e => setForm({ ...form, dueOn: e.target.value })} /></label><button disabled={busy} className="btn-primary w-full">Add to schedule</button></form> }
function AvailableTests({ tests, busy, onRun }) { return <section className="mt-7"><h2 className="font-display font-extrabold text-xl mb-3">Available tests</h2><div className="space-y-2">{tests.map(test => <div className="card p-4 flex items-center gap-3" key={test.id}><div className="text-2xl">📝</div><div className="flex-1"><div className="font-bold">{test.title}</div><div className="text-xs text-ink/60">{Number(test.maximum_marks)} marks</div></div><button disabled={busy} onClick={() => onRun(test.id)} className="btn-secondary text-sm px-3 py-2">Run now</button></div>)}</div></section> }

function TestCard({ task, test, attempt, busy, onRun, onFinish }) {
  const submitted = attempt?.status === 'submitted' || task.status === 'completed'
  const started = attempt?.status === 'started'
  const resources = [...(test.assessment_resources || [])].sort((a, b) => (a.assessment_sections?.sort_order || 0) - (b.assessment_sections?.sort_order || 0))
  const sections = [...new Set(resources.map(resource => resource.assessment_sections?.title || 'Test'))]
  return <div className={`card p-4 ${started ? 'bg-sun/15' : submitted ? 'bg-leaf/15' : ''}`}><div className="flex items-start gap-3"><div className="w-12 h-12 rounded-xl border-2 border-ink grid place-items-center text-xl bg-flame/20">{submitted ? '✓' : '📝'}</div><div className="flex-1"><h3 className="font-display font-extrabold text-lg">{test.title}</h3><div className="text-xs text-ink/60">{formatShort(task.due_on)} · {started ? 'In progress' : submitted ? 'Completed' : 'Scheduled'}</div></div>{!started && !submitted && <button disabled={busy} onClick={onRun} className="btn-primary text-sm px-3 py-2">Run now</button>}</div>
    {(started || submitted) && <div className="grid sm:grid-cols-3 gap-2 mt-4">{sections.map(section => <PaperSection key={section} section={section} resources={resources.filter(resource => (resource.assessment_sections?.title || 'Test') === section)} showAnswers={submitted} testTitle={test.title} />)}</div>}
    {started && <button disabled={busy} onClick={onFinish} className="btn-primary w-full mt-4 bg-leaf">Finish test and reveal answers</button>}
  </div>
}

function PaperSection({ section, resources, showAnswers, testTitle }) {
  return <div className="rounded-2xl border-2 border-ink p-3 bg-paper"><div className="font-bold mb-2">{section}</div><div className="grid grid-cols-2 gap-2">{resources.filter(resource => resource.purpose === 'question_paper' || showAnswers).map(resource => { const version = [...(resource.content_resources?.content_resource_versions || [])].sort((a,b) => b.version-a.version)[0]; if (!version) return null; const params = new URLSearchParams({ path: version.storage_path, title: `${testTitle} · ${section}`, back: '/tests' }); return <Link key={resource.id} to={`/pdf?${params}`} className={`text-xs font-bold text-center rounded-lg border-2 border-ink p-2 ${resource.purpose === 'answer_key' ? 'bg-leaf/30' : 'bg-flame/20'}`}>{resource.purpose === 'answer_key' ? 'Answers' : 'Question paper'}</Link> })}</div></div>
}

