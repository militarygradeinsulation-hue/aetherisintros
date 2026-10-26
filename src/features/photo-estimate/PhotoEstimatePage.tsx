import { useEffect, useRef, useState } from 'react'
import { Camera, Copy, Download, FileText, ShieldCheck, Sparkles, Trash2 } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { createPhotoEstimateDraft, photoEstimateAvailability } from '@/lib/photoEstimate.functions'
import { useNetwork } from '@/aetheris/store'

type Photo = { name: string; url: string }
const MAX_PHOTOS = 3
const MAX_IMAGE_LENGTH = 1_100_000

/** Browser-only JPEG normalization strips camera EXIF and avoids retaining original uploads. */
function preparePhoto(file: File): Promise<Photo> {
  if (!file.type.startsWith('image/') || file.size > 12 * 1024 * 1024)
    return Promise.reject(new Error('Choose an image smaller than 12 MB.'))
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const picture = new Image()
    picture.onload = () => {
      try {
        const scale = Math.min(1, 1000 / Math.max(picture.naturalWidth, picture.naturalHeight))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(picture.naturalWidth * scale))
        canvas.height = Math.max(1, Math.round(picture.naturalHeight * scale))
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Image processing is unavailable in this browser.')
        ctx.drawImage(picture, 0, 0, canvas.width, canvas.height)
        let url = ''
        for (const quality of [0.72, 0.55, 0.38]) {
          url = canvas.toDataURL('image/jpeg', quality)
          if (url.length <= MAX_IMAGE_LENGTH) break
        }
        if (url.length > MAX_IMAGE_LENGTH) throw new Error('This photo is too detailed. Try a smaller image.')
        resolve({ name: file.name, url })
      } catch (error) {
        reject(error)
      } finally {
        URL.revokeObjectURL(objectUrl)
      }
    }
    picture.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('This image format could not be opened. Try JPEG or PNG.'))
    }
    picture.src = objectUrl
  })
}
function downloadDraft(text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'ask-intros-scope-draft.txt'
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function PhotoEstimatePage() {
  const { profile } = useNetwork()
  const [trade, setTrade] = useState('')
  const [brief, setBrief] = useState('')
  const [photos, setPhotos] = useState<Photo[]>([])
  const [consent, setConsent] = useState(false)
  const [draft, setDraft] = useState('')
  const [available, setAvailable] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const revision = useRef(0)
  const identity = useRef<string | null>(null)

  useEffect(() => {
    let live = true
    void photoEstimateAvailability().then(result => {
      if (live) setAvailable(result.enabled)
    }).catch(() => { if (live) setAvailable(false) })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const next = session?.user.id ?? null
      if (identity.current !== null && identity.current !== next) {
        revision.current++
        setPhotos([])
        setDraft('')
        setConsent(false)
        setNotice('')
        setError('')
      }
      identity.current = next
    })
    return () => { live = false; revision.current++; subscription.unsubscribe() }
  }, [])
  useEffect(() => {
    if (!trade && profile.expertise?.length) setTrade(profile.expertise[0] ?? '')
  }, [profile.expertise, trade])
  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return
    if (files.length > MAX_PHOTOS) { setError('Choose at most three photos.'); return }
    const request = ++revision.current
    setError('')
    setNotice('')
    try {
      const prepared = await Promise.all(Array.from(files).map(preparePhoto))
      if (request !== revision.current) return
      setPhotos(prepared)
      setConsent(false)
      setDraft('')
      setNotice('Photos prepared locally. Nothing has been sent to a provider.')
    } catch (reason) {
      if (request === revision.current) setError(reason instanceof Error ? reason.message : 'Photo preparation failed.')
    }
  }
  const run = async () => {
    if (!consent || photos.length === 0 || !available || busy) return
    const request = ++revision.current
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const result = await createPhotoEstimateDraft({
        data: { trade: trade.trim(), brief: brief.trim(), images: photos.map(p => p.url), reviewed: true },
      })
      if (revision.current !== request) return
      setDraft(result.draft)
      setNotice('Editable scope draft created. Not priced, reviewed, sent or approved.')
    } catch (reason) {
      if (revision.current === request)
        setError(reason instanceof Error ? reason.message : 'Scope analysis could not be completed.')
    } finally {
      if (revision.current === request) setBusy(false)
    }
  }
  return <main className="mx-auto w-full max-w-5xl space-y-4 p-4 sm:p-6">
    <header className="space-y-2">
      <p className="text-xs uppercase tracking-widest opacity-60">Ask Intros · Field tools</p>
      <h1 className="flex items-center gap-2 text-2xl font-semibold"><Camera size={24} /> Photo to Estimate</h1>
      <p className="max-w-3xl text-sm opacity-75">
        Turn job site photos into a proposed work scope and measurement checklist. An estimator must verify
        quantities, pricing, hazards and code requirements before using any proposal.
      </p>
    </header>
    <section className="space-y-3 rounded-2xl border border-current/15 bg-white/[0.035] p-4">
      <h2 className="text-base font-semibold">1. Describe the job</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">Trade / service
          <input className="mt-1 w-full rounded-lg border border-current/20 bg-transparent p-3 text-inherit" maxLength={100}
            placeholder="Roofing, HVAC, electrical…" value={trade} onChange={e => setTrade(e.target.value)} />
        </label>
        <div className="flex items-center gap-2 rounded-lg border border-current/15 p-3 text-xs opacity-75">
          <ShieldCheck size={18} className="shrink-0" />
          No upload happens until you explicitly request an analysis.
        </div>
      </div>
      <label className="block text-sm">Work scope and context
        <textarea className="mt-1 min-h-24 w-full rounded-lg border border-current/20 bg-transparent p-3 text-inherit"
          maxLength={2500} value={brief} onChange={e => setBrief(e.target.value)}
          placeholder="What needs work? Include observed damage, measurements you verified, access limits and known materials. Avoid names and exact addresses." />
      </label>
    </section>
    <section className="space-y-3 rounded-2xl border border-current/15 bg-white/[0.035] p-4">
      <h2 className="text-base font-semibold">2. Add up to three photos</h2>
      <label className="block text-sm">
        Photos
        <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple
          className="mt-2 block w-full text-sm" onChange={e => {
            const input = e.currentTarget
            void handleFiles(input.files).finally(() => { input.value = '' })
          }} />
      </label>
      <p className="text-xs opacity-70">
        Images are resized locally and camera metadata is removed. Only selected photos are sent to the
        configured OpenAI API when you approve analysis. Do not submit confidential customer information without authorization.
      </p>
      {photos.length > 0 && <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {photos.map((photo, i) => <div key={i} className="overflow-hidden rounded-lg border border-current/15 p-2">
          <img className="aspect-[4/3] w-full rounded-md object-cover" alt={'Job photo ' + (i + 1)} src={photo.url} />
          <span className="mt-1 block truncate text-xs opacity-70" title={photo.name}>{photo.name}</span>
        </div>)}
      </div>}
      {photos.length > 0 && <button type="button" className="inline-flex items-center gap-2 text-sm underline"
        onClick={() => { revision.current++; setPhotos([]); setConsent(false); setDraft('') }}>
        <Trash2 size={15} /> Remove photos
      </button>}
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" className="mt-1 h-4 w-4 shrink-0" checked={consent} onChange={e => setConsent(e.target.checked)} />
        <span>I have permission to use these photos, understand an AI provider will process them,
          and will review the result myself before using it with a customer.</span>
      </label>
      {available === false && <p role="alert" className="text-sm">
        The OpenAI API is not configured for this workspace. No photos will be sent. Existing fields remain editable.
      </p>}
      <button type="button" onClick={() => void run()}
        disabled={busy || !available || !consent || photos.length === 0 || trade.trim().length < 2 || brief.trim().length < 12}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-red-600 px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45">
        <Sparkles size={16} /> {busy ? 'Reviewing photos…' : 'Create unsent scope draft'}
      </button>
    </section>
    <section className="space-y-3 rounded-2xl border border-current/15 bg-white/[0.035] p-4">
      <h2 className="flex items-center gap-2 text-base font-semibold"><FileText size={18} /> 3. Review and edit</h2>
      <p className="text-xs opacity-70">
        Photos cannot prove hidden conditions, exact quantities, dimensions or job costs.
        This workspace does not create a priced quote or send anything to a client.
      </p>
      <label className="block text-sm">Draft work scope
        <textarea className="mt-2 min-h-80 w-full rounded-lg border border-current/20 bg-transparent p-3 font-mono text-xs leading-relaxed text-inherit"
          value={draft} onChange={e => setDraft(e.target.value)}
          placeholder="Your scope draft appears here after you approve photo analysis." />
      </label>
      <div className="flex flex-wrap gap-2">
        <button disabled={!draft} type="button" className="inline-flex items-center gap-2 rounded-lg border border-current/20 px-3 py-2 text-sm disabled:opacity-40"
          onClick={() => void navigator.clipboard.writeText(draft).then(() => setNotice('Copied to clipboard.')).catch(() => setError('Clipboard access was denied.'))}>
          <Copy size={15} /> Copy
        </button>
        <button disabled={!draft} type="button" className="inline-flex items-center gap-2 rounded-lg border border-current/20 px-3 py-2 text-sm disabled:opacity-40"
          onClick={() => downloadDraft(draft)}><Download size={15} /> Export text</button>
      </div>
      {notice && <p role="status" className="text-xs">{notice}</p>}
      {error && <p role="alert" className="text-xs text-red-500">{error}</p>}
    </section>
  </main>
}
