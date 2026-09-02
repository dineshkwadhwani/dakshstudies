import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { createLearningContentUrl } from '../hooks/useCatalog.js'

export default function PdfView() {
  const { search } = useLocation()
  const params = new URLSearchParams(search)
  const storagePath = params.get('path')
  const title = params.get('title') || 'Document'
  const back = params.get('back') || '/dashboard'
  const [state, setState] = useState({ url: null, loading: true, error: null })
  const isAndroid = /Android/i.test(navigator.userAgent)

  useEffect(() => {
    let active = true
    if (!storagePath) { setState({ url: null, loading: false, error: new Error('Document path is missing') }); return () => {} }
    setState({ url: null, loading: true, error: null })
    createLearningContentUrl(storagePath).then(url => active && setState({ url, loading: false, error: null })).catch(error => active && setState({ url: null, loading: false, error }))
    return () => { active = false }
  }, [storagePath])

  if (state.loading) return <div className="card p-8 text-center">Preparing your secure document…</div>
  if (state.error) return <div className="card p-8 text-center"><div className="text-4xl mb-3">🔒</div><p>This document could not be opened. Check that your package is active.</p><Link className="btn-secondary inline-flex mt-4" to={back}>Go back</Link></div>

  return <div className="-mx-4"><div className="px-4 mb-3 flex items-center gap-3 flex-wrap"><Link to={back} className="btn-secondary text-sm px-3 py-2">← Back</Link><h1 className="heading-display text-xl flex-1 min-w-0 truncate">{title}</h1><a href={state.url} target="_blank" rel="noreferrer" className="btn-secondary text-sm px-3 py-2">Open</a></div><div className="px-2">{isAndroid ? <AndroidPdfCard url={state.url} title={title} /> : <object data={state.url} type="application/pdf" className="w-full rounded-2xl border-2 border-ink shadow-pop" style={{ height: 'calc(100vh - 220px)', minHeight: '500px' }}><div className="p-6 bg-paper border-2 border-ink rounded-2xl text-center"><p className="mb-3">Preview is not available in this browser.</p><a href={state.url} target="_blank" rel="noreferrer" className="btn-primary inline-flex">Open</a></div></object>}</div></div>
}

function AndroidPdfCard({ url, title }) {
  return <div className="card p-7 sm:p-10 text-center min-h-[360px] grid place-items-center"><div><div className="w-20 h-20 mx-auto rounded-2xl border-2 border-ink bg-flame/15 grid place-items-center text-4xl">📄</div><h2 className="heading-display text-2xl mt-5">{title}</h2><p className="text-ink/60 mt-2 max-w-md">Tap Open to view this document in your Android browser or preferred PDF viewer.</p><a href={url} target="_blank" rel="noreferrer" className="btn-primary inline-flex mt-5">Open</a></div></div>
}
