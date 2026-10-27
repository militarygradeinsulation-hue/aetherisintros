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
import { safeLinkedInLink } from '../prospect/core'
import { ImportReviewTable } from '../ImportReviewTable'
import { autoMapColumns } from './contact-automap'
import { validateProspectGrid } from '../prospect/upload'

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
    { key: 'socials', label: 'Socials / website', hints: ['twitter', 'instagram', 'facebook', 'website', 'social'] },
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

const autoMap = (headers: string[], target: Target, sample: string[][] = []) => autoMapColumns(headers, target, sample)

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
type Vals = Partial<Record<'fullName'|'firstName'|'lastName'|'email'|'phone'|'title'|'companyName'|'location'|'linkedinUrl'|'notes'|'name'|'domain'|'website'|'industry'|'employees', string>> & Record<string, string | undefined>
type Checked = { sourceRow: number; values: Vals; errors: string[]; warnings: string[] }

// Index identity keys once. The previous per-row scan was quadratic on large contact files.
function personIdentityKeys(value: { email?: string; linkedinUrl?: string; fullName?: string; companyName?: string }): string[] {
  const normalized = (text?: string) => (text ?? '').trim().toLowerCase()
  const email = normalized(value.email)
  const linkedin = value.linkedinUrl ? safeLinkedInLink(value.linkedinUrl) : null
  const name = normalized(value.fullName), company = normalized(value.companyName)
  return [
    ...(email ? ['email:' + email] : []),
    ...(linkedin ? ['linkedin:' + linkedin] : []),
    ...(name && company ? ['name-company:' + name + '|' + company] : []),
  ]
}

export default function SheetImport({ onBack, initialTarget = 'people' }: { onBack?: () => void; initialTarget?: Target } = {}) {
  const ops = useOps()
  const [target, setTarget] = useState<Target>(initialTarget)
  const [fileName, setFileName] = useState('')
  const [grid, setGrid] = useState<string[][]>([])
  const [map, setMap] = useState<Record<string, number>>({})
  const [skipBad, setSkipBad] = useState(true)
  const [removeDupes, setRemoveDupes] = useState(true)
  const [progress, setProgress] = useState<{ done: number; total: number; recent: string[] } | null>(null)
  const [busy, setBusy] = useState(false)
  const importingRef = useRef(false)
  const importedRowsRef = useRef(new Set<string>())
  const [done, setDone] = useState<string | null>(null)
  const [readError, setReadError] = useState<string | null>(null)
  const [detailRow, setDetailRow] = useState<number | null>(null)

  useEffect(() => { const f = takePendingSheet(); if (f) void load(f) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const headers = grid[0] ?? []
  const body = useMemo(() => grid.slice(1), [grid])

  const load = async (file: File) => {
    setDone(null); setReadError(null)
    const plainText = /\.(csv|tsv|txt)$/i.test(file.name)
    try {
      let rows: string[][]
      if (plainText) rows = parseCsv(await file.text())
      else {
        // Any spreadsheet format: Excel (old and new), Numbers, OpenOffice.
        const { readSheetRows } = await import('../contact-files')
        rows = await readSheetRows(file)
      }
      // Exports often have ragged rows (trailing blanks); square them to the header width.
      const width = rows[0]?.length ?? 0
      rows = rows.filter(r => r.some(c => c.trim())).map(r => r.length === width ? r : [...r.slice(0, width), ...Array(Math.max(0, width - r.length)).fill('')])
      validateProspectGrid(rows)
      importedRowsRef.current.clear()
      setDetailRow(null)
      setFileName(file.name); setGrid(rows); setMap(autoMap(rows[0] ?? [], target, rows.slice(1, 51)))
    } catch (error) { setGrid([]); setReadError(error instanceof Error ? error.message : 'That file could not be read.') }
  }

  const switchTarget = (t: Target) => { setTarget(t); setMap(autoMap(headers, t, body.slice(0, 50))); setDetailRow(null); setDone(null) }

  const checked: Checked[] = useMemo(() => {
    const seen = new Set<string>()
    const peopleKeys = new Set(ops.people.flatMap(personIdentityKeys))
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
        const keys = personIdentityKeys(values)
        if (keys.some(key => peopleKeys.has(key))) errors.push('Duplicate person identity')
        keys.forEach(key => peopleKeys.add(key))
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

  const DUPE = /^(Duplicate person identity|Already in your CRM|Repeated in this sheet)$/
  const isDupe = (c: Checked) => c.errors.length > 0 && c.errors.every(e => DUPE.test(e))
  const dupeCount = checked.filter(isDupe).length
  const considered = removeDupes ? checked.filter(c => !isDupe(c)) : checked
  const good = considered.filter(c => !c.errors.length)
  const bad = considered.length - good.length
  const reviewFields = FIELDS[target].filter(f => f.key in map || (f.key === 'fullName' && target === 'people'))
  const selectedReview = detailRow === null ? null : checked[detailRow] ?? null
  const required = FIELDS[target].filter(f => f.required)
  const missingRequired = target === 'people'
    ? !('fullName' in map) && !('firstName' in map)
    : required.some(f => !(f.key in map))

  const run = async () => {
    // A second click must not create duplicate contacts before the first import finishes.
    if (importingRef.current) return
    setReadError(null)
    const selected = safeImportSelection(considered, skipBad)
    if (selected.error) { setReadError(selected.error); return }
    const pending = selected.rows.filter(row => !importedRowsRef.current.has(`${target}:${row.sourceRow}`))
    if (!pending.length) { setReadError('There are no new valid records to import. All confirmed rows in this file are already saved.'); return }

    importingRef.current = true
    setBusy(true)
    let saved = 0
    let failed = 0
    let failureDetail = ''
    setProgress({ done: 0, total: pending.length, recent: [] })
    const queue = [...pending]
    // Save several at once and show each contact the moment it lands.
    const worker = async () => {
      for (let candidate = queue.shift(); candidate; candidate = queue.shift()) {
        const v = candidate.values
        try {
          const res = target === 'people'
            ? await ops.createPerson({
              fullName: v.fullName ?? '', email: v.email ?? '', phone: v.phone ?? '', title: v.title ?? '',
              companyName: v.companyName ?? '', location: v.location ?? '', linkedinUrl: v.linkedinUrl ?? '',
              notes: [v.notes, v['socials'] ? `Socials: ${v['socials']}` : ''].filter(Boolean).join('\n'), source: `Import · ${fileName}`,
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
        const label = (target === 'people' ? v.fullName : v.name) ?? ''
        setProgress(p => p && { ...p, done: p.done + 1, recent: [label, ...p.recent].slice(0, 6) })
      }
    }
    try {
      await Promise.all(Array.from({ length: Math.min(4, pending.length) }, worker))
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

  const reset = () => { setProgress(null); setDetailRow(null); importedRowsRef.current.clear(); setGrid([]); setFileName(''); setMap({}); setDone(null); setReadError(null) }

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
      <b>Drop a contacts CSV or Excel spreadsheet here, or choose a file</b>
      <small>Exported from Google Sheets, Excel, HubSpot or anywhere else. First row should be column names.</small>
      <input type="file" accept=".csv,.tsv,.txt,.xlsx,.xls,.xlsm,.ods,.numbers,text/csv" className="fcrm-sr"
        onChange={e => { const f = e.target.files?.[0]; if (f) void load(f); e.target.value = '' }} />
    </label> : <>
      <section className="simp-block">
        <header>
          <Eyebrow>1 · MATCH COLUMNS</Eyebrow>
          <span className="simp-file">{fileName} · {body.length} rows</span>
          <Btn kind="quiet" onClick={() => setMap(autoMap(headers, target, body.slice(0, 50)))}><Wand2 size={14} /> Auto-match</Btn>
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
        <ImportReviewTable
          rows={checked}
          scopeKey={fileName + ':' + target}
          label="Import row preview"
          headings={['Source row', ...reviewFields.map(f => f.label), 'Validation', 'Details']}
          tableClassName="ops-table"
          renderRow={(c, index) => <tr key={c.sourceRow} className={c.errors.length ? 'simp-bad' : ''} aria-rowindex={index + 2}>
            <td>{c.sourceRow + 2}</td>
            {reviewFields.map(f => <td key={f.key} title={c.values[f.key] || ''}>{c.values[f.key] || '—'}</td>)}
            <td title={[...c.errors, ...c.warnings].join(' · ')}>
              {c.errors.length
                ? <span className="fcrm-pill bad">{c.errors.join(' · ')}</span>
                : <span className="fcrm-pill good">{c.warnings.length ? 'Ready · ' + c.warnings.join(', ') : 'Ready'}</span>}
            </td>
            <td><button type="button" className="import-review-inspect" onClick={() => setDetailRow(index)}
              aria-label={'Inspect source row ' + (c.sourceRow + 2)}>Inspect</button></td>
          </tr>}
        />
        {selectedReview && <section className="import-review-detail" aria-label="Selected source row details">
          <h4>Source row {selectedReview.sourceRow + 2} · mapped contact fields</h4>
          <dl>{FIELDS[target].map(field => <div key={field.key}><dt>{field.label}</dt><dd>{selectedReview.values[field.key] || 'Not provided'}</dd></div>)}</dl>
          {selectedReview.errors.length > 0 && <p role="alert">{selectedReview.errors.join(' · ')}</p>}
          {selectedReview.warnings.length > 0 && <p>{selectedReview.warnings.join(' · ')}</p>}
          <details><summary>Original source columns (read only)</summary>
            <dl>{headers.map((header, column) => <div key={column}><dt>{header || 'Column ' + (column + 1)}</dt><dd>{body[selectedReview.sourceRow]?.[column] || '—'}</dd></div>)}</dl>
          </details>
          <button type="button" className="import-review-inspect" onClick={() => setDetailRow(null)}>Close inspection</button>
        </section>}
        <p className="ops-note">Every one of the {checked.length.toLocaleString()} source rows is validated and available to review. Scroll or jump to any row; inspection does not change imported data.</p>
      </section>

      {progress && <section className="simp-block" aria-live="polite">
        <Eyebrow>{busy ? 'ADDING NOW' : 'FINISHED'} · {progress.done} OF {progress.total}</Eyebrow>
        <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,.1)', overflow: 'hidden', margin: '8px 0' }}>
          <div style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%`, height: '100%', background: '#0F5CCB', transition: 'width .2s' }} />
        </div>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, opacity: .85 }}>{progress.recent.map((n, i) => <li key={`${n}-${i}`}>{n} added</li>)}</ul>
      </section>}

      <section className="simp-block simp-go">
        <label className="simp-toggle">
          <input type="checkbox" checked={removeDupes} onChange={e => setRemoveDupes(e.target.checked)} />
          Remove duplicates — {dupeCount} found (same person twice in this file, or already in your CRM)
        </label>
        <label className="simp-toggle">
          <input type="checkbox" checked={skipBad} onChange={e => setSkipBad(e.target.checked)} />
          Skip rows with problems (otherwise, resolve them before importing)
        </label>
        <div>
          <Btn kind="quiet" onClick={reset}><RotateCcw size={14} /> Start over</Btn>
          <Btn kind="primary" disabled={busy || missingRequired || !good.length || (!skipBad && bad > 0)} onClick={() => void run()}>
            {busy && progress ? `Adding ${progress.done} of ${progress.total}…` : `Add ${good.length} to CRM`}
          </Btn>
        </div>
      </section>
    </>}

    {readError && <p className="simp-warn" role="alert">{readError}</p>}
  </div>
}
