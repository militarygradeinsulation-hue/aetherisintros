export interface ButlerAttachment { name: string; text?: string; image?: string }
/** Any file may be attached; unreadable formats are passed as a description so Butler can still route them. */
export const BUTLER_ACCEPT = ''
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
  const name = file.name.slice(0, 200), ext = name.split('.').pop()?.toLowerCase()
  if (file.size > 8 * 1024 * 1024) return describedOnly(file, name, 'it is larger than 8 MB')
  if (file.type.startsWith('image/')) {
    let image: ImageBitmap
    try { image = await createImageBitmap(file) } catch { return describedOnly(file, name, 'this image format cannot be previewed in the browser') }
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
  else if (await looksLikeText(file)) text = await file.text()
  else return describedOnly(file, name, 'its contents are not readable text')
  if (!text.trim()) return describedOnly(file, name, 'no readable text was found (scanned pages can be attached as images)')
  return { name, text: limited(text) }
}

export function describeFile(name: string, type: string, size: number, reason: string): string {
  const kb = size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`
  return `[File received: ${name} — ${type || 'unknown type'}, ${kb}. Its contents were not read because ${reason}. Use the name and type to suggest where it belongs; do not guess what it says.]`
}
function describedOnly(file: File, name: string, reason: string): ButlerAttachment {
  return { name, text: describeFile(name, file.type, file.size, reason) }
}
/** Treat a file as text when its first bytes decode cleanly with no control characters. */
async function looksLikeText(file: File): Promise<boolean> {
  const head = new Uint8Array(await file.slice(0, 4096).arrayBuffer())
  if (head.includes(0)) return false
  try { new TextDecoder('utf-8', { fatal: true }).decode(head.length === 4096 ? head.slice(0, 4092) : head) } catch { return false }
  return true
}
