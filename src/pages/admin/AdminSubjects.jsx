import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'

const slugify = value => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export default function AdminSubjects() {
  const [subjects, setSubjects] = useState([])
  const [curricula, setCurricula] = useState([])
  const [subjectForm, setSubjectForm] = useState({ name: '', parent_subject_id: '', color: '#FFD166', emoji: '📚' })
  const [chapterForm, setChapterForm] = useState({ subject_id: '', chapter_number: '', title: '' })
  const [message, setMessage] = useState('')

  async function load() {
    const [{ data: subjectData, error }, { data: curriculumData }] = await Promise.all([
      supabase.from('subjects').select('id,name,slug,parent_subject_id,status,color,emoji,sort_order,chapters(id)').order('sort_order'),
      supabase.from('curricula').select('id,name').eq('status', 'published').limit(1),
    ])
    if (error) return setMessage(error.message)
    setSubjects(subjectData || []); setCurricula(curriculumData || [])
  }
  useEffect(() => { load() }, [])

  async function addSubject(event) {
    event.preventDefault(); setMessage('')
    const { error } = await supabase.from('subjects').insert({ curriculum_id: curricula[0]?.id, name: subjectForm.name.trim(), slug: slugify(subjectForm.name), parent_subject_id: subjectForm.parent_subject_id || null, color: subjectForm.color, emoji: subjectForm.emoji, status: 'published', sort_order: subjects.length + 1 })
    if (error) return setMessage(error.message)
    setSubjectForm({ name: '', parent_subject_id: '', color: '#FFD166', emoji: '📚' }); setMessage('Subject created.'); load()
  }
  async function addChapter(event) {
    event.preventDefault(); setMessage('')
    const number = Number(chapterForm.chapter_number)
    const { error } = await supabase.from('chapters').insert({ subject_id: chapterForm.subject_id, chapter_number: number, title: chapterForm.title.trim(), slug: slugify(chapterForm.title), sort_order: number, status: 'published' })
    if (error) return setMessage(error.message)
    setChapterForm({ subject_id: '', chapter_number: '', title: '' }); setMessage('Chapter created.'); load()
  }

  return <div><PageTitle eyebrow="Content catalogue" title="Subjects & chapters" text="Create the curriculum structure students will see." />
    {message && <div className="card p-3 mb-4 bg-sky/20">{message}</div>}
    <div className="grid lg:grid-cols-2 gap-5 items-start">
      <Form number="1" title="Create subject" text="Add a main subject or a section within an existing subject." onSubmit={addSubject}>
        <Input label="Subject name" placeholder="For example, Mathematics" value={subjectForm.name} onChange={name => setSubjectForm({ ...subjectForm, name })} />
        <Select label="Parent subject" hint="Optional — use this for sections such as History or Geography." value={subjectForm.parent_subject_id} onChange={parent_subject_id => setSubjectForm({ ...subjectForm, parent_subject_id })} options={subjects.filter(s => !s.parent_subject_id)} placeholder="No parent — create a main subject" />
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Emoji" hint="A simple visual students will recognise." value={subjectForm.emoji} onChange={emoji => setSubjectForm({ ...subjectForm, emoji })} />
          <ColorField label="Subject colour" value={subjectForm.color} onChange={color => setSubjectForm({ ...subjectForm, color })} />
        </div>
        <button className="btn-primary w-full mt-2">Create subject</button>
      </Form>
      <Form number="2" title="Create chapter" text="Choose its subject, then add the chapter exactly as students should see it." onSubmit={addChapter}>
        <Select label="Subject" required value={chapterForm.subject_id} onChange={subject_id => setChapterForm({ ...chapterForm, subject_id })} options={subjects} placeholder="Choose a subject" disabled={!subjects.length} />
        <div className="grid sm:grid-cols-[140px_1fr] gap-4">
          <Input label="Chapter number" placeholder="1" min="1" type="number" value={chapterForm.chapter_number} onChange={chapter_number => setChapterForm({ ...chapterForm, chapter_number })} />
          <Input label="Chapter title" placeholder="For example, Real Numbers" value={chapterForm.title} onChange={title => setChapterForm({ ...chapterForm, title })} />
        </div>
        <button className="btn-primary w-full mt-2" disabled={!subjects.length}>Create chapter</button>
      </Form>
    </div>
    <section className="mt-7"><h2 className="font-display font-extrabold text-xl mb-3">Current subjects</h2><div className="space-y-2">{subjects.map(subject => <div className="card p-4 flex items-center gap-3" key={subject.id}><div className="w-10 h-10 rounded-xl border-2 border-ink grid place-items-center" style={{ backgroundColor: subject.color }}>{subject.emoji}</div><div className="flex-1"><div className="font-bold">{subject.name}</div><div className="text-xs text-ink/60">{subject.chapters?.length || 0} chapters · {subject.status}</div></div></div>)}</div></section>
  </div>
}

export function PageTitle({ eyebrow, title, text }) { return <div className="mb-5"><div className="font-mono text-xs uppercase tracking-widest text-ink/60">{eyebrow}</div><h1 className="heading-display text-3xl">{title}</h1><p className="text-ink/65 mt-1">{text}</p></div> }
function Form({ number, title, text, onSubmit, children }) { return <form onSubmit={onSubmit} className="card p-5 sm:p-6 space-y-5"><div className="flex gap-3 items-start"><span className="w-9 h-9 shrink-0 rounded-xl border-2 border-ink bg-sun grid place-items-center font-display font-extrabold">{number}</span><div><h2 className="font-display font-extrabold text-xl">{title}</h2><p className="text-sm text-ink/60 mt-0.5">{text}</p></div></div>{children}</form> }
export function Input({ label, hint, value, onChange, type = 'text', ...props }) { return <label className="block"><FieldLabel label={label} hint={hint} /><input required type={type} value={value} onChange={e => onChange(e.target.value)} className="form-control" {...props} /></label> }
export function Select({ label, hint, value, onChange, options, required = false, placeholder = 'Choose…', disabled = false }) { return <label className="block"><FieldLabel label={label} hint={hint} /><span className="relative block"><select required={required} disabled={disabled} value={value} onChange={e => onChange(e.target.value)} className="form-control appearance-none pr-12 cursor-pointer"><option value="">{placeholder}</option>{options.map(option => <option value={option.id} key={option.id}>{option.name}</option>)}</select><span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-sun/35 border border-ink/20 grid place-items-center" aria-hidden="true"><Chevron /></span></span></label> }

function FieldLabel({ label, hint }) { return <span className="block mb-1.5"><span className="block text-xs font-mono uppercase tracking-wider text-ink/60">{label}</span>{hint && <span className="block text-xs text-ink/50 mt-1 normal-case">{hint}</span>}</span> }
function ColorField({ label, value, onChange }) { return <label className="block"><FieldLabel label={label} hint="Used on subject cards." /><span className="form-control flex items-center gap-3 py-2"><input aria-label={label} type="color" value={value} onChange={e => onChange(e.target.value)} className="w-12 h-9 rounded-lg cursor-pointer bg-transparent border-0 p-0" /><span className="font-mono text-sm uppercase">{value}</span></span></label> }
function Chevron() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg> }
