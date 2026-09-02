import { lazy, Suspense, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { createLearningContentUrl } from '../hooks/useCatalog.js'

const PdfModal = lazy(() => import('../components/PdfModal.jsx'))

export default function PdfView() {
  const { search } = useLocation()
  const navigate = useNavigate()
  const params = new URLSearchParams(search)
  const storagePath = params.get('path')
  const title = params.get('title') || 'Document'
  const back = params.get('back') || '/dashboard'
  const [state, setState] = useState({ url: null, loading: true, error: null })
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    let active = true
    if (!storagePath) { setState({ url: null, loading: false, error: new Error('Document path is missing') }); return () => {} }
    setState({ url: null, loading: true, error: null })
    createLearningContentUrl(storagePath).then(url => { if (active) { setState({ url, loading: false, error: null }); setModalOpen(true) } }).catch(error => active && setState({ url: null, loading: false, error }))
    return () => { active = false }
  }, [storagePath])

  if (state.loading) return <div className="card p-8 text-center">Preparing your secure document…</div>
  if (state.error) return <div className="card p-8 text-center"><div className="text-4xl mb-3">🔒</div><p>This document could not be opened. Check that your package is active.</p><Link className="btn-secondary inline-flex mt-4" to={back}>Go back</Link></div>

  const close = () => { setModalOpen(false); navigate(back) }
  return <div className="card p-8 text-center"><div className="text-4xl">📄</div><h1 className="heading-display text-2xl mt-3">{title}</h1><p className="text-ink/60 mt-2">The document viewer has been closed.</p><div className="flex flex-wrap justify-center gap-3 mt-5"><Link to={back} className="btn-secondary">← Back</Link><button type="button" className="btn-primary" onClick={() => setModalOpen(true)}>Open</button></div><Suspense fallback={<div className="fixed inset-0 z-[100] bg-ink/70 grid place-items-center text-white font-bold">Preparing document viewer…</div>}><PdfModal open={modalOpen} url={state.url} title={title} onClose={close} /></Suspense></div>
}
