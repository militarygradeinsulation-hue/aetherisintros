/**
 * My profile → "Scan LinkedIn profile": the member pastes their profile (or adds LinkedIn's
 * "Save to PDF" export) and, optionally, a photo. They review every field next to their current
 * value, tick what to apply, and only then is anything written to their profile.
 */
import { ImageUp, Loader2, ScanLine } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { fetchLinkedInPhoto } from '@/lib/linkedinImport.functions'
import { isLinkedInPhotoUrl } from './linkedin-import'
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

  useEffect(() => () => { if (photoPreview) URL.revokeObjectURL(photoPreview) }, [photoPreview])

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
    extraStep={<div className="li-scan-photo">
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
    </div>}
    extraReview={photoPreview ? <div className="li-scan-row on"><span /><span>Photo</span><span className="li-scan-now">Current photo</span>
      <img className="li-scan-photo-new" src={photoPreview} alt="New profile photo" /></div> : undefined}
  />
}
