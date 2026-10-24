import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Minus, Plus, RotateCcw, RotateCw, Search } from 'lucide-react'
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist'
import './pdf-document-viewer.css'

type Match = { page: number; text: string }
const ZOOMS = [0.5, 0.75, 1, 1.25, 1.5, 2]

function PdfCanvas({ doc, page, zoom, rotation, thumbnail = false }: {
  doc: PDFDocumentProxy; page: number; zoom: number; rotation: number; thumbnail?: boolean
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(true)
  useEffect(() => {
    let active = true
    let task: RenderTask | undefined
    setBusy(true); setError('')
    void (async () => {
      const source = await doc.getPage(page)
      if (!active || !canvas.current) return
      const initial = source.getViewport({ scale: 1, rotation })
      // Bound raster memory even for unusually large page dimensions.
      const scale = thumbnail ? 110 / initial.width : Math.min(zoom, 2200 / Math.max(initial.width, initial.height))
      const viewport = source.getViewport({ scale, rotation })
      const target = canvas.current
      target.width = Math.ceil(viewport.width); target.height = Math.ceil(viewport.height)
      task = source.render({ canvas: target, viewport })
      await task.promise
      if (active) setBusy(false)
    })().catch(() => { if (active) { setBusy(false); setError('This page could not be rendered.') } })
    return () => { active = false; task?.cancel() }
  }, [doc, page, zoom, rotation, thumbnail])
  return <div className="ai-pdf-canvas" aria-busy={busy}>
    {busy && !thumbnail && <span role="status">Rendering page…</span>}
    {error && <p role="alert">{error}</p>}
    <canvas ref={canvas} role="img" aria-label={`PDF page ${page}`} />
  </div>
}

/** Adapts the supplied viewer to the existing PDF.js dependency and signed storage URLs. */
export default function PdfDocumentViewer({ url, name }: { url: string; name: string }) {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null)
  const [page, setPage] = useState(1)
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [matches, setMatches] = useState<Match[]>([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  const [text, setText] = useState('')
  const [thumbnails, setThumbnails] = useState(false)
  const request = useRef(0)
  useEffect(() => {
    let active = true
    let destroy: (() => Promise<void>) | undefined
    setDoc(null); setError(''); setPage(1); setQuery(''); setMatches([]); setSearched(false)
    void (async () => {
      const [pdfjs, worker] = await Promise.all([import('pdfjs-dist/legacy/build/pdf.mjs'), import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')])
      if (!active) return
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default
      const loading = pdfjs.getDocument({ url })
      destroy = () => loading.destroy()
      const loaded = await loading.promise
      if (active) setDoc(loaded)
    })().catch(() => { if (active) setError('This PDF could not be opened. The link may have expired or the file may be unavailable. Close and reopen the attachment to try again.') })
    return () => { active = false; request.current++; void destroy?.() }
  }, [url])
  useEffect(() => {
    let active = true
    setText('')
    if (doc) void doc.getPage(page).then(source => source.getTextContent()).then(content => {
      if (active) setText(content.items.flatMap(item => 'str' in item ? [item.str] : []).join(' '))
    }).catch(() => { if (active) setText('Page text is unavailable.') })
    return () => { active = false }
  }, [doc, page])
  useEffect(() => { request.current++; setMatches([]); setSearched(false); setSearching(false) }, [query, doc])
  const search = async () => {
    if (!doc || !query.trim()) return
    const run = ++request.current
    const needle = query.trim().toLocaleLowerCase()
    setSearching(true); setMatches([]); setSearched(false); setError('')
    const found: Match[] = []
    try {
      // Explicit search is bounded; do not render or index every page on open.
      for (let n = 1; n <= Math.min(doc.numPages, 200); n++) {
        if (request.current !== run) return
        const source = await doc.getPage(n)
        const content = await source.getTextContent()
        const value = content.items.flatMap(item => 'str' in item ? [item.str] : []).join(' ')
        const at = value.toLocaleLowerCase().indexOf(needle)
        if (at >= 0) found.push({ page: n, text: value.slice(Math.max(0, at - 50), at + needle.length + 100) })
      }
      if (request.current === run) { setMatches(found); setSearched(true) }
    } catch { if (request.current === run) setError('Document search failed. You can still read the rendered pages.') }
    finally { if (request.current === run) setSearching(false) }
  }
  const firstThumbnail = Math.max(1, Math.min(page - 3, (doc?.numPages ?? 1) - 6))
  return <section className="ai-pdf-viewer" aria-label={`Document viewer: ${name}`}>
    <header className="ai-pdf-toolbar">
      <button type="button" aria-pressed={thumbnails} onClick={() => setThumbnails(value => !value)}>Pages</button>
      <button type="button" aria-label="Previous PDF page" disabled={!doc || page <= 1} onClick={() => setPage(value => value - 1)}><ChevronLeft size={17} /></button>
      <span aria-live="polite">Page {doc ? page : '—'} of {doc?.numPages ?? '—'}</span>
      <button type="button" aria-label="Next PDF page" disabled={!doc || page >= doc.numPages} onClick={() => setPage(value => value + 1)}><ChevronRight size={17} /></button>
      <button type="button" aria-label="Rotate PDF left" onClick={() => setRotation(value => (value + 270) % 360)}><RotateCcw size={17}/></button>
      <button type="button" aria-label="Rotate PDF right" onClick={() => setRotation(value => (value + 90) % 360)}><RotateCw size={17}/></button>
      <button type="button" aria-label="Zoom PDF out" disabled={zoom === ZOOMS[0]} onClick={() => setZoom(ZOOMS[Math.max(0, ZOOMS.indexOf(zoom) - 1)]!)}><Minus size={17}/></button>
      <label>Zoom <select aria-label="PDF zoom" value={zoom} onChange={event => setZoom(Number(event.target.value))}>{ZOOMS.map(value => <option key={value} value={value}>{value * 100}%</option>)}</select></label>
      <button type="button" aria-label="Zoom PDF in" disabled={zoom === ZOOMS.at(-1)} onClick={() => setZoom(ZOOMS[Math.min(ZOOMS.length - 1, ZOOMS.indexOf(zoom) + 1)]!)}><Plus size={17}/></button>
    </header>
    <form className="ai-pdf-search" onSubmit={event => { event.preventDefault(); void search() }}>
      <input aria-label="Search PDF text" placeholder="Find in document…" value={query} maxLength={200} onChange={event => setQuery(event.target.value)} />
      <button type="submit" disabled={!doc || !query.trim() || searching}><Search size={16}/>{searching ? 'Searching…' : 'Find'}</button>
    </form>
    {error && <p role="alert">{error}</p>}
    {!doc && !error && <p role="status">Opening document…</p>}
    {doc && <div className="ai-pdf-body">
      {thumbnails && <nav className="ai-pdf-thumbnails" aria-label="PDF pages">{Array.from({length:Math.min(7,doc.numPages)},(_,index) => firstThumbnail + index).map(n => <button type="button" key={n} aria-label={`Go to PDF page ${n}`} aria-current={page === n ? 'page' : undefined} onClick={() => setPage(n)}><PdfCanvas doc={doc} page={n} zoom={1} rotation={rotation} thumbnail/><span>{n}</span></button>)}</nav>}
      <div className="ai-pdf-page" tabIndex={0} aria-label="Scrollable PDF page"><PdfCanvas doc={doc} page={page} zoom={zoom} rotation={rotation}/></div>
    </div>}
    {searched && <section className="ai-pdf-results" aria-label="PDF search results"><p role="status">{matches.length} matching pages{doc && doc.numPages > 200 ? ' in the first 200 pages' : ''}. Scanned images may not contain searchable text.</p>{matches.map(match => <button type="button" key={match.page} onClick={() => setPage(match.page)}>Page {match.page}: {match.text}</button>)}</section>}
    {doc && <details className="ai-pdf-text"><summary>Readable text for page {page}</summary><p>{text || 'This page has no extractable text.'}</p></details>}
  </section>
}
