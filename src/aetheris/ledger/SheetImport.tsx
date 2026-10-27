/**
 * Spreadsheet import: upload → match columns → check rows → add to CRM.
 * Writes only through the basic CRM (useOps), so imported records are real,
 * account-scoped, and flow into the full workspace automatically.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { takePendingSheet } from '../drop-anywhere'
import { Check, ChevronLeft, FileUp, RotateCcw, Wand2 } from 'lucide-react'
import { Btn, Eyebrow } from '../ui'
import { useOps } from '../crm/store'
import { safeImportSelection } from '../crm/import-policy'
import { isDuplicate, safeLinkedInLink } from '../prospect/core'
import { validateProspectFile, validateProspectGrid } from '../prospect/upload'

/** Members can import up to this many contacts per file. */
export const CONTACT_IMPORT_MAX_ROWS = 2000

type Target = 'people' | 'companies'
type Field = { key: string; label: string; required?: boolean; hints: string[] }

const FIELDS: Record<Target, Field[]> = {
  people: [
    { key: 'fullName', label: 'Full name', required: true, hints: ['full name', 'name', 'contact', 'person'] },
    { key: 'firstName', label: 'First name', hints: ['first', 'given'] },
    { key: 'lastName', label: 'Last name', hints: ['last', 'surname', 'family'] },
    { key: 'email', label: 'Email', hints: ['email', 'e-mail', 'mail'] },
    { key: 'phone', label: 'Phone', hints: ['phone', 'mobile', 'tel'] },
    { key: 'title', label: 'Title', hints: ['title', 'role', 'position', 'job'] },
    { key: 'companyName', label: 'Company', hints: ['company', 'organisation', 'organization', 'account', 'employer'] },
    { key: 'location', label: 'Location', hints: ['location', 'city', 'country', 'region'] },
    { key: 'linkedinUrl', label: 'LinkedIn', hints: ['linkedin'] },
    { key: 'notes', label: 'Notes', hints: ['note', 'comment'] },
  ],
  companies: [
    { key: 'name', label: 'Company name', required: true, hints: ['company', 'name', 'account', 'organisation', 'organization'] },
    { key: 'domain', label: 'Domain', hints: ['domain'] },
    { key: 'website', label: 'Website', hints: ['website', 'url', 'site'] },
    { key: 'industry', label: 'Industry', hints: ['industry', 'sector', 'vertical'] },
    { key: 'location', label: 'Location', hints: ['location', 'city', 'country', 'hq'] },
    { key: 'phone', label: 'Phone', hints: ['phone', 'tel'] },
    { key: 'employees', label: 'Employees', hints: ['employees', 'headcount', 'size'] },
    { key: 'revenueBand', label: 'Revenue band', hints: ['revenue band', 'revenue'] },
    { key: 'notes', label: 'Notes', hints: ['note', 'comment'] },
  ],
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = [], cell = '', q = false
  const delim = (text.split('\n')[0] ?? '').split('\t').length > (text.split('\n')[0] ?? '').split(',').length ? '\t' : ','
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++ }
      else if (ch === '"') q = false
      else cell += ch
    } else if (ch === '"') q = true
    else if (ch === delim) { row.push(cell); cell = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(cell); cell = ''
      if (row.some(c => c.trim())) rows.push(row)
      row = []
    } else cell += ch
  }
  if (q) throw new Error('The file contains an unclosed quoted cell.')
  row.push(cell)
  if (row.some(c => c.trim())) rows.push(row)
  return rows
}

function autoMap(headers: string[], target: Target): Record<string, number> {
  const out: Record<string, number> = {}
  const used = new Set<number>()
  for (const f of FIELDS[target]) {
    const i = headers.findIndex((h, idx) => !used.has(idx) && f.hints.some(x => h.toLowerCase().trim() === x))
      ?? -1
    const j = i >= 0 ? i : headers.findIndex((h, idx) => !used.has(idx) && f.hints.some(x => h.toLowerCase().includes(x)))
    if (j >= 0) { out[f.key] = j; used.add(j) }
  }
  return out
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
type Vals = Partial<Record<'fullName'|'firstName'|'lastName'|'email'|'phone'|'title'|'companyName'|'location'|'linkedinUrl'|'notes'|'name'|'domain'|'website'|'industry'|'employees', string>> & Record<string, string | undefined>
type Checked = { sourceRow: number; values: Vals; errors: string[]; warnings: string[] }

export default function SheetImport({ onBack, initialTarget = 'people' }: { onBack?: () => void; initialTarget?: Target } = {}) {
  const ops = useOps()
  const [target, setTarget] = useState<Target>(initialTarget)
  const [fileName, setFileName] = useState('')
  const [grid, setGrid] = useState<string[][]>([])
  const [map, setMap] = useState<Record<string, number>>({})
  const [skipBad, setSkipBad] = useState(true)
  const [busy, setBusy] = useState(false)
  const importingRef = useRef(false)
  const importedRowsRef = useRef(new Set<string>())
  const [done, setDone] = useState<string | null>(null)
  const [readError, setReadError] = useState<string | null>(null)

  useEffect(() => { const f = takePendingSheet(); if (f) void load(f) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const headers = grid[0] ?? []
  const body = grid.slice(1)

  const load = async (file: File) => {
    setDone(null); setReadError(null)
    const plainText = /\.(csv|tsv|txt)$/i.test(file.name)
    try {
      if (file.size > 20 * 1024 * 1024) throw new Error('Upload at most 20 MB at a time.')
      let rows: string[][]
      if (plainText) rows = parseCsv(await file.text())
      else {
        // Any spreadsheet format: Excel (old and new), Numbers, OpenOffice.
        const { readSheetRows } = await import('../contact-files')
        rows = await readSheetRows(file)
      }
      validateProspectGrid(rows, CONTACT_IMPORT_MAX_ROWS, 300)
      importedRowsRef.current.clear()
      setFileName(file.name); setGrid(rows); setMap(autoMap(rows[0] ?? [], target))
    } catch (error) { setGrid([]); setReadError(error instanceof Error ? error.message : 'That file could not be read.') }
  }

  const switchTarget = (t: Target) => { setTarget(t); setMap(autoMap(headers, t)); setDone(null) }

  const checked: Checked[] = useMemo(() => {
    const seen = new Set<string>()
    const seenPeople: Array<Partial<import('../crm/types').CrmPerson>> = []
    const existingEmails = new Set(ops.people.map(p => p.email.toLowerCase()).filter(Boolean))
    const existingCompanies = new Set(ops.companies.map(c => c.name.toLowerCase()))
    return body.map((r, sourceRow) => {
      const values: Vals = {}
      for (const [k, i] of Object.entries(map)) values[k] = (r[i] ?? '').trim()
      const errors: string[] = [], warnings: string[] = []
      if (target === 'people') {
        if (!values.fullName) values.fullName = [values.firstName, values.lastName].filter(Boolean).join(' ')
        if (!values.fullName) errors.push('No name')
        if (values.email && !EMAIL.test(values.email)) errors.push('Email looks wrong')
        if (values.linkedinUrl) {
          const url = safeLinkedInLink(values.linkedinUrl)
          if (!url) errors.push('Invalid LinkedIn profile URL')
          else values.linkedinUrl = url
        }
        if (isDuplicate(values, [...ops.people, ...seenPeople])) errors.push('Duplicate person identity')
        seenPeople.push(values)
        const key = (values.email || values.fullName || '').toLowerCase()
        if (values.email && existingEmails.has(values.email.toLowerCase())) errors.push('Already in your CRM')
        else if (key && seen.has(key)) errors.push('Repeated in this sheet')
        if (key) seen.add(key)
        if (!values.email) warnings.push('No email')
      } else {
        if (!values.name) errors.push('No company name')
        const key = (values.name || '').toLowerCase()
        if (key && existingCompanies.has(key)) errors.push('Already in your CRM')
        else if (key && seen.has(key)) errors.push('Repeated in this sheet')
        if (key) seen.add(key)
      }
      return { sourceRow, values, errors, warnings }
    })
  }, [body, map, target, ops.people, ops.companies])

  const good = checked.filter(c => !c.errors.length)
  const bad = checked.length - good.length
  const required = FIELDS[target].filter(f => f.required)
  const missingRequired = target === 'people'
    ? !('fullName' in map) && !('firstName' in map)
    : required.some(f => !(f.key in map))

  const run = async () => {
    // A second click must not create duplicate contacts before the first import finishes.
    if (importingRef.current) return
    setReadError(null)
    const selected = safeImportSelection(checked, skipBad)
    if (selected.error) { setReadError(selected.error); return }
    const pending = selected.rows.filter(row => !importedRowsRef.current.has(`${target}:${row.sourceRow}`))
    if (!pending.length) { setReadError('There are no new valid records to import. All confirmed rows in this file are already saved.'); return }

    importingRef.current = true
    setBusy(true)
    let saved = 0
    let failed = 0
    let failureDetail = ''
    try {
      for (const candidate of pending) {
        const v = candidate.values
        try {
          const res = target === 'people'
            ? await ops.createPerson({
              fullName: v.fullName ?? '', email: v.email ?? '', phone: v.phone ?? '', title: v.title ?? '',
              companyName: v.companyName ?? '', location: v.location ?? '', linkedinUrl: v.linkedinUrl ?? '',
              notes: v.notes ?? '', source: `Import · ${fileName}`,
            })
            : await ops.createCompany({
              name: v.name ?? '', domain: v.domain ?? '', website: v.website ?? '', industry: v.industry ?? '',
              location: v.location ?? '', phone: v.phone ?? '', employees: v.employees ?? '', notes: v.notes ?? '',
              revenueBand: v['revenueBand'] ?? '',
            })
          if (res) { saved += 1; importedRowsRef.current.add(`${target}:${candidate.sourceRow}`) }
          else {
            failed += 1
            failureDetail ||= ops.lastError() || 'The CRM did not confirm the record.'
          }
        } catch {
          failed += 1
          failureDetail ||= 'The CRM request failed or the network connection was interrupted.'
        }
      }
    } finally {
      importingRef.current = false
      setBusy(false)
    }
    const unit = target === 'people' ? (saved === 1 ? 'person' : 'people') : (saved === 1 ? 'company' : 'companies')
    setDone(`${saved} ${unit} saved to your CRM.`)
    if (failed) {
      setReadError(`${failed} record(s) could not be saved. ${failureDetail} The source file remains loaded so you can review or retry only the remaining valid records.`)
    } else if (selected.rows.length < checked.length) {
      setReadError(`${checked.length - selected.rows.length} invalid or duplicate row(s) were skipped. Your file remains loaded for review.`)
    } else {
      importedRowsRef.current.clear()
      setGrid([])
      setFileName('')
    }
  }

  const reset = () => { importedRowsRef.current.clear(); setGrid([]); setFileName(''); setMap({}); setDone(null); setReadError(null) }

  return <div className="simp">
    <div className="simp-intro">
      {onBack && <p style={{ margin: '0 0 10px' }}><Btn kind="quiet" onClick={onBack}><ChevronLeft size={14} /> Back to CRM</Btn></p>}
      <Eyebrow>IMPORT</Eyebrow>
      <h3>Bring your spreadsheet in. Keep only what’s clean.</h3>
      <p>Drop a CSV of contacts or companies. Intros matches the columns, flags anything broken or already here, and adds the rest to your CRM.</p>
    </div>

    <div className="simp-steps" role="tablist" aria-label="Import type">
      {(['people', 'companies'] as Target[]).map(t => <button key={t} type="button" role="tab"
        aria-selected={target === t} className={target === t ? 'active' : ''} onClick={() => switchTarget(t)}>
        {t === 'people' ? 'People' : 'Companies'}
      </button>)}
    </div>

    {done && <p className="simp-done"><Check size={14} /> {done}</p>}

    {!grid.length ? <label className="simp-drop"
      onDragOver={e => e.preventDefault()}
      onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) void load(f) }}>
      <FileUp size={22} />
      <b>Drop a CSV here, or choose a file</b>
      <small>Exported from Google Sheets, Excel, HubSpot or anywhere else. First row should be column names.</small>
      <input type="file" accept=".csv,.tsv,.txt,text/csv" className="fcrm-sr"
        onChange={e => { const f = e.target.files?.[0]; if (f) void load(f); e.target.value = '' }} />
    </label> : <>
      <section className="simp-block">
        <header>
          <Eyebrow>1 · MATCH COLUMNS</Eyebrow>
          <span className="simp-file">{fileName} · {body.length} rows</span>
          <Btn kind="quiet" onClick={() => setMap(autoMap(headers, target))}><Wand2 size={14} /> Auto-match</Btn>
        </header>
        <div className="simp-map">
          {FIELDS[target].map(f => <label key={f.key}>
            <span>{f.label}{f.required && ' *'}</span>
            <select value={map[f.key] ?? -1} onChange={e => {
              const i = Number(e.target.value)
              setMap(m => { const n = { ...m }; if (i < 0) delete n[f.key]; else n[f.key] = i; return n })
            }}>
              <option value={-1}>— Skip —</option>
              {headers.map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}
            </select>
          </label>)}
        </div>
        {missingRequired && <p className="simp-warn">Pick which column holds the {target === 'people' ? 'name' : 'company name'} to continue.</p>}
      </section>

      <section className="simp-block">
        <header>
          <Eyebrow>2 · CHECK ROWS</Eyebrow>
          <span className="simp-file"><b>{good.length}</b> ready · <b>{bad}</b> need attention</span>
        </header>
        <div className="ops-table-scroll" tabIndex={0} aria-label="Row check">
          <table className="ops-table">
            <thead><tr><th>#</th>{FIELDS[target].filter(f => f.key in map || (f.key === 'fullName' && target === 'people')).slice(0, 5).map(f => <th key={f.key}>{f.label}</th>)}<th>Check</th></tr></thead>
            <tbody>{checked.slice(0, 50).map((c, i) => <tr key={i} className={c.errors.length ? 'simp-bad' : ''}>
              <td>{i + 1}</td>
              {FIELDS[target].filter(f => f.key in map || (f.key === 'fullName' && target === 'people')).slice(0, 5).map(f => <td key={f.key}>{c.values[f.key] || '—'}</td>)}
              <td>{c.errors.length
                ? <span className="fcrm-pill bad">{c.errors.join(' · ')}</span>
                : <span className="fcrm-pill good">{c.warnings.length ? `Ready · ${c.warnings.join(', ')}` : 'Ready'}</span>}</td>
            </tr>)}</tbody>
          </table>
        </div>
        {checked.length > 50 && <p className="ops-note">Showing the first 50 of {checked.length} rows. All rows are checked.</p>}
      </section>

      <section className="simp-block simp-go">
        <label className="simp-toggle">
          <input type="checkbox" checked={skipBad} onChange={e => setSkipBad(e.target.checked)} />
          Skip invalid and duplicate rows (otherwise, resolve them before importing)
        </label>
        <div>
          <Btn kind="quiet" onClick={reset}><RotateCcw size={14} /> Start over</Btn>
          <Btn kind="primary" disabled={busy || missingRequired || !good.length || (!skipBad && bad > 0)} onClick={() => void run()}>
            {busy ? 'Adding…' : `Add ${good.length} to CRM`}
          </Btn>
        </div>
      </section>
    </>}

    {readError && <p className="simp-warn" role="alert">{readError}</p>}
  </div>
}
