export interface ButlerAttachment { name: string; text?: string; image?: string }
export const BUTLER_ACCEPT = '.txt,.md,.csv,.tsv,.json,.pdf,.docx,.xlsx,image/png,image/jpeg,image/webp'
const MAX_TEXT = 20000
const limited = (text: string) => text.length > MAX_TEXT ? text.slice(0, MAX_TEXT - 90) + '\n[Truncated: only the first part of this file is included.]' : text

/** Read only the bounded main DOCX XML entry; never execute content or follow relationships. */
async function docxText(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer()), view = new DataView(bytes.buffer)
  let end = bytes.length - 22
  while (end >= Math.max(0, bytes.length - 65557) && view.getUint32(end, true) !== 0x06054b50) end--
  if (end < 0 || view.getUint32(end, true) !== 0x06054b50) throw new Error('Invalid DOCX archive.')
  let cursor = view.getUint32(end + 16, true)
  const count = Math.min(view.getUint16(end + 10, true), 2048)
  for (let i = 0; i < count; i++) {
    if (cursor + 46 > bytes.length || view.getUint32(cursor, true) !== 0x02014b50) throw new Error('Invalid DOCX directory.')
    const nameLength = view.getUint16(cursor + 28, true), extra = view.getUint16(cursor + 30, true), comment = view.getUint16(cursor + 32, true)
    const name = new TextDecoder().decode(bytes.slice(cursor + 46, cursor + 46 + nameLength))
    if (name === 'word/document.xml') {
      const size = view.getUint32(cursor + 20, true), expanded = view.getUint32(cursor + 24, true), method = view.getUint16(cursor + 10, true), offset = view.getUint32(cursor + 42, true)
      if (expanded > 2 * 1024 * 1024 || offset + 30 > bytes.length || view.getUint32(offset, true) !== 0x04034b50) throw new Error('DOCX text is too large or malformed.')
      const start = offset + 30 + view.getUint16(offset + 26, true) + view.getUint16(offset + 28, true)
      if (start + size > bytes.length) throw new Error('Incomplete DOCX archive.')
      let stream = new Blob([bytes.slice(start, start + size)]).stream()
      if (method === 8) stream = stream.pipeThrough(new DecompressionStream('deflate-raw'))
      else if (method !== 0) throw new Error('Unsupported DOCX compression.')
      const reader = stream.getReader(), chunks: Uint8Array[] = []
      let length = 0
      try { for (;;) { const chunk = await reader.read(); if (chunk.done) break; length += chunk.value.length; if (length > 2 * 1024 * 1024) throw new Error('DOCX text is too large.'); chunks.push(chunk.value) } }
      finally { await reader.cancel() }
      const xmlBytes = new Uint8Array(length)
      let position = 0
      for (const chunk of chunks) { xmlBytes.set(chunk, position); position += chunk.length }
      const xml = new TextDecoder().decode(xmlBytes)
      if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('Unsupported XML declarations.')
      const doc = new DOMParser().parseFromString(xml, 'application/xml')
      if (doc.getElementsByTagName('parsererror').length) throw new Error('DOCX text could not be read.')
      return Array.from(doc.getElementsByTagName('w:p')).map(p => Array.from(p.getElementsByTagName('w:t')).map(n => n.textContent).join('')).join('\n')
    }
    cursor += 46 + nameLength + extra + comment
  }
  throw new Error('No document text found in DOCX.')
}

export async function readButlerFile(file: File): Promise<ButlerAttachment> {
  if (file.size > 8 * 1024 * 1024) throw new Error('Choose a file smaller than 8 MB.')
  const name = file.name.slice(0, 200), ext = name.split('.').pop()?.toLowerCase()
  if (/^image\/(png|jpeg|webp)$/.test(file.type)) {
    const image = await createImageBitmap(file)
    try {
      const canvas = document.createElement('canvas'), scale = Math.min(1, 1600 / Math.max(image.width, image.height))
      canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale))
      const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Image could not be read.')
      ctx.fillStyle = 'white'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
      const data = canvas.toDataURL('image/jpeg', .8)
      if (data.length > 2500000) throw new Error('Image is too large. Please resize it.')
      return { name, image: data }
    } finally { image.close() }
  }
  let text: string
  if (ext === 'pdf') {
    const { readPdfText } = await import('../pdf-text')
    const extracted = (await readPdfText(file, 30)).text
    if (!extracted.trim()) throw new Error('No readable PDF text found. Attach scanned pages as images.')
    text = extracted + '\n[PDF text extraction: at most 30 pages. Images and scanned pages are not included.]'
  } else if (ext === 'xlsx') {
    const { parseXlsx } = await import('../library/import')
    const sheets = await parseXlsx(await file.arrayBuffer())
    text = sheets.slice(0, 10).map(sheet => `Sheet: ${sheet.name}\n${JSON.stringify(sheet.headers)}\n${sheet.rows.slice(0, 300).map(row => `Row ${row.sourceRow}: ${JSON.stringify(row.cells)}`).join('\n')}`).join('\n\n')
    text = '[Workbook extract: up to 10 sheets and 300 data rows per sheet; formula results are cached values, not recalculated.]\n' + text
  } else if (ext === 'docx') text = await docxText(file)
  else if (['txt','md','csv','tsv','json'].includes(ext ?? '')) text = await file.text()
  else throw new Error('Use TXT, CSV, TSV, JSON, Markdown, PDF, DOCX, XLSX, PNG, JPEG or WebP.')
  if (!text.trim()) throw new Error('No readable text found. For a scanned document, attach page images.')
  return { name, text: limited(text) }
}
