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
    <div className="grid md:grid-cols-2 gap-4">
      <Form title="Create subject" onSubmit={addSubject}><Input label="Subject name" value={subjectForm.name} onChange={name => setSubjectForm({ ...subjectForm, name })} /><Select label="Parent subject (optional)" value={subjectForm.parent_subject_id} onChange={parent_subject_id => setSubjectForm({ ...subjectForm, parent_subject_id })} options={subjects.filter(s => !s.parent_subject_id)} /><div className="grid grid-cols-2 gap-2"><Input label="Emoji" value={subjectForm.emoji} onChange={emoji => setSubjectForm({ ...subjectForm, emoji })} /><Input label="Colour" type="color" value={subjectForm.color} onChange={color => setSubjectForm({ ...subjectForm, color })} /></div><button className="btn-primary w-full">Create subject</button></Form>
      <Form title="Create chapter" onSubmit={addChapter}><Select label="Subject" required value={chapterForm.subject_id} onChange={subject_id => setChapterForm({ ...chapterForm, subject_id })} options={subjects} /><Input label="Chapter number" type="number" value={chapterForm.chapter_number} onChange={chapter_number => setChapterForm({ ...chapterForm, chapter_number })} /><Input label="Chapter title" value={chapterForm.title} onChange={title => setChapterForm({ ...chapterForm, title })} /><button className="btn-primary w-full">Create chapter</button></Form>
    </div>
    <section className="mt-7"><h2 className="font-display font-extrabold text-xl mb-3">Current subjects</h2><div className="space-y-2">{subjects.map(subject => <div className="card p-4 flex items-center gap-3" key={subject.id}><div className="w-10 h-10 rounded-xl border-2 border-ink grid place-items-center" style={{ backgroundColor: subject.color }}>{subject.emoji}</div><div className="flex-1"><div className="font-bold">{subject.name}</div><div className="text-xs text-ink/60">{subject.chapters?.length || 0} chapters · {subject.status}</div></div></div>)}</div></section>
  </div>
}

export function PageTitle({ eyebrow, title, text }) { return <div className="mb-5"><div className="font-mono text-xs uppercase tracking-widest text-ink/60">{eyebrow}</div><h1 className="heading-display text-3xl">{title}</h1><p className="text-ink/65 mt-1">{text}</p></div> }
function Form({ title, onSubmit, children }) { return <form onSubmit={onSubmit} className="card p-5 space-y-3"><h2 className="font-display font-extrabold text-lg">{title}</h2>{children}</form> }
export function Input({ label, value, onChange, type = 'text' }) { return <label className="block"><span className="text-xs font-mono uppercase text-ink/60">{label}</span><input required type={type} value={value} onChange={e => onChange(e.target.value)} className="mt-1" /></label> }
export function Select({ label, value, onChange, options, required = false }) { return <label className="block"><span className="text-xs font-mono uppercase text-ink/60">{label}</span><select required={required} value={value} onChange={e => onChange(e.target.value)} className="mt-1 w-full"><option value="">Choose…</option>{options.map(option => <option value={option.id} key={option.id}>{option.name}</option>)}</select></label> }

