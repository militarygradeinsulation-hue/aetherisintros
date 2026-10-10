/**
 * "Scan LinkedIn profile": paste a profile (or add LinkedIn's PDF export), scan it, then review
 * every field next to what is there now and tick what to apply. Nothing is saved until the
 * member clicks Apply, and the confirmation says exactly what happened.
 *
 * The panel is shared: My profile, onboarding and the CRM's new-contact form each pass their
 * fields, current values and what Apply does.
 */
import { AlertTriangle, Check, FileText, Link2, Loader2, ScanLine, X } from 'lucide-react'
import { useId, useRef, useState, type ReactNode } from 'react'

import { supabase } from '@/integrations/supabase/client'
import { scanLinkedInProfile } from '@/lib/linkedinImport.functions'
import { normalizeLinkedInUrl } from './linkedin-import'
import {
  buildReviewRows, checkedPatch, defaultChecked, LIST_KEYS, LONG_KEYS, MIN_SCAN_TEXT, parseScanText, profileColumns, scanValues,
  sourceLabel, type ReviewRow, type ScanKey, type ScanResult,
} from './linkedin-scan'
import { readPdfText } from './pdf-text'
import { isShowcase } from './showcase'
import { Btn, Eyebrow } from './ui'

export type ScanPatch = Partial<Record<ScanKey, string>>
/**
 * What Apply did: 'saved' only when the values were written to the account; 'filled' when a
 * form was filled but not saved (or the demo); 'failed' when nothing was written.
 */
export interface ApplyOutcome { status: 'saved' | 'filled' | 'failed'; message: string }

/** In the demo the built-in reader runs on the device; signed in, the server reads it. */
export async function runLinkedInScan(input: { text: string; url: string; nameHint?: string }, demo = isShowcase()): Promise<ScanResult> {
  if (demo) {
    if (input.text.trim().length < MIN_SCAN_TEXT) throw new Error('Paste the profile text or add the LinkedIn PDF first.')
    return { ...parseScanText(input.text, { ...(input.nameHint ? { nameHint: input.nameHint } : {}), url: input.url }), source: 'demo' }
  }
  return scanLinkedInProfile({ data: input })
}

/** Writes the ticked fields to the member's own public.profiles row and checks the write landed. */
export async function saveProfileScan(patch: ScanPatch): Promise<ApplyOutcome> {
  const columns = profileColumns(patch)
  const names = Object.keys(columns)
  if (!names.length) return { status: 'failed', message: 'Nothing was ticked, so nothing was saved.' }
  const { data } = await supabase.auth.getSession()
  const id = data.session?.user.id
  if (!id) return { status: 'failed', message: 'You are signed out. Sign in again; nothing was saved.' }
  const { data: rows, error } = await (supabase.from('profiles') as any).update(columns).eq('id', id).select('id') // eslint-disable-line @typescript-eslint/no-explicit-any
  if (error) return { status: 'failed', message: `Not saved: ${error.message}` }
  if (!rows?.length) return { status: 'failed', message: 'Not saved: your profile could not be found.' }
  return { status: 'saved', message: 'Saved to your profile.' }
}

const fieldCount = (n: number) => `${n} field${n === 1 ? '' : 's'}`

export function LinkedInScanPanel({
  keys, current, labels = {}, heading, intro, applyLabel = 'Apply', onApply, onClose, extraStep, extraReview, demo = isShowcase(),
}: {
  keys: ScanKey[]
  current: ScanPatch
  labels?: ScanPatch
  heading: string
  intro: string
  applyLabel?: string
  onApply: (patch: ScanPatch) => Promise<ApplyOutcome>
  onClose?: () => void
  extraStep?: ReactNode
  extraReview?: ReactNode
  demo?: boolean
}) {
  const uid = useId()
  const [url, setUrl] = useState('')
  const [mode, setMode] = useState<'text' | 'pdf'>('text')
  const [text, setText] = useState('')
  const [pdf, setPdf] = useState<File | null>(null)
  const [busy, setBusy] = useState<'' | 'scan' | 'apply'>('')
  const [error, setError] = useState('')
  const [result, setResult] = useState<ScanResult | null>(null)
  const [rows, setRows] = useState<ReviewRow[]>([])
  const [edits, setEdits] = useState<ScanPatch>({})
  const [checked, setChecked] = useState<Set<ScanKey>>(new Set())
  const [outcome, setOutcome] = useState<ApplyOutcome | null>(null)
  const pdfInput = useRef<HTMLInputElement>(null)

  const scan = async () => {
    setError(''); setOutcome(null)
    if (url.trim() && !normalizeLinkedInUrl(url)) { setError('That is not a LinkedIn profile link. It looks like linkedin.com/in/name.'); return }
    setBusy('scan')
    try {
      let profileText = text
      let nameHint = ''
      if (mode === 'pdf') {
        if (!pdf) throw new Error('Add the LinkedIn PDF first.')
        const read = await readPdfText(pdf)
        profileText = read.text
        nameHint = read.largest
      }
      const next = await runLinkedInScan({ text: profileText, url: url.trim(), nameHint }, demo)
      const review = buildReviewRows(keys, scanValues(next.scan), current, labels)
      setRows(review)
      setEdits({})
      setChecked(defaultChecked(review))
      setResult(next)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The profile could not be read. Try pasting the text instead.')
    } finally { setBusy('') }
  }

  const apply = async () => {
    setBusy('apply'); setError('')
    try {
      const done = await onApply(checkedPatch(rows, checked, edits))
      setOutcome(done)
      if (done.status !== 'failed') { setResult(null); setText(''); setPdf(null) }
    } catch (e) {
      setOutcome({ status: 'failed', message: `Not saved: ${e instanceof Error ? e.message : 'something went wrong.'}` })
    } finally { setBusy('') }
  }

  const toggle = (key: ScanKey) => setChecked(c => { const n = new Set(c); if (n.has(key)) n.delete(key); else n.add(key); return n })
  const found = rows.filter(r => r.incoming).length

  return <section className="li-scan" aria-label={heading}>
    <header className="li-scan-head">
      <div><Eyebrow>SCAN LINKEDIN PROFILE</Eyebrow><h2>{heading}</h2><p>{intro}</p></div>
      {onClose && <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}><X size={15} /></button>}
    </header>
    {demo && <p className="li-scan-demo" role="note">Demo mode: the built-in reader runs in your browser. Nothing is sent or saved to an account.</p>}

    {outcome && <p className={`li-scan-outcome ${outcome.status}`} role="status">
      {outcome.status === 'failed' ? <AlertTriangle size={15} /> : <Check size={15} />} {outcome.message}</p>}

    {!result && <>
      <div className="li-scan-inputs">
        <label className="li-scan-label" htmlFor={`${uid}-url`}><Link2 size={14} /> LinkedIn link <small>(optional, kept as a reference)</small></label>
        <input id={`${uid}-url`} value={url} onChange={e => setUrl(e.target.value)} placeholder="linkedin.com/in/name" inputMode="url" autoComplete="url" />
        <span className="li-scan-label"><FileText size={14} /> Profile</span>
        <div className="li-scan-tabs" role="tablist" aria-label="How to add the profile">
          <button type="button" role="tab" aria-selected={mode === 'text'} onClick={() => setMode('text')}>Paste text</button>
          <button type="button" role="tab" aria-selected={mode === 'pdf'} onClick={() => setMode('pdf')}>LinkedIn PDF</button>
        </div>
        {mode === 'text' ? <>
          <textarea aria-label="Profile text" rows={7} value={text} onChange={e => setText(e.target.value)}
            placeholder="Open the LinkedIn profile, select everything (Ctrl/⌘ + A), copy, and paste it here." />
          <small>Navigation, “People also viewed”, posts and the page footer are removed before reading.</small>
        </> : <>
          <button type="button" className={`li-scan-drop${pdf ? ' has-file' : ''}`} onClick={() => pdfInput.current?.click()}
            onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setPdf(f) }}>
            {pdf ? <><Check size={15} /> {pdf.name}</> : 'Drop the LinkedIn PDF here, or choose it'}
          </button>
          <input ref={pdfInput} type="file" accept="application/pdf" hidden onChange={e => { const f = e.target.files?.[0]; if (f) setPdf(f); e.target.value = '' }} />
          <small>On the LinkedIn profile, click <b>More</b> (or <b>Resources</b>), then <b>Save to PDF</b>. The PDF is read in your browser.</small>
        </>}
        {extraStep}
      </div>
      {error && <p className="li-scan-error" role="alert">{error}</p>}
      <div className="li-scan-actions">
        <Btn disabled={busy === 'scan' || (mode === 'pdf' ? !pdf : text.trim().length < MIN_SCAN_TEXT)} onClick={() => void scan()}>
          {busy === 'scan' ? <><Loader2 size={15} className="li-spin" /> Scanning…</> : <><ScanLine size={15} /> Scan</>}
        </Btn>
        <small>We read only what you add here. LinkedIn is never contacted. Nothing is saved until you apply.</small>
      </div>
    </>}

    {result && <>
      <p className="li-scan-source">{sourceLabel(result.source)}{result.truncated ? ' The text was long, so only the first part was read.' : ''}</p>
      <p className="li-scan-note">{found ? `Found ${fieldCount(found)}. Tick what to apply; you can edit any value first.` : 'No profile details were found in that text. Go back and paste the whole profile page.'}</p>
      <div className="li-scan-review" role="group" aria-label="Review scanned fields">
        <div className="li-scan-row li-scan-cols" aria-hidden="true"><span /><span>Field</span><span>Now</span><span>From LinkedIn</span></div>
        {rows.map(row => {
          const id = `${uid}-${row.key}`
          const value = edits[row.key] ?? row.incoming
          const long = LONG_KEYS.includes(row.key)
          return <div key={row.key} className={`li-scan-row${checked.has(row.key) ? ' on' : ''}${row.incoming ? '' : ' empty'}`} data-field={row.key}>
            <input type="checkbox" id={id} checked={checked.has(row.key)} disabled={!row.incoming} onChange={() => toggle(row.key)} />
            <label htmlFor={id}>{row.label}{LIST_KEYS.includes(row.key) && <small> (comma-separated)</small>}</label>
            <span className="li-scan-now"><span className="li-sr">Now: </span>{row.current || <em>Empty</em>}</span>
            {row.incoming
              ? (long
                ? <textarea aria-label={`${row.label} from LinkedIn`} rows={3} value={value} onChange={e => setEdits(v => ({ ...v, [row.key]: e.target.value }))} />
                : <input aria-label={`${row.label} from LinkedIn`} value={value} onChange={e => setEdits(v => ({ ...v, [row.key]: e.target.value }))} />)
              : <em className="li-scan-none">Not on the profile</em>}
          </div>
        })}
        {extraReview}
      </div>
      {error && <p className="li-scan-error" role="alert">{error}</p>}
      <div className="li-scan-actions">
        <Btn disabled={busy === 'apply' || (!checked.size && !extraReview)} onClick={() => void apply()}>
          {busy === 'apply' ? <><Loader2 size={15} className="li-spin" /> Applying…</> : <><Check size={15} /> {applyLabel}{checked.size ? ` (${fieldCount(checked.size)})` : ''}</>}
        </Btn>
        <Btn kind="quiet" onClick={() => setResult(null)}>Back</Btn>
      </div>
    </>}
  </section>
}
