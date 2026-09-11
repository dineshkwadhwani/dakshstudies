import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../auth/AuthContext.jsx'
import { validateTopicSummary, topicWordCount } from '../../utils/topicHtml.js'
import TopicSummary from '../../components/TopicSummary.jsx'

const emptyForm = { title: '', slug: '', sort_order: 1, summary_html: '', status: 'draft' }
const slugify = value => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export default function AdminTopics() {
  const { user } = useAuth()
  const [chapters, setChapters] = useState([])
  const [chapterId, setChapterId] = useState('')
  const [topics, setTopics] = useState([])
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    let active = true
    supabase.from('chapters').select('id,title,chapter_number,subjects(name)').order('title')
      .then(({ data, error }) => { if (active) { setChapters(data || []); if (error) setMessage(error.message) } })
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    setSelected(null); setTopics([]); setForm(emptyForm); setLoading(Boolean(chapterId))
    if (!chapterId) return () => { active = false }
    supabase.from('chapter_topics').select('*').eq('chapter_id', chapterId).order('sort_order').order('id')
      .then(({ data, error }) => { if (active) { setTopics(data || []); setLoading(false); if (error) setMessage(error.message) } })
    return () => { active = false }
  }, [chapterId, revision])

  function edit(topic) {
    setSelected(topic)
    setForm(topic ? { title: topic.title, slug: topic.slug, sort_order: topic.sort_order, summary_html: topic.summary_html, status: topic.status }
      : { ...emptyForm, sort_order: Math.max(0, ...topics.map(item => item.sort_order)) + 1 })
    setMessage('')
  }

  async function save(event) {
    event.preventDefault(); setMessage('')
    try {
      validateTopicSummary(form.summary_html, form.status === 'published')
      if (!form.title.trim()) throw new Error('Enter a topic title.')
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(form.slug)) throw new Error('Use lowercase letters, numbers and hyphens for the URL name.')
      setBusy(true)
      const values = { ...form, title: form.title.trim(), sort_order: Number(form.sort_order), updated_by: user.id }
      const query = selected
        ? supabase.from('chapter_topics').update(values).eq('id', selected.id).eq('updated_at', selected.updated_at)
        : supabase.from('chapter_topics').insert({ ...values, chapter_id: chapterId, created_by: user.id })
      const { data, error } = await query.select('id')
      if (error) throw error
      if (!data?.length) throw new Error('This topic was changed elsewhere. Reload the chapter before saving again.')
      setMessage(form.status === 'published' ? 'Topic published.' : 'Topic saved. Only published topics are visible to students.')
      setRevision(value => value + 1)
    } catch (error) { setMessage(error.message) }
    finally { setBusy(false) }
  }

  const words = topicWordCount(form.summary_html)
  return <div>
    <Link to="/admin/content" className="font-bold text-sm">← Content library</Link>
    <h1 className="heading-display text-3xl mt-3">Chapter topics</h1>
    <p className="text-ink/70 mt-2 mb-5">Arrange topics and edit their HTML summaries. Published summaries must contain 200–500 words.</p>
    {message && <div role="status" className="card p-3 mb-4 bg-sky/20">{message}</div>}
    <label className="block mb-4 font-bold">Chapter
      <select aria-label="Chapter" disabled={busy} className="form-control" value={chapterId} onChange={event => { setChapterId(event.target.value); setMessage('') }}>
        <option value="">Choose a chapter</option>
        {chapters.map(chapter => <option key={chapter.id} value={chapter.id}>{chapter.subjects?.name} · {chapter.title}</option>)}
      </select>
    </label>
    {loading && <p>Loading topics…</p>}
    {chapterId && !loading && <>
      <div className="space-y-2 mb-5">{topics.map(topic => <button key={topic.id} disabled={busy} onClick={() => edit(topic)} className={`card p-3 text-left w-full ${selected?.id === topic.id ? 'bg-sun/20' : ''}`}>
        <span className="font-bold">{topic.sort_order}. {topic.title}</span><span className="block text-xs text-ink/60">{topic.status} · {topic.word_count} words</span>
      </button>)}</div>
      <button disabled={busy} className="btn-secondary mb-4" onClick={() => edit(null)}>+ New topic</button>
      <form onSubmit={save} className="card p-5 space-y-4">
        <h2 className="font-bold text-xl">{selected ? 'Edit topic' : 'New topic'}</h2>
        <fieldset disabled={busy} className="space-y-4">
          <label className="block font-bold">Title<input required maxLength={180} className="form-control" value={form.title} onChange={event => setForm({ ...form, title: event.target.value, slug: selected ? form.slug : slugify(event.target.value) })} /></label>
          <label className="block font-bold">URL name<input required className="form-control" value={form.slug} onChange={event => setForm({ ...form, slug: event.target.value })} /><span className="text-xs font-normal text-ink/60">Keep this unchanged to preserve existing links.</span></label>
          <label className="block font-bold">Order<input required type="number" min="0" step="1" className="form-control" value={form.sort_order} onChange={event => setForm({ ...form, sort_order: event.target.value })} /></label>
          <label className="block font-bold">Summary HTML<textarea aria-label="Summary HTML" rows={16} maxLength={30000} className="form-control font-mono text-sm" value={form.summary_html} onChange={event => setForm({ ...form, summary_html: event.target.value })} /></label>
          <p className={`text-sm ${words >= 200 && words <= 500 ? 'text-green-800' : 'text-red-700'}`}>{words} words · Use p, h2, h3, strong, em, ul, ol, li, sub, sup, blockquote and br tags without attributes.</p>
          <label className="block font-bold">Status<select className="form-control" value={form.status} onChange={event => setForm({ ...form, status: event.target.value })}>
            <option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option>
          </select></label>
          <button disabled={busy} className="btn-primary">{busy ? 'Saving…' : 'Save topic'}</button>
        </fieldset>
      </form>
      <section className="card p-5 mt-4"><h2 className="font-bold text-xl mb-4">Preview</h2><TopicSummary html={form.summary_html} /></section>
      {selected?.source_book && <p className="text-xs text-ink/60 mt-3">Source: {selected.source_book} · {selected.source_section} · PDF pages {selected.source_page_start}–{selected.source_page_end}</p>}
    </>}
  </div>
}
