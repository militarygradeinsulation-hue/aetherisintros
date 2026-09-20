/**
 * AETHERIS GRID — a spreadsheet that reads the same records as the CRM.
 *
 * Linked sheets are projections over canonical records: editing a writable
 * linked field writes to the CRM record itself, so the change appears in CRM,
 * Grid and Intros at once. Freeform sheets are the member's own data with a
 * safe formula engine (no arbitrary code is ever executed).
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Columns3, Copy, Download, FilePlus2, Plus, Rows3, Snowflake, Trash2, Upload,
} from 'lucide-react'

import { Btn, Eyebrow, Head } from '../ui'
import { useNetwork } from '../store'
import { useOps } from '../crm/store'
import { linkedTemplates } from '../crm/linked'
import { colLetters, evaluateFormula } from '../crm/formula'
import { projectRows, type NetworkIndex, type ProjectedRow } from '../crm/project'
import type { GridColumn, GridColumnType, LinkedEntity } from '../crm/types'

const columnTypes: GridColumnType[] = ['text', 'number', 'currency', 'percent', 'date', 'checkbox', 'select', 'relation', 'formula']

const fmt = (value: unknown, type: GridColumnType) => {
  if (value === null || value === undefined || value === '') return ''
  if (type === 'currency') {
    const n = Number(value)
    return Number.isFinite(n) ? n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }) : String(value)
  }
  if (type === 'percent') {
    const n = Number(value)
    return Number.isFinite(n) ? `${Math.round(n)}%` : String(value)
  }
  if (type === 'checkbox') return value === true || value === 'true' ? 'Yes' : 'No'
  return String(value)
}

const csvCell = (value: unknown) => {
  const text = value === null || value === undefined ? '' : String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function parseDelimited(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  const delim = text.includes('\t') ? '\t' : ','
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i += 1 }
      else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"') quoted = true
    else if (ch === delim) { row.push(cell); cell = '' }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = '' }
    else if (ch !== '\r') cell += ch
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row) }
  return rows.filter(r => r.some(v => v.trim() !== ''))
}

export default function GridPage() {
  const ops = useOps()
  const net = useNetwork()

  const networkIndex = useMemo<NetworkIndex>(() => Object.fromEntries(net.members.map(m => [m.id, {
    scoreTotal: m.scoreTotal, whyThem: m.whyThem, whyNow: m.whyNow, nextAction: m.nextAction,
    relationshipStatus: m.relationshipStatus, introState: m.introState,
  }])), [net.members])

  const workbooks = ops.workbooks.filter(w => !w.archived)
  const [workbookId, setWorkbookId] = useState<string>('')
  const activeWorkbook = workbooks.find(w => w.id === workbookId) ?? workbooks[0]
  const sheets = ops.sheets.filter(s => s.workbookId === activeWorkbook?.id && !s.archived).sort((a, b) => a.position - b.position)
  const [sheetId, setSheetId] = useState<string>('')
  const sheet = sheets.find(s => s.id === sheetId) ?? sheets[0]

  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  const makeWorkbook = async (name: string, description = '') => {
    setNotice('')
    setBusy(true)
    try {
      const created = await ops.createWorkbook(name, description)
      if (created) { setWorkbookId(created.id); setSheetId('') }
      else setNotice(ops.lastError() || 'The workbook could not be created just now. Try again in a moment.')
    } finally {
      setBusy(false)
    }
  }

  const columns = useMemo(
    () => ops.columns.filter(c => c.sheetId === sheet?.id).sort((a, b) => a.position - b.position),
    [ops.columns, sheet?.id],
  )

  const linkedRows: ProjectedRow[] = useMemo(() => {
    if (!sheet || sheet.mode !== 'linked' || !sheet.entityType) return []
    return projectRows(sheet.entityType as LinkedEntity, ops, networkIndex)
  }, [sheet, ops, networkIndex])

  const freeRows = useMemo(
    () => ops.rows.filter(r => r.sheetId === sheet?.id).sort((a, b) => a.position - b.position),
    [ops.rows, sheet?.id],
  )

  const baseRows = sheet?.mode === 'linked'
    ? linkedRows.map(r => ({ id: r.entityId, values: r.values }))
    : freeRows.map(r => ({ id: r.id, values: r.values }))

  const [filter, setFilter] = useState('')
  const sortConf = sheet?.config?.sort ?? null
  const rows = useMemo(() => {
    const term = filter.trim().toLowerCase()
    let out = term
      ? baseRows.filter(r => Object.values(r.values).some(v => String(v ?? '').toLowerCase().includes(term)))
      : baseRows
    if (sortConf) {
      const dir = sortConf.dir === 'desc' ? -1 : 1
      out = [...out].sort((a, b) => {
        const av = a.values[sortConf.key], bv = b.values[sortConf.key]
        const an = Number(av), bn = Number(bv)
        if (Number.isFinite(an) && Number.isFinite(bn)) return (an - bn) * dir
        return String(av ?? '').localeCompare(String(bv ?? '')) * dir
      })
    }
    return out
  }, [baseRows, filter, sortConf])

  const [cell, setCell] = useState<{ r: number; c: number }>({ r: 0, c: 0 })
  const [editing, setEditing] = useState<string | null>(null)
  const [newSheet, setNewSheet] = useState('')
  const [creating, setCreating] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setCell({ r: 0, c: 0 }); setEditing(null) }, [sheet?.id])

  const lookup = (ref: string) => {
    const match = /^([A-Z]+)(\d+)$/.exec(ref)
    if (!match) return ''
    const letters = match[1] ?? ''
    let index = 0
    for (const ch of letters) index = index * 26 + (ch.charCodeAt(0) - 64)
    const col = columns[index - 1]
    const row = rows[Number(match[2]) - 1]
    if (!col || !row) return ''
    return row.values[col.key] ?? ''
  }

  const display = (value: unknown, column: GridColumn) => {
    const raw = value === null || value === undefined ? '' : String(value)
    if (raw.startsWith('=')) {
      const result = evaluateFormula(raw, lookup)
      return result.error ? result.error : fmt(result.value, column.type)
    }
    return fmt(value, column.type)
  }

  const commit = async (rowIndex: number, colIndex: number, value: string) => {
    const column = columns[colIndex]
    const row = rows[rowIndex]
    setEditing(null)
    if (!column || !row || !sheet) return
    if (sheet.mode === 'linked' && sheet.entityType) {
      if (!column.writable) return
      await ops.writeLinkedField(sheet.entityType as LinkedEntity, row.id, column.key, value)
    } else {
      await ops.setCell(row.id, column.key, value)
    }
  }

  const move = (dr: number, dc: number) => setCell(prev => ({
    r: Math.max(0, Math.min(rows.length - 1, prev.r + dr)),
    c: Math.max(0, Math.min(columns.length - 1, prev.c + dc)),
  }))

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (editing !== null) return
    const key = event.key
    if (key === 'ArrowDown') { event.preventDefault(); move(1, 0) }
    else if (key === 'ArrowUp') { event.preventDefault(); move(-1, 0) }
    else if (key === 'ArrowLeft') { event.preventDefault(); move(0, -1) }
    else if (key === 'ArrowRight' || key === 'Tab') { event.preventDefault(); move(0, key === 'Tab' ? 1 : 1) }
    else if (key === 'Enter') {
      event.preventDefault()
      const current = rows[cell.r]?.values[columns[cell.c]?.key ?? ''] ?? ''
      setEditing(String(current))
    } else if (key === 'Delete' || key === 'Backspace') { event.preventDefault(); void commit(cell.r, cell.c, '') }
    else if (key.length === 1 && !event.metaKey && !event.ctrlKey) { setEditing(key) }
  }

  const onPaste = async (event: React.ClipboardEvent) => {
    const text = event.clipboardData.getData('text/plain')
    if (!text.trim() || !sheet) return
    event.preventDefault()
    const table = parseDelimited(text)
    if (sheet.mode === 'freeform') {
      const needed = cell.r + table.length - rows.length
      if (needed > 0) {
        await ops.addRows(sheet.id, Array.from({ length: needed }, () => ({})))
        return
      }
    }
    for (let r = 0; r < table.length; r += 1) {
      const line = table[r] ?? []
      for (let c = 0; c < line.length; c += 1) {
        const target = rows[cell.r + r]
        const column = columns[cell.c + c]
        if (!target || !column) continue
        await commit(cell.r + r, cell.c + c, line[c] ?? '')
      }
    }
  }

  const exportCsv = () => {
    if (!sheet) return
    const header = columns.map(c => csvCell(c.name)).join(',')
    const body = rows.map(r => columns.map(c => csvCell(r.values[c.key])).join(',')).join('\n')
    const blob = new Blob([`${header}\n${body}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${sheet.name.replace(/\s+/g, '-').toLowerCase()}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const importCsv = async (file: File) => {
    if (!sheet) return
    const table = parseDelimited(await file.text())
    const [header, ...body] = table
    if (!header || !body.length) return
    const keys = header.map(name => columns.find(c => c.name.toLowerCase() === name.trim().toLowerCase())?.key)
    if (sheet.mode === 'linked' && sheet.entityType) {
      for (const line of body) {
        const primary = line[0] ?? ''
        if (primary.trim()) await ops.createLinkedRecord(sheet.entityType as LinkedEntity, primary)
      }
    } else {
      await ops.addRows(sheet.id, body.map(line => Object.fromEntries(
        line.flatMap((value, i) => (keys[i] ? [[keys[i] as string, value]] : [])),
      )))
    }
  }

  const toggleSort = (key: string) => {
    if (!sheet) return
    const next = sortConf?.key === key && sortConf.dir === 'asc' ? { key, dir: 'desc' as const } : { key, dir: 'asc' as const }
    void ops.updateSheetConfig(sheet.id, { ...sheet.config, sort: next })
  }

  if (!ops.ready) return <p className="ops-note">Loading your workbooks…</p>

  if (!activeWorkbook) {
    return <>
      <Head label="AETHERIS GRID" title="Spreadsheets that read your real records."
        copy="Grid is not a second copy of your data. A linked sheet is a live view of your CRM people, companies, pipeline and tasks — edit a cell and the record changes everywhere. Freeform sheets are yours alone for budgets, lists and modelling."
        proof="Every workbook is private to your account." />
      <section className="ops-empty">
        <Eyebrow>{ops.signedIn ? 'NO WORKBOOKS YET' : 'SIGN IN TO USE GRID'}</Eyebrow>
        <h2>Start with one workbook.</h2>
        <p>{ops.signedIn
          ? 'Each workbook holds as many sheets as you need — linked views of your records, plus freeform sheets for your own numbers.'
          : 'Workbooks live inside your own account, so nothing can be saved here while you are signed out. Sign in and your first workbook takes one click.'}</p>
        <Btn disabled={busy} onClick={() => { void makeWorkbook('Operating Workbook', 'Relationships, pipeline and numbers in one place.') }}>
          <Plus size={14} /> {busy ? 'Creating…' : 'Create workbook'}
        </Btn>
        {notice && <p className="ops-note" role="status">{notice}</p>}
      </section>
    </>
  }

  const activeColumn = columns[cell.c]
  const activeRawValue = rows[cell.r]?.values[activeColumn?.key ?? ''] ?? ''
  const cellRef = `${colLetters(cell.c)}${cell.r + 1}`
  const readOnly = sheet?.mode === 'linked' && activeColumn ? !activeColumn.writable : false

  return <>
    <Head label="AETHERIS GRID" title={activeWorkbook.name}
      copy={activeWorkbook.description || 'Linked sheets read your canonical records. Freeform sheets are your own working numbers.'}
      proof="Edit a linked cell and the CRM record changes with it."
      action={<Btn kind="secondary" onClick={() => { void ops.createWorkbook(`Workbook ${workbooks.length + 1}`) }}><FilePlus2 size={14} /> New workbook</Btn>} />

    <div className="grid-shell">
      <div className="grid-bar">
        <select aria-label="Workbook" value={activeWorkbook.id} onChange={e => { setWorkbookId(e.target.value); setSheetId('') }}>
          {workbooks.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <div className="grid-tabs" role="tablist" aria-label="Sheets">
          {sheets.map(s => <button key={s.id} role="tab" aria-selected={s.id === sheet?.id}
            className={s.id === sheet?.id ? 'active' : ''} onClick={() => setSheetId(s.id)}>
            {s.name}{s.mode === 'linked' && <i className="grid-linked-dot" title="Linked to your records" />}
          </button>)}
          <button className="grid-add" onClick={() => setCreating(v => !v)} aria-label="Add sheet"><Plus size={14} /></button>
        </div>
        <div className="grid-tools">
          <input className="grid-filter" value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter rows…" aria-label="Filter rows" />
          {sheet && <button onClick={() => void ops.updateSheetConfig(sheet.id, { ...sheet.config, frozenRow: !sheet.config?.frozenRow })}
            className={sheet.config?.frozenRow ? 'on' : ''} title="Freeze first row"><Snowflake size={14} /></button>}
          <button onClick={exportCsv} title="Export CSV"><Download size={14} /></button>
          <button onClick={() => fileRef.current?.click()} title="Import CSV"><Upload size={14} /></button>
          {sheet && <button onClick={() => void ops.duplicateSheet(sheet.id)} title="Duplicate sheet"><Copy size={14} /></button>}
          {sheet && <button onClick={() => void ops.archiveSheet(sheet.id)} title="Archive sheet"><Trash2 size={14} /></button>}
          <input ref={fileRef} type="file" accept=".csv,text/csv" hidden
            onChange={e => { const f = e.target.files?.[0]; if (f) void importCsv(f); e.target.value = '' }} />
        </div>
      </div>

      {creating && <div className="grid-new-sheet">
        <Eyebrow>ADD A SHEET</Eyebrow>
        <input value={newSheet} onChange={e => setNewSheet(e.target.value)} placeholder="Sheet name" aria-label="Sheet name" />
        <div className="grid-template-list">
          {linkedTemplates.map(t => <button key={t.id} onClick={() => {
            void ops.createSheet(activeWorkbook.id, newSheet.trim() || t.label, t.id).then(created => {
              if (created) setSheetId(created.id)
              setNewSheet(''); setCreating(false)
            })
          }}><b>{t.label}</b><small>{t.blurb}</small></button>)}
        </div>
      </div>}

      {sheet && <>
        <div className="grid-formula">
          <span className="grid-ref">{cellRef}</span>
          <input value={editing !== null ? editing : String(activeRawValue ?? '')} readOnly={readOnly}
            aria-label="Formula bar"
            onChange={e => setEditing(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && editing !== null) void commit(cell.r, cell.c, editing) }} />
          {readOnly && <small>Network intelligence · read only</small>}
        </div>

        <div ref={gridRef} className={`grid-scroll ${sheet.config?.frozenRow ? 'freeze-row' : ''}`}
          tabIndex={0} onKeyDown={onKeyDown} onPaste={e => void onPaste(e)}>
          <table className="grid-table">
            <thead>
              <tr>
                <th className="grid-corner" />
                {columns.map((c, i) => <th key={c.id} style={{ width: c.width }}>
                  <button className="grid-col-name" onClick={() => toggleSort(c.key)} title="Sort by this column">
                    {c.name}{sortConf?.key === c.key ? (sortConf.dir === 'asc' ? ' ↑' : ' ↓') : ''}
                  </button>
                  <span className="grid-col-letter">{colLetters(i)}</span>
                  {sheet.mode === 'freeform' && <span className="grid-col-tools">
                    <select value={c.type} aria-label={`${c.name} type`}
                      onChange={e => void ops.updateColumn(c.id, { type: e.target.value as GridColumnType })}>
                      {columnTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <button onClick={() => void ops.updateColumn(c.id, { width: Math.min(420, c.width + 40) })} aria-label="Widen column">+</button>
                    <button onClick={() => void ops.removeColumn(c.id)} aria-label="Delete column">×</button>
                  </span>}
                  {!c.writable && sheet.mode === 'linked' && <span className="grid-ro">read only</span>}
                </th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, r) => <tr key={row.id}>
                <th className="grid-rownum">{r + 1}</th>
                {columns.map((c, ci) => {
                  const active = cell.r === r && cell.c === ci
                  const locked = sheet.mode === 'linked' && !c.writable
                  return <td key={c.id} className={`${active ? 'active' : ''} ${locked ? 'locked' : ''} type-${c.type}`}
                    onClick={() => { setCell({ r, c: ci }); setEditing(null) }}
                    onDoubleClick={() => { if (!locked) setEditing(String(row.values[c.key] ?? '')) }}>
                    {active && editing !== null && !locked
                      ? <input autoFocus value={editing} onChange={e => setEditing(e.target.value)}
                          onBlur={() => void commit(r, ci, editing)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') { e.preventDefault(); void commit(r, ci, editing); move(1, 0) }
                            if (e.key === 'Escape') setEditing(null)
                            if (e.key === 'Tab') { e.preventDefault(); void commit(r, ci, editing); move(0, 1) }
                          }} />
                      : <span>{display(row.values[c.key], c)}</span>}
                  </td>
                })}
              </tr>)}
            </tbody>
          </table>
          {!rows.length && <p className="ops-note">
            {sheet.mode === 'linked'
              ? 'No records yet. Add people, companies or opportunities in CRM — or add a row here and the record is created for you.'
              : 'Empty sheet. Add a row to start.'}
          </p>}
        </div>

        <div className="grid-footer">
          <Btn kind="quiet" onClick={() => {
            if (sheet.mode === 'linked' && sheet.entityType) void ops.createLinkedRecord(sheet.entityType as LinkedEntity, 'Untitled')
            else void ops.addRow(sheet.id)
          }}><Rows3 size={14} /> Add row</Btn>
          {sheet.mode === 'freeform' && <Btn kind="quiet" onClick={() => {
            const name = window.prompt('Column name')
            if (name?.trim()) void ops.addColumn(sheet.id, name.trim(), 'text')
          }}><Columns3 size={14} /> Add column</Btn>}
          {sheet.mode === 'freeform' && rows[cell.r] && <Btn kind="quiet" onClick={() => void ops.removeRow(rows[cell.r]!.id)}>
            <Trash2 size={14} /> Delete row {cell.r + 1}</Btn>}
          <span className="grid-count">{rows.length} rows · {columns.length} columns · {sheet.mode === 'linked' ? 'linked to your records' : 'freeform'}</span>
        </div>
      </>}
    </div>
  </>
}
