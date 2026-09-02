import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/TextLayer.css'
import 'react-pdf/dist/Page/AnnotationLayer.css'

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()

export default function PdfModal({ open, url, title, onClose }) {
  const [pageCount, setPageCount] = useState(0)
  const [width, setWidth] = useState(720)
  const [error, setError] = useState('')
  const contentRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const escape = event => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', escape)
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', escape) }
  }, [open, onClose])

  useEffect(() => {
    if (!open || !contentRef.current) return undefined
    const resize = new ResizeObserver(entries => setWidth(Math.max(260, Math.min(900, entries[0].contentRect.width - 24))))
    resize.observe(contentRef.current)
    return () => resize.disconnect()
  }, [open])

  useEffect(() => { if (open) { setPageCount(0); setError('') } }, [open, url])
  if (!open) return null

  return createPortal(<div className="fixed inset-0 z-[100] bg-ink/70 backdrop-blur-sm flex flex-col" role="dialog" aria-modal="true" aria-label={title}>
    <div className="bg-cream border-b-2 border-ink px-3 py-3 flex items-center gap-3 shadow-pop">
      <button type="button" className="btn-primary px-4 py-2 shrink-0" onClick={onClose}>← Close</button>
      <h2 className="font-display font-extrabold truncate flex-1">{title}</h2>
      {pageCount > 0 && <span className="hidden sm:block text-xs font-mono text-ink/55">{pageCount} page{pageCount === 1 ? '' : 's'}</span>}
    </div>
    <div ref={contentRef} className="flex-1 overflow-auto overscroll-contain p-3 sm:p-5">
      <Document file={url} loading={<ViewerMessage text="Opening document…" />} error={<ViewerMessage text={error || 'This document could not be displayed.'} />} onLoadSuccess={({ numPages }) => setPageCount(numPages)} onLoadError={loadError => setError(loadError.message)}>
        <div className="space-y-4 mx-auto" style={{ width }}>
          {Array.from({ length: pageCount }, (_, index) => <div key={index} className="bg-white border-2 border-ink rounded-xl overflow-hidden shadow-pop"><Page pageNumber={index + 1} width={width - 4} /></div>)}
        </div>
      </Document>
    </div>
  </div>, document.body)
}

function ViewerMessage({ text }) { return <div className="card max-w-md mx-auto p-8 text-center"><div className="text-4xl">📄</div><p className="font-bold mt-3">{text}</p></div> }
