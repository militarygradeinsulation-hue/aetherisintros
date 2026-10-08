/**
 * Reads the text of a PDF in the browser (LinkedIn's "Save to PDF" export) so only text is
 * sent to the server. PDF.js is loaded on demand, the first time a member adds a PDF.
 */

export interface PdfText {
  text: string
  /** The largest text in the document: on a LinkedIn export, the member's name. */
  largest: string
}

interface TextItem { str: string; transform: number[]; hasEOL?: boolean }

export async function readPdfText(file: File, maxPages = 12): Promise<PdfText> {
  if (file.type && file.type !== 'application/pdf') throw new Error('Choose a PDF file.')
  if (file.size > 8 * 1024 * 1024) throw new Error('That PDF is larger than 8 MB.')
  const [pdfjs, worker] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ])
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
  const lines: string[] = []
  let largest = { size: 0, text: '' }
  for (let p = 1; p <= Math.min(doc.numPages, maxPages); p++) {
    const page = await doc.getPage(p)
    const content = await page.getTextContent()
    let line = ''
    let lineY: number | null = null
    let lineSize = 0
    const flush = () => {
      const t = line.replace(/\s+/g, ' ').trim()
      if (t) {
        lines.push(t)
        if (lineSize > largest.size) largest = { size: lineSize, text: t }
      }
      line = ''; lineSize = 0
    }
    for (const raw of content.items as TextItem[]) {
      if (typeof raw.str !== 'string') continue
      const y = raw.transform[5] ?? 0
      const size = Math.hypot(raw.transform[0] ?? 0, raw.transform[1] ?? 0)
      if (lineY !== null && Math.abs(y - lineY) > 2) flush()
      line += raw.str
      lineY = y
      lineSize = Math.max(lineSize, size)
      if (raw.hasEOL) { flush(); lineY = null }
    }
    flush()
  }
  await doc.destroy()
  return { text: lines.join('\n'), largest: largest.text }
}
