import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/AuthContext.jsx'
import { supabase } from '../../lib/supabase.js'
import { Input, PageTitle, Select } from './AdminSubjects.jsx'

const types = ['source_pdf', 'summary', 'notes', 'worksheet', 'worksheet_answer_key', 'test_paper', 'test_answer_key', 'other']
const cleanName = name => name.replace(/[^a-zA-Z0-9._-]/g, '-')

export default function AdminContent() {
  const { user } = useAuth()
  const [chapters, setChapters] = useState([])
  const [form, setForm] = useState({ chapter_id: '', resource_type: 'summary', title: '', file: null })
  const [state, setState] = useState({ busy: false, message: '' })

  useEffect(() => { supabase.from('chapters').select('id,title,chapter_number,subjects(name)').eq('status', 'published').order('title').then(({ data }) => setChapters((data || []).map(ch => ({ ...ch, name: `${ch.subjects?.name} · ${ch.chapter_number}. ${ch.title}` })))) }, [])

  async function upload(event) {
    event.preventDefault(); setState({ busy: true, message: '' })
    let resource
    try {
      const { data, error } = await supabase.from('content_resources').insert({ chapter_id: form.chapter_id, resource_type: form.resource_type, title: form.title.trim(), status: 'published', current_version: 1, created_by: user.id }).select('id').single()
      if (error) throw error
      resource = data
      const storagePath = `admin/${form.chapter_id}/${resource.id}/${cleanName(form.file.name)}`
      const { error: uploadError } = await supabase.storage.from('learning-content').upload(storagePath, form.file, { contentType: form.file.type || 'application/pdf' })
      if (uploadError) throw uploadError
      const { error: versionError } = await supabase.from('content_resource_versions').insert({ resource_id: resource.id, version: 1, storage_path: storagePath, mime_type: form.file.type || 'application/pdf', size_bytes: form.file.size, created_by: user.id, published_at: new Date().toISOString(), provenance: { source: 'superadmin_upload' } })
      if (versionError) throw versionError
      setForm({ chapter_id: '', resource_type: 'summary', title: '', file: null }); event.currentTarget.reset(); setState({ busy: false, message: 'Content uploaded and published successfully.' })
    } catch (error) {
      if (resource?.id) await supabase.from('content_resources').delete().eq('id', resource.id)
      setState({ busy: false, message: error.message })
    }
  }

  return <div><PageTitle eyebrow="Learning library" title="Upload content" text="Add PDFs to a chapter. Files stay private and students receive secure links." />
    {state.message && <div className="card p-3 mb-4 bg-sky/20">{state.message}</div>}
    <form onSubmit={upload} className="card p-5 space-y-4 max-w-xl">
      <Select label="Chapter" required value={form.chapter_id} onChange={chapter_id => setForm({ ...form, chapter_id })} options={chapters} />
      <label className="block"><span className="text-xs font-mono uppercase text-ink/60">Content type</span><select className="mt-1 w-full" value={form.resource_type} onChange={e => setForm({ ...form, resource_type: e.target.value })}>{types.map(type => <option key={type} value={type}>{type.replaceAll('_', ' ')}</option>)}</select></label>
      <Input label="Display title" value={form.title} onChange={title => setForm({ ...form, title })} />
      <label className="block"><span className="text-xs font-mono uppercase text-ink/60">PDF file</span><input className="mt-1 w-full" required accept="application/pdf" type="file" onChange={e => setForm({ ...form, file: e.target.files?.[0] || null })} /></label>
      <button disabled={state.busy} className="btn-primary w-full">{state.busy ? 'Uploading…' : 'Upload and publish'}</button>
    </form>
  </div>
}

