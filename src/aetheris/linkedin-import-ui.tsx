/**
 * "Fill from LinkedIn": the member pastes their LinkedIn link, adds their profile (LinkedIn's
 * own "Save to PDF" export, or the text of their profile page) and their photo, and we fill
 * their Ask Intros profile from it. They review every field before anything is saved.
 */
import { Check, FileText, ImageUp, Link2, Loader2, Sparkles, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { supabase } from '@/integrations/supabase/client'
import { extractLinkedInProfile, fetchLinkedInPhoto, scanLinkedInProfileUrl, type LinkedInExtraction } from '@/lib/linkedinImport.functions'
import { IMPORT_FIELD_LABELS, isLinkedInPhotoUrl, mergeScanIntoDraft, normalizeLinkedInUrl, type ImportedFields } from './linkedin-import'
import { readPdfText } from './pdf-text'
import { useNetwork } from './store'
import { Btn, Eyebrow } from './ui'

type FieldKey = keyof ImportedFields
const FIELD_ORDER: FieldKey[] = ['name', 'title', 'company', 'location', 'thesis', 'whatIDo', 'building', 'canHelpWith', 'expertise', 'industries']
const LONG: FieldKey[] = ['whatIDo', 'building', 'canHelpWith', 'thesis']

const asText = (v: string | string[]) => (Array.isArray(v) ? v.join(', ') : v)
const asList = (v: string) => v.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean).slice(0, 15)

/** Saves the LinkedIn link on its own, so a missing column never blocks the rest of the profile. */
async function currentUserId() {
  const { data } = await supabase.auth.getSession()
  return data.session?.user.id ?? ''
}

async function saveLinkedInUrl(url: string) {
  const { data } = await supabase.auth.getSession()
  const id = data.session?.user.id
  if (!id) return
  await (supabase.from('profiles') as any).update({ linkedin_url: url }).eq('id', id) // eslint-disable-line @typescript-eslint/no-explicit-any
}

export function LinkedInImportPanel({ onApplied, defaultOpen = false }: { onApplied?: (fields: Partial<ImportedFields>) => void; defaultOpen?: boolean }) {
  const net = useNetwork()
  const [open, setOpen] = useState(defaultOpen)
  const [url, setUrl] = useState('')
  const [mode, setMode] = useState<'pdf' | 'text'>('pdf')
  const [pdf, setPdf] = useState<File | null>(null)
  const [text, setText] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoLink, setPhotoLink] = useState('')
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [busy, setBusy] = useState<'' | 'scan' | 'photo' | 'apply'>('')
  const [error, setError] = useState('')
  const [result, setResult] = useState<LinkedInExtraction | null>(null)
  const [values, setValues] = useState<Record<FieldKey, string>>({} as Record<FieldKey, string>)
  const [chosen, setChosen] = useState<Set<FieldKey>>(new Set())
  const [done, setDone] = useState('')
  const [notice, setNotice] = useState('')
  const [conflicts, setConflicts] = useState<Partial<Record<FieldKey, string>>>({})
  const [edited, setEdited] = useState<Set<FieldKey>>(new Set())
  const scanSeq = useRef(0)
  const scanOwner = useRef('')
  const applying = useRef(false)
  const scanning = useRef(false)
  const pdfInput = useRef<HTMLInputElement>(null)
  const photoInput = useRef<HTMLInputElement>(null)

  useEffect(() => () => { if (photoPreview) URL.revokeObjectURL(photoPreview) }, [photoPreview])

  const choosePhoto = (file: File) => {
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) { setError('Choose a JPG, PNG or WebP photo.'); return }
    if (file.size > 5 * 1024 * 1024) { setError('Profile photos must be 5 MB or smaller.'); return }
    setError('')
    setPhoto(file)
    setPhotoPreview(old => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(file) })
  }

  const loadPhotoLink = async () => {
    if (!isLinkedInPhotoUrl(photoLink)) { setError('Paste the image address of your LinkedIn photo (it starts with https://media.licdn.com/).'); return }
    setBusy('photo'); setError('')
    try {
      const { base64, type } = await fetchLinkedInPhoto({ data: { url: photoLink } })
      const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
      choosePhoto(new File([bytes], `linkedin-photo.${type.split('/')[1] ?? 'jpg'}`, { type }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That photo could not be loaded.')
    } finally { setBusy('') }
  }

  const hasContent = mode === 'pdf' ? !!pdf : text.trim().length >= 40

  const scan = async () => {
    if (scanning.current) return
    scanning.current = true
    const seq = ++scanSeq.current
    setError(''); setDone(''); setNotice('')
    const linkedinUrl = url.trim() ? normalizeLinkedInUrl(url) : null
    if (url.trim() && !linkedinUrl) { setError('That is not a LinkedIn personal profile link. It looks like linkedin.com/in/your-name.'); scanning.current = false; return }
    if (!linkedinUrl && !hasContent) { setError('Paste your LinkedIn link or your profile text, then press Scan.'); scanning.current = false; return }
    setBusy('scan')
    try {
      const owner = await currentUserId()
      if (!owner) throw new Error('Sign in to import your profile.')
      scanOwner.current = owner
      if (!hasContent && linkedinUrl) {
        const urlScan = await scanLinkedInProfileUrl({ data: { url: linkedinUrl } })
        if (seq !== scanSeq.current) return
        if (urlScan.status !== 'ok') { setNotice(urlScan.reason); return }
        // Unreachable until a licensed provider is connected; its profile would then feed the same review draft.
        throw new Error('Scanning from a link is not available yet. Paste your profile text instead.')
      }
      let profileText = text
      let nameHint = ''
      if (mode === 'pdf') {
        const read = await readPdfText(pdf!)
        profileText = read.text
        nameHint = read.largest
      }
      const extraction = await extractLinkedInProfile({ data: { text: profileText, url: linkedinUrl ?? '', nameHint } })
      if (seq !== scanSeq.current) return
      const next = {} as Record<FieldKey, string>
      for (const key of FIELD_ORDER) next[key] = asText(extraction.fields[key])
      const merged = mergeScanIntoDraft(values, edited, next)
      setValues(merged.values)
      setConflicts(merged.conflicts)
      setChosen(new Set(FIELD_ORDER.filter(k => merged.values[k].trim())))
      setResult(extraction)
    } catch (e) {
      if (seq === scanSeq.current) setError(e instanceof Error ? e.message : 'Your profile could not be read. Try pasting the text instead.')
    } finally { scanning.current = false; if (seq === scanSeq.current) setBusy('') }
  }

  const apply = async () => {
    if (!result || applying.current) return
    applying.current = true
    setBusy('apply'); setError('')
    try {
      if ((await currentUserId()) !== scanOwner.current) throw new Error('Your session changed. Scan your profile again before applying.')
      const pick = (k: FieldKey) => (chosen.has(k) ? values[k].trim() : undefined)
      const name = pick('name') || net.profile.name
      if (pick('name') !== undefined || photo) await net.updateIdentity({ name, photo })
      const fields: Parameters<typeof net.updateExecutiveProfile>[0] = {}
      for (const key of ['title', 'company', 'location', 'thesis', 'whatIDo', 'building', 'canHelpWith'] as const) {
        const v = pick(key)
        if (v !== undefined) fields[key] = v
      }
      if (pick('building') !== undefined) fields.focus = pick('building')!
      if (pick('expertise') !== undefined) fields.expertise = asList(values.expertise)
      if (pick('industries') !== undefined) fields.industries = asList(values.industries)
      if (Object.keys(fields).length) await net.updateExecutiveProfile(fields)
      if (result.linkedinUrl) await saveLinkedInUrl(result.linkedinUrl).catch(() => undefined)
      onApplied?.(Object.fromEntries(FIELD_ORDER.filter(k => chosen.has(k)).map(k => [k, k === 'expertise' || k === 'industries' ? asList(values[k]) : values[k].trim()])))
      setDone(`Your profile is filled in from LinkedIn${photo ? ', with your photo' : ''}. Review it below and adjust anything.`)
      setResult(null); setValues({} as Record<FieldKey, string>); setConflicts({}); setEdited(new Set()); setPdf(null); setText(''); setPhoto(null); setPhotoLink('')
      setPhotoPreview(old => { if (old) URL.revokeObjectURL(old); return null })
      setOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Your profile could not be saved.')
    } finally { applying.current = false; setBusy('') }
  }

  if (!open) {
    return <section className="linkedin-import closed">
      <div><Eyebrow>FASTEST WAY TO A COMPLETE PROFILE</Eyebrow><h2>Fill your profile from LinkedIn</h2>
        <p>Paste your LinkedIn profile text or PDF and press Scan. We fill what we can find for you to review; nothing is saved until you approve it.</p>
        {done && <p className="linkedin-import-done"><Check size={14} /> {done}</p>}</div>
      <Btn onClick={() => { setOpen(true); setDone('') }}><Sparkles size={15} /> Fill from LinkedIn</Btn>
    </section>
  }

  return <section className="linkedin-import" aria-label="Fill your profile from LinkedIn">
    <header><div><Eyebrow>FILL FROM LINKEDIN</Eyebrow><h2>Your LinkedIn, in three steps</h2></div>
      <button type="button" className="icon-btn" aria-label="Close" onClick={() => setOpen(false)}><X size={15} /></button></header>

    {!result && <>
      <ol className="linkedin-steps">
        <li>
          <b><Link2 size={14} /> Your LinkedIn link</b>
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder="linkedin.com/in/your-name" inputMode="url" autoComplete="url" />
          <small>Optional. Saved on your profile if you apply. A link alone cannot be scanned yet: LinkedIn data access is not connected, so add your profile text or PDF below.</small>
        </li>
        <li>
          <b><FileText size={14} /> Your profile text or PDF</b>
          <div className="linkedin-mode" role="tablist">
            <button type="button" role="tab" aria-selected={mode === 'pdf'} className={mode === 'pdf' ? 'active' : ''} onClick={() => setMode('pdf')}>LinkedIn PDF</button>
            <button type="button" role="tab" aria-selected={mode === 'text'} className={mode === 'text' ? 'active' : ''} onClick={() => setMode('text')}>Paste text</button>
          </div>
          {mode === 'pdf' ? <>
            <button type="button" className={`linkedin-drop${pdf ? ' has-file' : ''}`} onClick={() => pdfInput.current?.click()}
              onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setPdf(f) }}>
              {pdf ? <><Check size={15} /> {pdf.name}</> : 'Drop your LinkedIn PDF here, or choose it'}
            </button>
            <input ref={pdfInput} type="file" accept="application/pdf" hidden onChange={e => { const f = e.target.files?.[0]; if (f) setPdf(f); e.target.value = '' }} />
            <small>On your LinkedIn profile, click <b>Resources</b> (or <b>More</b>), then <b>Save to PDF</b>.</small>
          </> : <>
            <textarea rows={6} value={text} onChange={e => setText(e.target.value)} placeholder="Open your LinkedIn profile, select everything (Ctrl/⌘ + A), copy, and paste it here." />
            <small>Include your About, Experience and Skills sections.</small>
          </>}
        </li>
        <li>
          <b><ImageUp size={14} /> Your photo</b>
          <div className="linkedin-photo">
            {photoPreview ? <img src={photoPreview} alt="Your new profile photo" /> : <span aria-hidden="true">{net.profile.initials || 'ME'}</span>}
            <div>
              <Btn kind="secondary" onClick={() => photoInput.current?.click()}>Upload photo</Btn>
              <input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e => { const f = e.target.files?.[0]; if (f) choosePhoto(f); e.target.value = '' }} />
              <div className="linkedin-photo-link">
                <input value={photoLink} onChange={e => setPhotoLink(e.target.value)} placeholder="Or paste the photo's image address" aria-label="LinkedIn photo image address" />
                <Btn kind="quiet" disabled={!photoLink.trim() || busy === 'photo'} onClick={() => void loadPhotoLink()}>{busy === 'photo' ? <Loader2 size={14} className="spin" /> : 'Use'}</Btn>
              </div>
              <small>On LinkedIn, open your photo, right-click it and choose <b>Copy image address</b>.</small>
            </div>
          </div>
        </li>
      </ol>
      {notice && <p className="linkedin-review-note" role="status">{notice}</p>}
      {error && <p className="linkedin-error" role="alert">{error}</p>}
      <div className="linkedin-actions">
        <Btn disabled={busy === 'scan' || (!hasContent && !url.trim())} onClick={() => void scan()}>
          {busy === 'scan' ? <><Loader2 size={15} className="spin" aria-hidden="true" /> Reading your profile…</> : <><Sparkles size={15} /> Scan</>}
        </Btn>
        <small>We read only what you add here. Nothing is saved until you approve it.</small>
      </div>
    </>}

    {result && <>
      <p className="linkedin-review-note" role="status">
        {result.source === 'ai' ? 'Here is what we found.' : 'Here is what we could read.'} Untick anything you don’t want, edit any field, then apply.
        {FIELD_ORDER.some(k => !values[k]?.trim()) && ' Some fields were not found and are left blank for you to fill in.'}
        {result.profile.experience.length > 0 && ` ${result.profile.experience.length} role${result.profile.experience.length === 1 ? '' : 's'} and ${result.profile.skills.length} skill${result.profile.skills.length === 1 ? '' : 's'} found.`}
      </p>
      <div className="linkedin-review">
        {photoPreview && <div className="linkedin-review-photo"><img src={photoPreview} alt="Your new profile photo" /><small>New photo</small></div>}
        {FIELD_ORDER.map(key => <label key={key} className={`linkedin-field${chosen.has(key) ? '' : ' off'}${LONG.includes(key) ? ' wide' : ''}`}>
          <span><input type="checkbox" checked={chosen.has(key)} onChange={() => setChosen(c => { const n = new Set(c); if (n.has(key)) n.delete(key); else n.add(key); return n })} />
            {IMPORT_FIELD_LABELS[key]}</span>
          {LONG.includes(key)
            ? <textarea rows={3} value={values[key]} onChange={e => { setEdited(ed => new Set(ed).add(key)); setValues(v => ({ ...v, [key]: e.target.value })) }} />
            : <input value={values[key]} onChange={e => { setEdited(ed => new Set(ed).add(key)); setValues(v => ({ ...v, [key]: e.target.value })) }} placeholder={key === 'industries' ? 'Not on your LinkedIn: add yours' : 'Not found'} />}
          {result.provenance[key] && <small>Read by {result.provenance[key] === 'ai' ? 'AI from your text' : 'the built-in reader'}</small>}
          {conflicts[key] !== undefined && <small>Newer scan: “{conflicts[key]}” <button type="button" className="linkedin-use" onClick={() => { setValues(v => ({ ...v, [key]: conflicts[key]! })); setConflicts(c => { const n = { ...c }; delete n[key]; return n }) }}>Use scanned value</button></small>}
        </label>)}
        {result.linkedinUrl && <p className="linkedin-field wide"><span><Link2 size={13} /> LinkedIn link</span><a href={result.linkedinUrl} target="_blank" rel="noopener noreferrer">{result.linkedinUrl}</a></p>}
      </div>
      {error && <p className="linkedin-error" role="alert">{error}</p>}
      <div className="linkedin-actions">
        <Btn disabled={busy === 'apply' || (!chosen.size && !photo)} onClick={() => void apply()}>
          {busy === 'apply' ? <><Loader2 size={15} className="spin" /> Saving…</> : <><Check size={15} /> Apply to my profile</>}
        </Btn>
        <Btn kind="quiet" onClick={() => setResult(null)}>Back</Btn>
      </div>
    </>}
  </section>
}
