/**
 * "Fill from LinkedIn": the member pastes their LinkedIn link, adds their profile (LinkedIn's
 * own "Save to PDF" export, or the text of their profile page) and their photo, and we fill
 * their Ask Intros profile from it. They review every field before anything is saved.
 */
import { Check, FileText, ImageUp, Link2, Loader2, Search, Sparkles, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { supabase } from '@/integrations/supabase/client'
import { extractLinkedInProfile, fetchLinkedInPhoto, scanLinkedInProfileUrl } from '@/lib/linkedinImport.functions'
import { findPublicInformation } from '@/lib/publicInfo.functions'
import { describeLinkHandling, emptyExtraction, extractionFromProfile, IMPORT_FIELD_LABELS, isLinkedInPhotoUrl, mergeScanIntoDraft, normalizeLinkedInUrl, type ImportedFields, type LinkedInExtraction } from './linkedin-import'
import { applyOidcConsent, LINKEDIN_OIDC_PROVIDER, LINKEDIN_OIDC_SCOPES, oidcSuggestionFromIdentities, type OidcConsent, type OidcSuggestion } from './linkedin-oidc'
import { isCurrentResult, mergeSuggestionsIntoDraft, type PublicSuggestion } from './public-info'
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

async function saveVerifiedEmail(email: string) {
  const id = await currentUserId()
  if (!id) return
  await (supabase.from('profiles') as any).update({ email }).eq('id', id) // eslint-disable-line @typescript-eslint/no-explicit-any
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
  const [busy, setBusy] = useState<'' | 'scan' | 'photo' | 'apply' | 'public' | 'oidc'>('')
  const [error, setError] = useState('')
  const [result, setResult] = useState<LinkedInExtraction | null>(null)
  const [values, setValues] = useState<Record<FieldKey, string>>({} as Record<FieldKey, string>)
  const [chosen, setChosen] = useState<Set<FieldKey>>(new Set())
  const [done, setDone] = useState('')
  const [notice, setNotice] = useState('')
  const [conflicts, setConflicts] = useState<Partial<Record<FieldKey, string>>>({})
  const [edited, setEdited] = useState<Set<FieldKey>>(new Set())
  const [oidc, setOidc] = useState<OidcSuggestion | null>(null)
  const [oidcConsent, setOidcConsent] = useState<OidcConsent>({})
  const [emailChoice, setEmailChoice] = useState('')
  const [sources, setSources] = useState<Partial<Record<FieldKey, { url: string; title: string }>>>({})
  const [publicConfirm, setPublicConfirm] = useState(false)
  const [publicResults, setPublicResults] = useState<PublicSuggestion[]>([])
  const [publicPicked, setPublicPicked] = useState<Set<FieldKey>>(new Set())
  const [publicNote, setPublicNote] = useState('')
  const publicSeq = useRef(0)
  const scanSeq = useRef(0)
  const scanOwner = useRef('')
  const applying = useRef(false)
  const scanning = useRef(false)
  const pdfInput = useRef<HTMLInputElement>(null)
  const photoInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    void supabase.auth.getSession().then(({ data }) => setOidc(oidcSuggestionFromIdentities(data.session?.user.identities)))
  }, [open])

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

  const link = describeLinkHandling(url)
  const hasContent = mode === 'pdf' ? !!pdf : text.trim().length >= 40

  /** Puts a scanned profile in the review draft, keeping anything the member already edited. */
  const showDraft = (extraction: LinkedInExtraction) => {
    const next = {} as Record<FieldKey, string>
    for (const key of FIELD_ORDER) next[key] = asText(extraction.fields[key])
    const merged = mergeScanIntoDraft(values, edited, next)
    setValues(merged.values)
    setConflicts(merged.conflicts)
    setChosen(new Set(FIELD_ORDER.filter(k => merged.values[k].trim())))
    setSources(old => Object.fromEntries(Object.entries(old).filter(([k]) => values[k as FieldKey] === merged.values[k as FieldKey])))
    setResult(extraction)
  }

  const ensureDraft = () => {
    if (result) return
    setValues(Object.fromEntries(FIELD_ORDER.map(k => [k, ''])) as Record<FieldKey, string>)
    setResult(emptyExtraction())
  }

  const toggleConsent = (key: keyof OidcSuggestion) => setOidcConsent(c => ({ ...c, [key]: !c[key] }))

  const connectLinkedIn = async () => {
    setError('')
    const { error: linkError } = await supabase.auth.linkIdentity({ provider: LINKEDIN_OIDC_PROVIDER, options: { scopes: LINKEDIN_OIDC_SCOPES, redirectTo: window.location.href } })
    if (linkError) setError('LinkedIn sign-in could not start. Try again later.')
  }

  const addOidc = async () => {
    if (!oidc) return
    const picked = applyOidcConsent(oidc, oidcConsent)
    if (!Object.keys(picked).length) return
    setBusy('oidc'); setError('')
    try {
      ensureDraft()
      if (picked.name) {
        const merged = mergeSuggestionsIntoDraft(values, edited, [{ field: 'name', value: picked.name }])
        setValues(v => ({ ...v, ...merged.values })); setConflicts(c => ({ ...c, ...merged.conflicts }))
        if (merged.values.name !== undefined) setChosen(c => new Set(c).add('name'))
      }
      if (picked.email) setEmailChoice(picked.email)
      if (picked.photoUrl) {
        try {
          const { base64, type } = await fetchLinkedInPhoto({ data: { url: picked.photoUrl } })
          const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
          choosePhoto(new File([bytes], `linkedin-photo.${type.split('/')[1] ?? 'jpg'}`, { type }))
        } catch { setError('Your LinkedIn photo could not be loaded. You can upload one instead.') }
      }
      setOidcConsent({})
    } finally { setBusy('') }
  }

  const findPublic = async () => {
    if (!publicConfirm || busy === 'public') return
    const seq = ++publicSeq.current
    setBusy('public'); setError(''); setPublicNote(''); setPublicResults([]); setPublicPicked(new Set())
    try {
      const owner = await currentUserId()
      if (!owner) throw new Error('Sign in to search for your own public information.')
      const res = await findPublicInformation({ data: { confirmed: true } })
      if (!isCurrentResult(seq, publicSeq.current, owner, await currentUserId())) return
      if (res.status !== 'ok') { setPublicNote(res.reason); return }
      setPublicResults(res.suggestions)
    } catch (e) {
      if (seq === publicSeq.current) setError(e instanceof Error ? e.message : 'The public search could not be completed.')
    } finally { if (seq === publicSeq.current) setBusy('') }
  }

  const addPublic = () => {
    const picked = publicResults.filter(s => publicPicked.has(s.field))
    if (!picked.length) return
    ensureDraft()
    const merged = mergeSuggestionsIntoDraft(values, edited, picked)
    setValues(v => ({ ...v, ...merged.values })); setConflicts(c => ({ ...c, ...merged.conflicts }))
    setChosen(c => { const n = new Set(c); for (const k of Object.keys(merged.values) as FieldKey[]) n.add(k); return n })
    setSources(old => ({ ...old, ...Object.fromEntries(picked.filter(p => merged.values[p.field] !== undefined).map(p => [p.field, { url: p.sourceUrl, title: p.sourceTitle }])) }))
    setPublicResults([]); setPublicPicked(new Set()); setPublicConfirm(false)
  }

  const scan = async () => {
    if (scanning.current) return
    scanning.current = true
    const seq = ++scanSeq.current
    setError(''); setDone(''); setNotice('')
    const linkedinUrl = url.trim() ? normalizeLinkedInUrl(url) : null
    if (link.kind === 'invalid') { setError(link.message); scanning.current = false; return }
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
        showDraft(extractionFromProfile(urlScan.profile, linkedinUrl))
        return
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
      showDraft(extraction)
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
      if (emailChoice) await saveVerifiedEmail(emailChoice).catch(() => undefined)
      if (result.linkedinUrl) await saveLinkedInUrl(result.linkedinUrl).catch(() => undefined)
      onApplied?.(Object.fromEntries(FIELD_ORDER.filter(k => chosen.has(k)).map(k => [k, k === 'expertise' || k === 'industries' ? asList(values[k]) : values[k].trim()])))
      setDone(`Your profile is filled in from LinkedIn${photo ? ', with your photo' : ''}. Review it below and adjust anything.`)
      setResult(null); setValues({} as Record<FieldKey, string>); setConflicts({}); setEdited(new Set()); setPdf(null); setText(''); setPhoto(null); setPhotoLink('')
      setEmailChoice(''); setSources({}); setPublicResults([]); setPublicNote(''); publicSeq.current++
      setPhotoPreview(old => { if (old) URL.revokeObjectURL(old); return null })
      setOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Your profile could not be saved.')
    } finally { applying.current = false; setBusy('') }
  }

  const extras = <div className="linkedin-extras">
    <div className="linkedin-review-note">
      <b>Sign in with LinkedIn</b>
      {oidc ? <>
        <p>LinkedIn shared only your name, photo and verified email (scopes: openid, profile, email). Nothing is filled in unless you tick it and add it to your review draft.</p>
        {([['name', 'Name', oidc.name], ['photoUrl', 'Photo', oidc.photoUrl ? 'Your LinkedIn photo' : ''], ['email', 'Verified email', oidc.email]] as const).filter(([, , v]) => v).map(([key, label, v]) =>
          <label key={key}><input type="checkbox" checked={!!oidcConsent[key]} onChange={() => toggleConsent(key)} /> Use my {label}: {v}</label>)}
        <Btn kind="secondary" disabled={busy === 'oidc' || !Object.values(oidcConsent).some(Boolean)} onClick={() => void addOidc()}>Add to review draft</Btn>
      </> : <>
        <p>Connect LinkedIn to offer your verified name, photo and email for your review. We request only openid, profile and email, and fill nothing until you agree.</p>
        <Btn kind="secondary" onClick={() => void connectLinkedIn()}>Connect LinkedIn</Btn>
      </>}
    </div>
    <div className="linkedin-review-note">
      <b><Search size={14} /> Find public information</b>
      <p>Searches the public web for your own name and headline from your saved profile, nothing else, never LinkedIn. Only pages that clearly describe you are used, and each suggestion shows its source and quote. Suggestions go to your review draft; nothing is saved until you apply.</p>
      <label><input type="checkbox" checked={publicConfirm} onChange={e => setPublicConfirm(e.target.checked)} /> Yes, search for my own name and headline</label>
      <Btn kind="secondary" disabled={!publicConfirm || busy === 'public'} onClick={() => void findPublic()}>
        {busy === 'public' ? <><Loader2 size={14} className="spin" aria-hidden="true" /> Searching…</> : 'Find public information'}
      </Btn>
      {publicNote && <p role="status">{publicNote}</p>}
      {publicResults.length > 0 && <>
        <ul>{publicResults.map(sug => <li key={sug.field}>
          <label><input type="checkbox" checked={publicPicked.has(sug.field)} onChange={() => setPublicPicked(p => { const n = new Set(p); if (n.has(sug.field)) n.delete(sug.field); else n.add(sug.field); return n })} /> {IMPORT_FIELD_LABELS[sug.field]}: <b>{sug.value}</b></label>
          <small>“{sug.quote}” <a href={sug.sourceUrl} target="_blank" rel="noopener noreferrer nofollow">{sug.sourceTitle || sug.sourceUrl}</a></small>
        </li>)}</ul>
        <Btn kind="secondary" disabled={!publicPicked.size} onClick={addPublic}>Add selected to review draft</Btn>
      </>}
    </div>
  </div>

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
      <button type="button" className="icon-btn" aria-label="Close" onClick={() => { publicSeq.current++; setBusy(b => (b === 'public' ? '' : b)); setOpen(false) }}><X size={15} /></button></header>

    {extras}

    {!result && <>
      <ol className="linkedin-steps">
        <li>
          <b><Link2 size={14} /> Your LinkedIn link</b>
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder="linkedin.com/in/your-name" inputMode="url" autoComplete="url" />
          {link.kind === 'needs-document' && <div className="linkedin-review-note" role="status">
            <p>{link.message}</p>
            <div className="linkedin-actions">
              <Btn kind="secondary" onClick={() => { setMode('pdf'); pdfInput.current?.click() }}><FileText size={14} /> Upload PDF</Btn>
              <Btn kind="quiet" onClick={() => setMode('text')}>Paste text</Btn>
            </div>
          </div>}
          {link.kind === 'invalid' && <small role="status">{link.message}</small>}
          {link.kind === 'none' && <small>Optional. Saved on your profile if you apply. We can’t read a profile from a link alone, so add your profile text or PDF below.</small>}
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
          {sources[key]
            ? <small>From a public source: <a href={sources[key]!.url} target="_blank" rel="noopener noreferrer nofollow">{sources[key]!.title || sources[key]!.url}</a></small>
            : result.provenance[key] && <small>Read by {result.provenance[key] === 'ai' ? 'AI from your text' : 'the built-in reader'}</small>}
          {conflicts[key] !== undefined && <small>Newer scan: “{conflicts[key]}” <button type="button" className="linkedin-use" onClick={() => { setValues(v => ({ ...v, [key]: conflicts[key]! })); setConflicts(c => { const n = { ...c }; delete n[key]; return n }) }}>Use scanned value</button></small>}
        </label>)}
        {result.linkedinUrl && <p className="linkedin-field wide"><span><Link2 size={13} /> LinkedIn link</span><a href={result.linkedinUrl} target="_blank" rel="noopener noreferrer">{result.linkedinUrl}</a></p>}
      </div>
      {error && <p className="linkedin-error" role="alert">{error}</p>}
      <div className="linkedin-actions">
        <Btn disabled={busy === 'apply' || (!chosen.size && !photo && !emailChoice)} onClick={() => void apply()}>
          {busy === 'apply' ? <><Loader2 size={15} className="spin" /> Saving…</> : <><Check size={15} /> Apply to my profile</>}
        </Btn>
        <Btn kind="quiet" onClick={() => setResult(null)}>Back</Btn>
      </div>
    </>}
  </section>
}
