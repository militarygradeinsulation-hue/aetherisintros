import ExcelJS from 'exceljs'

export type ImportField =
  | 'name' | 'first_name' | 'last_name' | 'phone' | 'email' | 'business' | 'title'
  | 'location' | 'city' | 'state' | 'address' | 'website' | 'industry'
  | 'raw_contact_person' | 'source_reference' | 'dnc_status'

export type ImportMap = Partial<Record<ImportField, number>>
export interface ImportSheet {
  name: string
  headers: string[]
  rows: Array<{ sourceRow: number; cells: string[] }>
}

export interface LibraryImportRecord {
  record_type: 'person' | 'organization'
  name: string
  phone: string
  email: string
  business: string
  title: string
  location: string
  website: string
  industry: string
  raw_contact_person: string
  source_file: string
  source_sheet: string
  source_row: number
  source_reference: string
  dnc_status: string
  verification_status: 'unverified'
  duplicate_candidate: boolean
  original_columns: Record<string, string>
}

export interface CheckedImportRecord {
  record: LibraryImportRecord
  key: string
  errors: string[]
  warnings: string[]
}

export const IMPORT_FIELDS: Array<{ key: ImportField; label: string; hints: string[] }> = [
  { key: 'name', label: 'Person or organization name', hints: ['full name', 'contact name', 'person name', 'contact person', 'name'] },
  { key: 'first_name', label: 'First name', hints: ['first name', 'given name'] },
  { key: 'last_name', label: 'Last name', hints: ['last name', 'surname', 'family name'] },
  { key: 'business', label: 'Business / company', hints: ['business', 'company name', 'company', 'organization', 'organisation', 'account name', 'account', 'employer', 'company nmae', 'company name'] },
  { key: 'phone', label: 'Phone', hints: ['phone', 'phone number', 'phone #', 'mobile', 'telephone', 'tel'] },
  { key: 'email', label: 'Email', hints: ['email', 'email address', 'e-mail', 'mail'] },
  { key: 'title', label: 'Title', hints: ['job title', 'title', 'position', 'role'] },
  { key: 'location', label: 'Address / location', hints: ['physical address', 'address', 'location'] },
  { key: 'city', label: 'City', hints: ['city'] },
  { key: 'state', label: 'State', hints: ['state', 'province', 'region'] },
  { key: 'website', label: 'Website', hints: ['web url', 'website', 'website url', 'url', 'domain'] },
  { key: 'industry', label: 'Industry / sector', hints: ['industry', 'sector', 'vertical'] },
  { key: 'raw_contact_person', label: 'Raw contact person text', hints: ['contact person', 'contact name', 'person'] },
  { key: 'source_reference', label: 'Source reference', hints: ['source of info', 'source of the contact', 'content source', 'source', 'lead source'] },
  { key: 'dnc_status', label: 'Do-not-contact status', hints: ['dnc check', 'dnc status', 'do not contact'] },
]

const normalizeHeader = (header: string) => header.toLowerCase().normalize('NFKC').replace(/[^a-z0-9]+/g, ' ').trim()
const normalizeValue = (value: string) => value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()

function delimiterFor(text: string): string {
  const line = text.split(/\r\n|\n|\r/, 1)[0] ?? ''
  let quoted = false
  const counts = new Map<string, number>([[',', 0], ['\t', 0], [';', 0]])
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"' && line[i + 1] === '"') i++
    else if (line[i] === '"') quoted = !quoted
    else if (!quoted && counts.has(line[i]!)) counts.set(line[i]!, counts.get(line[i]!)! + 1)
  }
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? ','
}

export function parseCsv(text: string, fileName = 'contacts.csv'): ImportSheet[] {
  const delimiter = delimiterFor(text)
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++ }
      else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"' && !cell) quoted = true
    else if (ch === delimiter) { row.push(cell); cell = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(cell)
      if (row.some(value => value.trim())) rows.push(row)
      row = []
      cell = ''
    } else cell += ch
  }
  row.push(cell)
  if (row.some(value => value.trim())) rows.push(row)
  if (rows.length < 2) throw new Error('This file has no data rows under its header.')
  const headers = rows[0]!.map((value, index) => index === 0 ? value.replace(/^\uFEFF/, '').trim() : value.trim())
  return [{
    name: fileName.replace(/\.[^.]+$/, '') || 'CSV',
    headers,
    rows: rows.slice(1).map((cells, index) => ({ sourceRow: index + 2, cells })),
  }]
}

function excelText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'object') {
    if ('result' in value) return excelText(value.result as ExcelJS.CellValue)
    if ('text' in value) return String(value.text ?? '')
    if ('richText' in value && Array.isArray(value.richText)) return value.richText.map(part => part.text).join('')
    return ''
  }
  return String(value).trim()
}

export async function parseXlsx(data: ArrayBuffer | Uint8Array): Promise<ImportSheet[]> {
  try {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(data as never, { ignoreNodes: ['extLst'] })
    const sheets = workbook.worksheets.flatMap(worksheet => {
      const used: Array<{ sourceRow: number; cells: string[] }> = []
      worksheet.eachRow({ includeEmpty: false }, (row, sourceRow) => {
        used.push({ sourceRow, cells: row.values.slice(1).map(value => excelText(value as ExcelJS.CellValue)) })
      })
      if (used.length < 2) return []
      const headers = used[0]!.cells.map(header => header.trim())
      return [{ name: worksheet.name, headers, rows: used.slice(1) }]
    })
    if (!sheets.length) throw new Error('This workbook has no data rows under a header.')
    return sheets
  } catch (error) {
    if (error instanceof Error && error.message.includes('no data rows')) throw error
    throw new Error('This workbook could not be read safely. Its formatting may be malformed; save or export it as normalized CSV and try again.')
  }
}

export function autoMap(headers: string[]): ImportMap {
  const normalized = headers.map(normalizeHeader)
  const find = (hints: string[]) => {
    for (const hint of hints.map(normalizeHeader)) {
      const i = normalized.findIndex(header => header === hint)
      if (i >= 0) return i
    }
    return -1
  }
  const out: ImportMap = {}
  for (const field of IMPORT_FIELDS) {
    const index = find(field.hints)
    if (index >= 0) out[field.key] = index
  }

  const contactIndex = find(['contact person'])
  const genericName = normalized.findIndex(header => header === 'name')
  const orgName = find(['company name', 'company nmae', 'organization name', 'organisation name', 'account name'])
  if (contactIndex >= 0) {
    out.name = contactIndex
    out.raw_contact_person = contactIndex
    if (genericName >= 0) out.business = genericName
  } else if (orgName >= 0 && out.name === undefined) {
    out.name = orgName
  }
  return out
}

function originalColumns(headers: string[], cells: string[]): Record<string, string> {
  const out: Record<string, string> = {}
  const seen = new Map<string, number>()
  headers.forEach((header, i) => {
    const base = header || `Column ${i + 1}`
    const count = (seen.get(base) ?? 0) + 1
    seen.set(base, count)
    out[count === 1 ? base : `${base} [${count}]`] = cells[i] ?? ''
  })
  return out
}

function valueAt(cells: string[], map: ImportMap, field: ImportField): string {
  const index = map[field]
  return index === undefined ? '' : (cells[index] ?? '').trim()
}

export function mapSheetRows(
  sheet: ImportSheet,
  mapping: ImportMap,
  fileName: string,
): CheckedImportRecord[] {
  return sheet.rows.map(({ cells, sourceRow }) => {
    const mappedName = valueAt(cells, mapping, 'name')
    const composedName = [valueAt(cells, mapping, 'first_name'), valueAt(cells, mapping, 'last_name')].filter(Boolean).join(' ')
    const rawContactPerson = valueAt(cells, mapping, 'raw_contact_person')
    const nameHeader = normalizeHeader(sheet.headers[mapping.name ?? -1] ?? '')
    const organizationName = /(^| )(company|account|organization|organisation)( |$)/.test(nameHeader)
    const explicitPersonName = /full name|person name|contact name|contact person/.test(nameHeader)
    const personName = composedName || rawContactPerson || (!organizationName && mappedName ? mappedName : '')
    const business = valueAt(cells, mapping, 'business') || (!personName ? mappedName : '')
    const location = [
      valueAt(cells, mapping, 'address') || valueAt(cells, mapping, 'location'),
      valueAt(cells, mapping, 'city'),
      valueAt(cells, mapping, 'state'),
    ].filter(Boolean).join(', ')
    const record: LibraryImportRecord = {
      record_type: personName ? 'person' : 'organization',
      name: personName || business,
      phone: valueAt(cells, mapping, 'phone'),
      email: valueAt(cells, mapping, 'email'),
      business,
      title: valueAt(cells, mapping, 'title'),
      location,
      website: valueAt(cells, mapping, 'website'),
      industry: valueAt(cells, mapping, 'industry'),
      raw_contact_person: rawContactPerson,
      source_file: fileName,
      source_sheet: sheet.name,
      source_row: sourceRow,
      source_reference: valueAt(cells, mapping, 'source_reference'),
      dnc_status: valueAt(cells, mapping, 'dnc_status') || 'unknown',
      verification_status: 'unverified',
      duplicate_candidate: false,
      original_columns: originalColumns(sheet.headers, cells),
    }
    const errors = record.name ? [] : ['Provide a person name or organization name.']
    if (record.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email)) errors.push('Email format looks invalid.')
    const warnings = [
      record.record_type === 'organization' ? 'Stored as an organization; no person was inferred.' : '',
      record.dnc_status.toLowerCase() === 'unknown' ? 'Do-not-contact status is unknown; import is not consent for outreach.' : '',
      record.raw_contact_person && record.raw_contact_person !== record.name ? 'Review raw contact-person text; no name or title was inferred from it.' : '',
      !explicitPersonName && nameHeader === 'name' ? 'Generic Name column: confirm whether each row is a person or an organization.' : '',
    ].filter(Boolean)
    return {
      record,
      key: `${sheet.name}\u0000${sourceRow}\u0000${JSON.stringify(cells)}`,
      errors,
      warnings,
    }
  })
}

function exactRowSignature(entry: CheckedImportRecord): string {
  return JSON.stringify(Object.values(entry.record.original_columns).map(normalizeValue))
}

export function markDuplicateCandidates(entries: CheckedImportRecord[]): CheckedImportRecord[] {
  const groups = new Map<string, number[]>()
  entries.forEach((entry, index) => {
    const r = entry.record
    const name = normalizeValue(r.name)
    if (!name) return
    const keys = [`exact:${r.record_type}:${exactRowSignature(entry)}`]
    if (r.record_type === 'person') {
      if (r.business) keys.push(`person-business:${name}|${normalizeValue(r.business)}`)
      if (r.email) keys.push(`person-email:${name}|${normalizeValue(r.email)}`)
      if (r.phone) keys.push(`person-phone:${name}|${normalizeValue(r.phone)}`)
    } else {
      if (r.website) keys.push(`organization-website:${name}|${normalizeValue(r.website)}`)
      if (r.industry && r.location) keys.push(`organization-location:${name}|${normalizeValue(r.industry)}|${normalizeValue(r.location)}`)
    }
    for (const key of keys) {
      const group = groups.get(key)
      if (group) group.push(index)
      else groups.set(key, [index])
    }
  })
  const duplicateIndexes = new Set<number>()
  for (const indexes of groups.values()) {
    if (indexes.length < 2) continue
    for (const index of indexes) duplicateIndexes.add(index)
  }
  return entries.map((entry, index) => ({
    ...entry,
    record: { ...entry.record, duplicate_candidate: duplicateIndexes.has(index) },
  }))
}

export function sha256Hex(data: ArrayBuffer | Uint8Array): Promise<string> {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data)
  return crypto.subtle.digest('SHA-256', bytes).then(digest =>
    Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join(''),
  )
}
