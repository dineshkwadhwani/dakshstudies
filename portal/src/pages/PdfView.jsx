import { useLocation, Link } from 'react-router-dom'

export default function PdfView() {
  const loc = useLocation()
  // pathname is /pdf/<remaining>; the remaining is the actual PDF path under /pdfs/
  const path = loc.pathname.replace(/^\/pdf/, '')
  const params = new URLSearchParams(loc.search)
  const title = params.get('title') || 'Document'
  const back = params.get('back') || '/'

  return (
    <div className="-mx-4">
      <div className="px-4 mb-3 flex items-center gap-3 flex-wrap">
        <h1 className="heading-display text-xl flex-1 min-w-0 truncate">{title}</h1>
        <a
          href={path}
          download
          className="btn-secondary text-sm px-3 py-2"
        >
          ⬇ Download
        </a>
      </div>
      <div className="px-2">
        <object
          data={path}
          type="application/pdf"
          className="w-full rounded-2xl border-2 border-ink shadow-pop"
          style={{ height: 'calc(100vh - 220px)', minHeight: '500px' }}
        >
          <div className="p-6 bg-paper border-2 border-ink rounded-2xl text-center">
            <div className="text-4xl mb-2">📄</div>
            <p className="mb-3">Your browser couldn't preview this PDF.</p>
            <a href={path} className="btn-primary inline-flex" download>Download PDF</a>
          </div>
        </object>
      </div>
    </div>
  )
}
