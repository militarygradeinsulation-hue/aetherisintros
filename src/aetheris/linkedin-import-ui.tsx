/**
 * My profile → "Scan LinkedIn profile": the member pastes their profile (or adds LinkedIn's
 * "Save to PDF" export) and, optionally, a photo. They review every field next to their current
 * value, tick what to apply, and only then is anything written to their profile.
 */
import { ImageUp, Loader2, ScanLine } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { fetchLinkedInPhoto } from '@/lib/linkedinImport.functions'
import { supabase } from '@/integrations/supabase/client'
import { findPublicInformation } from '@/lib/publicInfo.functions'
import { isLinkedInPhotoUrl } from './linkedin-import'
import type { PublicSuggestion } from './public-info'
import { reviewedPublicProfilePatch } from './public-info-review'
import { startLinkedInAuthentication } from './linkedin-auth'
import { LinkedInIdentityReview } from './LinkedInIdentityReview'
import { loadPublicReviewContext, savePublicReview, type PublicReviewContext } from './public-profile-review-save'
import './public-info-review.css'
import type { ProfileScanContext } from './profile-scan-save'
import { saveReviewedProfileScan } from './profile-scan-save'
import { uploadProfileAvatar } from './live'
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
  const photoInput = useRef<HTMLInputElement>(null)
  const [publicConfirmed, setPublicConfirmed] = useState(false)
  const [publicBusy, setPublicBusy] = useState(false)
  const [publicMatches, setPublicMatches] = useState<PublicSuggestion[]>([])
  const [pickedPublic, setPickedPublic] = useState<Set<number>>(new Set())
  const [publicNotice, setPublicNotice] = useState('')
  const [publicContext, setPublicContext] = useState<PublicReviewContext | null>(null)
  const publicGeneration = useRef(0)
  const [linkBusy, setLinkBusy] = useState(false)
  const [linkNotice, setLinkNotice] = useState('')

  useEffect(() => () => { if (photoPreview) URL.revokeObjectURL(photoPreview) }, [photoPreview])
  useEffect(() => {
    if (demo) return
    const { data: subscription } = supabase.auth.onAuthStateChange(event => {
      if (!['SIGNED_IN','SIGNED_OUT','USER_UPDATED'].includes(event)) return
      publicGeneration.current++
      setPublicContext(null); setPublicMatches([]); setPickedPublic(new Set()); setPublicConfirmed(false); setPublicBusy(false)
      setPublicNotice('Your account changed. Approve a new search before applying public fields.')
    })
    return () => { publicGeneration.current++; subscription.subscription.unsubscribe() }
  }, [demo])

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

  // This searches only the signed-in member's own SAVED profile, after opt-in.
  // No LinkedIn scraping, and nothing is applied without explicit field selection.
  const searchMyPublicInformation = async () => {
    if (demo || !publicConfirmed || !net.synced) return
    const request = ++publicGeneration.current
    setPublicBusy(true); setPublicNotice(''); setPublicMatches([]); setPickedPublic(new Set()); setPublicContext(null)
    try {
      const context = await loadPublicReviewContext()
      if (request !== publicGeneration.current) return
      const result = await findPublicInformation({ data: { confirmed: true } })
      if (request !== publicGeneration.current) return
      if (result.status !== 'ok') { setPublicNotice(result.reason); return }
      setPublicContext(context)
      setPublicMatches(result.suggestions)
      setPublicNotice(`Found ${result.suggestions.length} sourced suggestion(s). Select only what is accurate.`)
    } catch (error) {
      if (request === publicGeneration.current) setPublicNotice(error instanceof Error ? error.message : 'The public search is unavailable.')
    } finally { if (request === publicGeneration.current) setPublicBusy(false) }
  }

  const applySelectedPublicInformation = async () => {
    if (demo || !publicConfirmed || !pickedPublic.size || !publicContext) return
    const request = publicGeneration.current
    const patch = reviewedPublicProfilePatch(publicMatches, pickedPublic)
    if (!Object.keys(patch).length) { setPublicNotice('No supported profile fields selected.'); return }
    setPublicBusy(true); setPublicNotice('')
    try {
      await savePublicReview(publicContext, patch)
      if (request !== publicGeneration.current) return
      await showLocally(patch, publicContext.userId)
      if (request !== publicGeneration.current) return
      onApplied?.(patch)
      setPublicNotice('Selected fields were saved to your profile.')
      setPickedPublic(new Set())
    } catch (error) {
      if (request === publicGeneration.current) setPublicNotice(error instanceof Error ? error.message : 'Those fields could not be saved.')
    } finally { if (request === publicGeneration.current) setPublicBusy(false) }
  }

  /** Mirror the applied fields into the open page so it shows them at once. */
  const showLocally = async (patch: ScanPatch, receiptUserId?: string) => {
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
    if (Object.keys(fields).length) {
      if (receiptUserId) net.applyExecutiveReceipt(receiptUserId, fields)
      else await net.updateExecutiveProfile(fields)
    }
  }

  const apply = async (patch: ScanPatch, context?: ProfileScanContext): Promise<ApplyOutcome> => {
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
    let savedPhoto: string | undefined
    if (photo) {
      if (!context) return { status: 'failed', message: 'Scan again before saving your photo.' }
      try {
        const { data } = await supabase.auth.getUser()
        if (data.user?.id !== context.userId) throw new Error('Your account changed. Scan again.')
        savedPhoto = await uploadProfileAvatar(context.userId, photo)
        await saveReviewedProfileScan(fields, context, savedPhoto)
      } catch (error) {
        return { status: 'failed', message: error instanceof Error ? error.message : 'Your selected profile details could not be saved.' }
      }
    }
    if (!photo && Object.keys(fields).length) {
      const saved = await saveProfileScan(fields, context)
      if (saved.status === 'failed') return saved
    }
    if (context && (patch.name || savedPhoto)) net.applyIdentityReceipt({ userId: context.userId,
      ...(patch.name ? { name: patch.name } : {}), ...(savedPhoto ? { avatarUrl: savedPhoto } : {}) })
    await showLocally(patch, context?.userId)
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
    keys={PROFILE_KEYS} current={current} labels={PROFILE_LABELS} demo={demo} allowIndexedUrl={!demo}
    heading="Fill your profile from LinkedIn"
    intro="Your public profile fields are shown to verified members. Your LinkedIn link is shown on your profile."
    applyLabel={demo ? 'Apply to demo profile' : 'Apply to my profile'}
    onApply={apply} onClose={() => setOpen(false)}
    extraStep={<>
      {!demo && net.synced && <LinkedInIdentityReview onSaved={receipt => {
        net.applyIdentityReceipt({
          userId: receipt.userId,
          ...(receipt.changed.includes('name') && receipt.name != null ? { name: receipt.name } : {}),
          ...(receipt.changed.includes('avatar_url') ? { avatarUrl: receipt.avatarUrl } : {}),
        })
        if (receipt.changed.includes('name') && receipt.name) onApplied?.({ name: receipt.name })
      }} />}
      {!demo && <section className="li-public-review" aria-label="Connect my LinkedIn account">
        <span className="li-scan-label">Connect LinkedIn</span>
        <p>Link your own LinkedIn sign-in to this account. Profile fields still require your review before applying.</p>
        <Btn kind="secondary" disabled={linkBusy} onClick={() => {
          if (linkBusy) return
          setLinkBusy(true); setLinkNotice('')
          void startLinkedInAuthentication('link', `${window.location.origin}/app`)
            .catch(error => setLinkNotice(error instanceof Error ? error.message : 'LinkedIn could not connect.'))
            .finally(() => setLinkBusy(false))
        }}>{linkBusy ? 'Connecting…' : 'Connect my LinkedIn account'}</Btn>
        {linkNotice && <p className="li-scan-error" role="alert">{linkNotice}</p>}
      </section>}
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
      {!demo && <section className="li-public-review" aria-label="Find public information about my profile">
        <span className="li-scan-label">Find public information about me</span>
        <p>The search uses your own saved name and headline, not other members' profiles. Every suggestion needs a supporting source; you approve any changes.</p>
        <label className="li-public-consent">
          <input type="checkbox" checked={publicConfirmed} onChange={e => {
            setPublicConfirmed(e.target.checked)
            if (!e.target.checked) { publicGeneration.current++; setPublicContext(null); setPublicMatches([]); setPickedPublic(new Set()); setPublicBusy(false) }
          }} />
          I approve searching the public web for my own saved name and headline.
        </label>
        <Btn kind="secondary" disabled={!publicConfirmed || publicBusy || !net.synced} onClick={() => void searchMyPublicInformation()}>
          {publicBusy ? 'Searching…' : 'Find my public information'}
        </Btn>
        {!!publicMatches.length && <div className="li-public-suggestions" role="group" aria-label="Sourced suggestions to review">
          {publicMatches.map((item, index) => {
            const supported = item.field !== 'building'
            return <label key={`${item.field}-${index}`} className={supported ? '' : 'li-public-review-only'}>
              <input type="checkbox" disabled={!supported || publicBusy} checked={supported && pickedPublic.has(index)}
                onChange={() => setPickedPublic(previous => {
                  const next = new Set(previous)
                  if (next.has(index)) next.delete(index); else next.add(index)
                  return next
                })} />
              <span>
                <b>{item.field === 'whatIDo' ? 'About' : item.field === 'thesis' ? 'Headline' : item.field}</b>
                <strong>{item.value}</strong>
                <small>Evidence: “{item.quote}”</small>
                <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer nofollow">
                  {item.sourceTitle || item.sourceUrl}
                </a>
                {!supported && <em>Review only — there is not a matching profile field yet.</em>}
              </span>
            </label>
          })}
          <Btn kind="secondary" disabled={!publicConfirmed || publicBusy || !pickedPublic.size || !publicContext} onClick={() => void applySelectedPublicInformation()}>
            Apply selected public fields
          </Btn>
        </div>}
        {publicNotice && <p className="li-scan-outcome" role="status">{publicNotice}</p>}
      </section>}
    </>}
    extraReview={photoPreview ? <div className="li-scan-row on"><span /><span>Photo</span><span className="li-scan-now">Current photo</span>
      <img className="li-scan-photo-new" src={photoPreview} alt="New profile photo" /></div> : undefined}
  />
}
