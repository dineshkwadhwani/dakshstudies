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

  useEffect(() => {
    let active = true
    if (!storagePath) { setState({ url: null, loading: false, error: new Error('Document path is missing') }); return () => {} }
    setState({ url: null, loading: true, error: null })
    createLearningContentUrl(storagePath).then(url => active && setState({ url, loading: false, error: null })).catch(error => active && setState({ url: null, loading: false, error }))
    return () => { active = false }
  }, [storagePath])

  if (state.loading) return <div className="card p-8 text-center">Preparing your secure document…</div>
  if (state.error) return <div className="card p-8 text-center"><div className="text-4xl mb-3">🔒</div><p>This document could not be opened. Check that your package is active.</p><Link className="btn-secondary inline-flex mt-4" to={back}>Go back</Link></div>

  return <div className="-mx-4"><div className="px-4 mb-3 flex items-center gap-3 flex-wrap"><Link to={back} className="btn-secondary text-sm px-3 py-2">← Back</Link><h1 className="heading-display text-xl flex-1 min-w-0 truncate">{title}</h1><a href={state.url} target="_blank" rel="noreferrer" className="btn-secondary text-sm px-3 py-2">⬇ Open / Download</a></div><div className="px-2"><object data={state.url} type="application/pdf" className="w-full rounded-2xl border-2 border-ink shadow-pop" style={{ height: 'calc(100vh - 220px)', minHeight: '500px' }}><div className="p-6 bg-paper border-2 border-ink rounded-2xl text-center"><p className="mb-3">Your browser couldn't preview this PDF.</p><a href={state.url} target="_blank" rel="noreferrer" className="btn-primary inline-flex">Open PDF</a></div></object></div></div>
}

