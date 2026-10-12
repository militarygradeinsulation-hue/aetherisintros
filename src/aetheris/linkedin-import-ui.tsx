/**
 * My profile → "Scan LinkedIn profile": the member pastes their profile (or adds LinkedIn's
 * "Save to PDF" export) and, optionally, a photo. They review every field next to their current
 * value, tick what to apply, and only then is anything written to their profile.
 */
import { ExternalLink, ImageUp, Link2, Loader2, ScanLine, Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { fetchLinkedInPhoto } from '@/lib/linkedinImport.functions'
import { findPublicInformation } from '@/lib/publicInfo.functions'
import { isLinkedInPhotoUrl } from './linkedin-import'
import { applyOidcConsent, LINKEDIN_OIDC_PROVIDER, LINKEDIN_OIDC_SCOPES, oidcSuggestionFromIdentities, type OidcConsent, type OidcSuggestion } from './linkedin-oidc'
import type { PublicSuggestion } from './public-info'
import { PROFILE_KEYS, SCAN_LABELS, splitList, type ScanKey } from './linkedin-scan'
import { LinkedInScanPanel, saveProfileScan, type ApplyOutcome, type ScanPatch } from './linkedin-scan-ui'
import { isShowcase } from './showcase'
import { useNetwork } from './store'
import { Btn, Eyebrow } from './ui'

const PROFILE_LABELS: ScanPatch = { about: 'About (what I do)', headline: 'Headline' }

export function LinkedInImportPanel({ onApplied, defaultOpen = false }: { onApplied?: (fields: ScanPatch) => void; defaultOpen?: boolean }) {
  const net = useNetwork()
  const demo = isShowcase()
  const [open, setOpen] = useState(defaultOpen)
  const [done, setDone] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoLink, setPhotoLink] = useState('')
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const [oidc, setOidc] = useState<OidcSuggestion | null>(null)
  const [oidcConsent, setOidcConsent] = useState<OidcConsent>({})
  const [enrichBusy, setEnrichBusy] = useState<'' | 'oidc' | 'public'>('')
  const [enrichNotice, setEnrichNotice] = useState('')
  const [publicConfirm, setPublicConfirm] = useState(false)
  const [publicResults, setPublicResults] = useState<PublicSuggestion[]>([])
  const [publicPicked, setPublicPicked] = useState<Set<number>>(new Set())
  const photoInput = useRef<HTMLInputElement>(null)

  useEffect(() => () => { if (photoPreview) URL.revokeObjectURL(photoPreview) }, [photoPreview])
  useEffect(() => {
    if (!open || demo) { setOidc(null); return }
    let live = true
    void supabase.auth.getSession().then(({ data }) => {
      if (live) setOidc(oidcSuggestionFromIdentities(data.session?.user.identities))
    })
    return () => { live = false }
  }, [open, demo])

  const p = net.profile
  const current: ScanPatch = {
    name: p.name, title: p.title, company: p.company, location: p.location, headline: p.thesis, about: p.whatIDo ?? '',
    industries: p.industries.join(', '), expertise: p.expertise.join(', '), can_help_with: p.canHelpWith, looking_for: p.lookingFor,
  }

  const choosePhoto = (file: File) => {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { setPhotoError('Choose a JPG, PNG or WebP photo.'); return }
    if (file.size > 5 * 1024 * 1024) { setPhotoError('Profile photos must be 5 MB or smaller.'); return }
    setPhotoError('')
    setPhoto(file)
    setPhotoPreview(old => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(file) })
  }

  const loadPhotoLink = async () => {
    if (!isLinkedInPhotoUrl(photoLink)) { setPhotoError('Paste the image address of your LinkedIn photo (it starts with https://media.licdn.com/).'); return }
    setPhotoBusy(true); setPhotoError('')
    try {
      const { base64, type } = await fetchLinkedInPhoto({ data: { url: photoLink } })
      const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
      choosePhoto(new File([bytes], `linkedin-photo.${type.split('/')[1] ?? 'jpg'}`, { type }))
    } catch (e) {
      setPhotoError(e instanceof Error ? e.message : 'That photo could not be loaded.')
    } finally { setPhotoBusy(false) }
  }

  const connectLinkedIn = async () => {
    setEnrichNotice('')
    const { error } = await supabase.auth.linkIdentity({
      provider: LINKEDIN_OIDC_PROVIDER,
      options: { scopes: LINKEDIN_OIDC_SCOPES, redirectTo: window.location.href },
    })
    if (error) setEnrichNotice('LinkedIn could not be connected. Try again later.')
  }

  const applyOidc = async () => {
    if (!oidc) return
    const picked = applyOidcConsent(oidc, oidcConsent)
    if (!Object.keys(picked).length) { setEnrichNotice('Choose at least one LinkedIn item first.'); return }
    setEnrichBusy('oidc'); setEnrichNotice('')
    try {
      const patch: ScanPatch = {}
      if (picked.name) patch.name = picked.name
      if (patch.name) {
        const saved = await saveProfileScan(patch)
        if (saved.status === 'failed') throw new Error(saved.message)
      }
      if (picked.email) {
        const { data } = await supabase.auth.getSession()
        const id = data.session?.user.id
        if (!id) throw new Error('You are signed out. Sign in again.')
        const { data: rows, error } = await (supabase.from('profiles') as any).update({ email: picked.email }).eq('id', id).select('id')
        if (error || !rows?.length) throw new Error(error?.message || 'Your verified email could not be saved.')
      }
      if (picked.photoUrl) {
        const { base64, type } = await fetchLinkedInPhoto({ data: { url: picked.photoUrl } })
        const bytes = Uint8Array.from(atob(base64), ch => ch.charCodeAt(0))
        const file = new File([bytes], `linkedin-oidc-photo.${type.split('/')[1] ?? 'jpg'}`, { type })
        await net.updateIdentity({ name: picked.name || p.name, photo: file })
      } else if (picked.name) {
        await net.updateIdentity({ name: picked.name })
      }
      if (patch.name) { await showLocally(patch); onApplied?.(patch) }
      setEnrichNotice(`Applied the LinkedIn items you approved: ${Object.keys(picked).join(', ')}.`)
      setOidcConsent({})
    } catch (error) {
      setEnrichNotice(error instanceof Error ? error.message : 'Those LinkedIn details could not be applied.')
    } finally { setEnrichBusy('') }
  }

  const findMine = async () => {
    if (!publicConfirm) { setEnrichNotice('Confirm that you want to search the public web for your own profile first.'); return }
    setEnrichBusy('public'); setEnrichNotice(''); setPublicResults([]); setPublicPicked(new Set())
    try {
      const result = await findPublicInformation({ data: { confirmed: true } })
      if (result.status !== 'ok') { setEnrichNotice(result.reason); return }
      setPublicResults(result.suggestions)
      setPublicPicked(new Set())
      setEnrichNotice(`Found ${result.suggestions.length} source-grounded suggestion${result.suggestions.length === 1 ? '' : 's'}. Review each one before applying.`)
    } catch (error) {
      setEnrichNotice(error instanceof Error ? error.message : 'The public-information search could not be completed.')
    } finally { setEnrichBusy('') }
  }

  const applyPublic = async () => {
    const selected = publicResults.filter((_item, index) => publicPicked.has(index))
    if (!selected.length) { setEnrichNotice('Choose at least one public-source suggestion first.'); return }
    const patch: ScanPatch = {}
    for (const item of selected) {
      if (item.field === 'title') patch.title = item.value
      else if (item.field === 'company') patch.company = item.value
      else if (item.field === 'location') patch.location = item.value
      else if (item.field === 'thesis') patch.headline = item.value
      else if (item.field === 'whatIDo') patch.about = item.value
    }
    if (!Object.keys(patch).length) { setEnrichNotice('The selected item is review-only because there is not a matching profile field yet.'); return }
    setEnrichBusy('public'); setEnrichNotice('')
    try {
      const saved = await saveProfileScan(patch)
      if (saved.status === 'failed') throw new Error(saved.message)
      await showLocally(patch)
      onApplied?.(patch)
      setEnrichNotice(`Saved ${Object.keys(patch).length} reviewed public-source field${Object.keys(patch).length === 1 ? '' : 's'} to your profile.`)
      setPublicPicked(new Set())
    } catch (error) {
      setEnrichNotice(error instanceof Error ? error.message : 'Those public-source suggestions could not be saved.')
    } finally { setEnrichBusy('') }
  }

  /** Mirror the applied fields into the open page so it shows them at once. */
  const showLocally = async (patch: ScanPatch) => {
    const fields: Parameters<typeof net.updateExecutiveProfile>[0] = {}
    if (patch.title) fields.title = patch.title
    if (patch.company) fields.company = patch.company
    if (patch.location) fields.location = patch.location
    if (patch.headline) fields.thesis = patch.headline
    if (patch.about) fields.whatIDo = patch.about
    if (patch.industries) fields.industries = splitList(patch.industries)
    if (patch.expertise) fields.expertise = splitList(patch.expertise)
    if (patch.can_help_with) fields.canHelpWith = patch.can_help_with
    if (patch.looking_for) fields.lookingFor = patch.looking_for
    if (Object.keys(fields).length) await net.updateExecutiveProfile(fields)
  }

  const apply = async (patch: ScanPatch): Promise<ApplyOutcome> => {
    const names = (Object.keys(patch) as ScanKey[]).map(k => (PROFILE_LABELS[k] ?? SCAN_LABELS[k]).toLowerCase())
    if (photo) names.push('photo')
    const list = names.join(', ')
    if (demo) {
      if (patch.name || photo) await net.updateIdentity({ name: patch.name || p.name || 'Demo member', photo })
      await showLocally(patch)
      onApplied?.(patch)
      return { status: 'filled', message: `Applied to this demo profile in your browser only (${list}). Nothing was saved to an account.` }
    }
    const fields = { ...patch }
    if (Object.keys(fields).length) {
      const saved = await saveProfileScan(fields)
      if (saved.status === 'failed') return saved
    }
    if (photo) {
      try { await net.updateIdentity({ name: patch.name || p.name, photo }) } catch (e) {
        const why = e instanceof Error ? e.message : 'it could not be uploaded'
        return Object.keys(fields).length
          ? { status: 'saved', message: `Saved to your profile: ${list.replace(/, photo$/, '')}. Your photo was not saved: ${why}` }
          : { status: 'failed', message: `Not saved: ${why}` }
      }
    } else if (patch.name) await net.updateIdentity({ name: patch.name })
    await showLocally(patch)
    onApplied?.(patch)
    setPhoto(null); setPhotoLink('')
    setPhotoPreview(old => { if (old) URL.revokeObjectURL(old); return null })
    setDone(`Saved to your profile: ${list}.`)
    return { status: 'saved', message: `Saved to your profile: ${list}.` }
  }

  if (!open) {
    return <section className="li-scan li-scan-closed">
      <div><Eyebrow>FASTEST WAY TO A COMPLETE PROFILE</Eyebrow><h2>Scan your LinkedIn profile</h2>
        <p>Paste your LinkedIn profile or add its PDF. You review every field before anything is saved.</p>
        {done && <p className="li-scan-outcome saved" role="status">{done}</p>}</div>
      <Btn onClick={() => { setOpen(true); setDone('') }}><ScanLine size={15} /> Scan LinkedIn profile</Btn>
    </section>
  }

  return <LinkedInScanPanel
    keys={PROFILE_KEYS} current={current} labels={PROFILE_LABELS} demo={demo}
    heading="Fill your profile from LinkedIn"
    intro="Your public profile fields are shown to verified members. Your LinkedIn link is shown on your profile."
    applyLabel={demo ? 'Apply to demo profile' : 'Apply to my profile'}
    onApply={apply} onClose={() => setOpen(false)}
    extraStep={<>
      <div className="li-scan-photo">
        <span className="li-scan-label"><ImageUp size={14} /> Photo <small>(optional)</small></span>
        <div>
          {photoPreview ? <img src={photoPreview} alt="Your new profile photo" /> : <span aria-hidden="true">{p.initials || 'ME'}</span>}
          <Btn kind="secondary" onClick={() => photoInput.current?.click()}>Upload photo</Btn>
          <input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e => { const f = e.target.files?.[0]; if (f) choosePhoto(f); e.target.value = '' }} />
        </div>
        {!demo && <div className="li-scan-photo-link">
          <input value={photoLink} onChange={e => setPhotoLink(e.target.value)} placeholder="Or paste your LinkedIn photo's image address" aria-label="LinkedIn photo image address" />
          <Btn kind="quiet" disabled={!photoLink.trim() || photoBusy} onClick={() => void loadPhotoLink()}>{photoBusy ? <Loader2 size={14} className="li-spin" /> : 'Use'}</Btn>
        </div>}
        {photoError && <p className="li-scan-error" role="alert">{photoError}</p>}
      </div>

      {!demo && <div className="li-enrich">
        <div className="li-enrich-head"><span className="li-scan-label"><Link2 size={14} /> LinkedIn identity</span>
          {!oidc && <Btn kind="quiet" onClick={() => void connectLinkedIn()}>Connect LinkedIn</Btn>}</div>
        {oidc ? <div className="li-enrich-options" role="group" aria-label="LinkedIn identity suggestions">
          {oidc.name && <label><input type="checkbox" checked={oidcConsent.name === true} onChange={() => setOidcConsent(v => ({ ...v, name: !v.name }))} /> <span><b>Name</b><small>{oidc.name}</small></span></label>}
          {oidc.email && <label><input type="checkbox" checked={oidcConsent.email === true} onChange={() => setOidcConsent(v => ({ ...v, email: !v.email }))} /> <span><b>Verified email</b><small>{oidc.email}</small></span></label>}
          {oidc.photoUrl && <label><input type="checkbox" checked={oidcConsent.photoUrl === true} onChange={() => setOidcConsent(v => ({ ...v, photoUrl: !v.photoUrl }))} /> <span><b>LinkedIn photo</b><small>Use the verified OIDC image returned by LinkedIn</small></span></label>}
          <Btn kind="secondary" disabled={enrichBusy === 'oidc'} onClick={() => void applyOidc()}>{enrichBusy === 'oidc' ? <><Loader2 size={14} className="li-spin" /> Applying…</> : 'Apply selected LinkedIn items'}</Btn>
        </div> : <small>Optional. Connecting LinkedIn only offers the OIDC name, verified email and photo for review. Nothing is applied automatically.</small>}

        <div className="li-enrich-public">
          <span className="li-scan-label"><Search size={14} /> Find public information</span>
          <label className="li-enrich-confirm"><input type="checkbox" checked={publicConfirm} onChange={e => setPublicConfirm(e.target.checked)} /> Search the public web for my own saved name and headline.</label>
          <Btn kind="quiet" disabled={!publicConfirm || enrichBusy === 'public'} onClick={() => void findMine()}>{enrichBusy === 'public' ? <><Loader2 size={14} className="li-spin" /> Searching…</> : 'Find my public information'}</Btn>
          {publicResults.length > 0 && <div className="li-enrich-results" role="group" aria-label="Public information suggestions">
            {publicResults.map((item, index) => {
              const supported = item.field !== 'building'
              return <label key={`${item.field}-${index}`} className={supported ? '' : 'disabled'}>
                <input type="checkbox" disabled={!supported} checked={publicPicked.has(index)} onChange={() => setPublicPicked(old => { const next = new Set(old); if (next.has(index)) next.delete(index); else next.add(index); return next })} />
                <span><b>{item.field === 'whatIDo' ? 'About' : item.field === 'thesis' ? 'Headline' : item.field}</b><strong>{item.value}</strong><small>“{item.quote}”</small><a href={item.sourceUrl} target="_blank" rel="noopener noreferrer nofollow">{item.sourceTitle || item.sourceUrl} <ExternalLink size={11} /></a>{!supported && <em>Review only — there is not a matching profile field yet.</em>}</span>
              </label>
            })}
            <Btn kind="secondary" disabled={enrichBusy === 'public' || !publicPicked.size} onClick={() => void applyPublic()}>Apply selected public fields</Btn>
          </div>}
        </div>
        {enrichNotice && <p className="li-scan-outcome" role="status">{enrichNotice}</p>}
      </div>}
    </>}
    extraReview={photoPreview ? <div className="li-scan-row on"><span /><span>Photo</span><span className="li-scan-now">Current photo</span>
      <img className="li-scan-photo-new" src={photoPreview} alt="New profile photo" /></div> : undefined}
  />
}
