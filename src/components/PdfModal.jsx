import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/TextLayer.css'
import 'react-pdf/dist/Page/AnnotationLayer.css'

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()

export default function PdfModal({ open, url, title, onClose }) {
  const [pageCount, setPageCount] = useState(0)
  const [pageNumber, setPageNumber] = useState(1)
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

  useEffect(() => { if (open) { setPageCount(0); setPageNumber(1); setError('') } }, [open, url])
  if (!open) return null

  const changePage = nextPage => {
    setPageNumber(nextPage)
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return createPortal(<div className="fixed inset-0 z-[100] bg-ink/70 backdrop-blur-sm flex flex-col" role="dialog" aria-modal="true" aria-label={title}>
    <div className="bg-cream border-b-2 border-ink px-3 py-3 flex items-center gap-3 shadow-pop shrink-0">
      <button type="button" className="btn-primary px-4 py-2 shrink-0" onClick={onClose}>← Close</button>
      <h2 className="font-display font-extrabold truncate flex-1">{title}</h2>
      <a href={url} target="_blank" rel="noreferrer" className="btn-secondary px-3 py-2 text-xs shrink-0">Open externally</a>
    </div>
    <div ref={contentRef} className="flex-1 min-h-0 overflow-auto overscroll-contain p-3 sm:p-5">
      <Document file={url} loading={<ViewerMessage text="Opening document…" />} error={<ViewerError text={error || 'This document could not be displayed.'} url={url} />} onLoadSuccess={({ numPages }) => { setPageCount(numPages); setPageNumber(1) }} onLoadError={loadError => setError(loadError.message)}>
          <div className="mx-auto" style={{ width }}>
            {pageCount > 0 && <div className="bg-white border-2 border-ink rounded-xl overflow-hidden shadow-pop"><Page pageNumber={pageNumber} width={width - 4} loading={<ViewerMessage text={`Loading page ${pageNumber}…`} />} error={<ViewerError text={`Page ${pageNumber} could not be displayed.`} url={url} />} /></div>}
          </div>
        </Document>
    </div>
    {pageCount > 0 && <div className="bg-cream border-t-2 border-ink px-3 py-2 flex items-center justify-center gap-3 shrink-0">
      <button type="button" className="btn-secondary px-3 py-2 text-sm" disabled={pageNumber <= 1} onClick={() => changePage(pageNumber - 1)}>← Previous</button>
      <span className="text-xs font-mono text-ink/65">Page {pageNumber} of {pageCount}</span>
      <button type="button" className="btn-secondary px-3 py-2 text-sm" disabled={pageNumber >= pageCount} onClick={() => changePage(pageNumber + 1)}>Next →</button>
    </div>}
  </div>, document.body)
}

function ViewerMessage({ text }) { return <div className="card max-w-md mx-auto p-8 text-center"><div className="text-4xl">📄</div><p className="font-bold mt-3">{text}</p></div> }
function ViewerError({ text, url }) { return <div className="card max-w-md mx-auto p-8 text-center bg-flame/10"><div className="text-4xl">⚠️</div><p className="font-bold mt-3">{text}</p><a href={url} target="_blank" rel="noreferrer" className="btn-primary inline-flex mt-4">Open in browser</a></div> }
