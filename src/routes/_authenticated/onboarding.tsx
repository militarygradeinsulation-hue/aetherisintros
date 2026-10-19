import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { useAccess } from '@/aetheris/access'
import { requireConfirmedProfileSave } from '@/aetheris/lib/onboarding-save'
import { ONBOARDING_KEYS, splitList } from '@/aetheris/linkedin-scan'
import { LinkedInScanPanel, type ScanPatch } from '@/aetheris/linkedin-scan-ui'
import { supabase } from '@/integrations/supabase/client'
import '@/aetheris/styles.css'

export const Route = createFileRoute('/_authenticated/onboarding')({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: 'Build your profile — Ask Intros' },
      {
        name: 'description',
        content: 'Answer ten questions and Ask Intros builds your professional profile and the memory behind your introductions.',
      },
      { property: 'og:title', content: 'Build your profile — Ask Intros' },
      { property: 'og:description', content: 'Real identity, real work, real context. Nine questions is all it takes.' },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: 'https://intros.today/onboarding' },
      { property: 'og:image', content: 'https://intros.today/aetheris-social.png' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: 'Build your profile — Ask Intros' },
      { name: 'twitter:description', content: 'Real identity, real work, real context. Nine questions is all it takes.' },
      { name: 'twitter:image', content: 'https://intros.today/aetheris-social.png' },
    ],
    links: [{ rel: 'canonical', href: 'https://intros.today/onboarding' }],
  }),
  component: OnboardingRoute,
})

const questions = [
  { key: 'name', label: 'YOUR FULL NAME', hint: 'Real identity only. Members meet people, not handles.', placeholder: 'e.g. Amara Nwosu' },
  { key: 'title', label: 'WHAT DO YOU DO', hint: 'The role a peer would recognise.', placeholder: 'e.g. Chief Operating Officer' },
  { key: 'company', label: 'WHERE', hint: 'Company, firm or your own practice.', placeholder: 'e.g. Meridian Field Services' },
  { key: 'location', label: 'BASED IN', hint: 'Timing and travel matter to introductions.', placeholder: 'e.g. Dallas, TX' },
  { key: 'focus', label: 'WHAT YOU ARE MOVING RIGHT NOW', hint: 'The thing this quarter is actually about.', placeholder: 'e.g. Opening four new US regions' },
  { key: 'looking_for', label: 'WHAT YOU ARE LOOKING FOR', hint: 'Separate items with commas.', placeholder: 'e.g. Operators who scaled service businesses, US expansion advisors' },
  { key: 'can_help_with', label: 'WHAT YOU CAN HELP OTHERS WITH', hint: 'Give before asking. Separate with commas.', placeholder: 'e.g. Field-service playbooks, integration experience' },
  { key: 'industries', label: 'INDUSTRIES YOU UNDERSTAND', hint: 'Separate with commas.', placeholder: 'e.g. Field services, Manufacturing' },
  { key: 'expertise', label: 'YOUR EXPERTISE', hint: 'Three to five things you can be asked about.', placeholder: 'e.g. Multi-site operations, Workforce planning' },
  { key: 'availability', label: 'HOW OFTEN YOU WILL MEET SOMEONE NEW', hint: 'This is enforced. Nobody can outrank it.', placeholder: 'e.g. Two conversations a week' },
] as const

const list = (value: string) => value.split(/[,·;/]+/).map(x => x.trim()).filter(Boolean)

function OnboardingRoute() {
  const navigate = useNavigate()
  const { access, refresh } = useAccess()
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const savingRef = useRef(false)
  const [error, setError] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const answeredCount = questions.filter(q => (answers[q.key] ?? '').trim().length > 0).length
  const completion = Math.round((answeredCount / questions.length) * 100)

  useEffect(() => {
    if (access.loading || access.error) return
    if (access.status !== 'approved' || !access.emailConfirmed || access.verification === 'rejected' || access.verification === 'suspended') void navigate({ to: '/early-access', replace: true })
    else if (access.name && !answers['name']) setAnswers(prev => ({ ...prev, name: access.name }))
  }, [access, answers, navigate])

  const set = (key: string, value: string) => setAnswers(prev => ({ ...prev, [key]: value }))
  const get = (key: string) => answers[key]?.trim() ?? ''

  const save = async () => {
    // Two rapid taps must never insert duplicate onboarding memories.
    if (savingRef.current) return
    if (profileSaved) { void navigate({ to: '/app', replace: true }); return }
    if (!access.userId) { setError('Your session is not ready. Please sign in again.'); return }
    if (!get('name')) { setError('Your name is needed — members meet real people.'); return }
    savingRef.current = true
    setBusy(true)
    setError('')
    const initials = get('name').split(/\s+/).slice(0, 2).map(p => p[0] ?? '').join('').toUpperCase()
    try {
      await requireConfirmedProfileSave(access.userId, async () => {
        const { data, error } = await (supabase.from('profiles') as any).update({ // eslint-disable-line @typescript-eslint/no-explicit-any
          name: get('name'), initials: initials || 'M', title: get('title'), company: get('company'),
          location: get('location'), focus: get('focus'), looking_for: get('looking_for'),
          can_help_with: get('can_help_with'), industries: list(get('industries')),
          expertise: list(get('expertise')), availability: get('availability'), onboarded: true,
        }).eq('id', access.userId).select('id').maybeSingle()
        return { data, error }
      })
      // Membership activation is based on the confirmed profile write, not
      // optional LinkedIn metadata or the member's generated memory entries.
      setProfileSaved(true)
      const optionalFailures: string[] = []
      if (linkedinUrl) {
        try {
          const { error: linkError } = await (supabase.from('profiles') as any) // eslint-disable-line @typescript-eslint/no-explicit-any
            .update({ linkedin_url: linkedinUrl }).eq('id', access.userId)
          if (linkError) optionalFailures.push('LinkedIn link')
        } catch { optionalFailures.push('LinkedIn link') }
      }
      const memories = [
        get('focus') && { category: 'Companies', text: `Your current focus: ${get('focus')}`, scope: 'public' as const },
        get('looking_for') && { category: 'Needs', text: `Active need: ${get('looking_for')}`, scope: 'shareable' as const },
        get('can_help_with') && { category: 'Interests', text: `You can help others with: ${get('can_help_with')}`, scope: 'public' as const },
        get('availability') && { category: 'Commitments', text: `Availability you set: ${get('availability')}`, scope: 'private' as const },
      ].filter(Boolean) as Array<{ category: string; text: string; scope: 'public' | 'shareable' | 'private' }>
      if (memories.length) {
        try {
          const { error: memoryError } = await supabase.from('memories').insert(memories.map(m => ({
            user_id: access.userId!, kind: 'learning', category: m.category, text: m.text,
            source: 'Profile onboarding', confidence: 100, scope: m.scope, when_label: 'Just now',
          })))
          if (memoryError) optionalFailures.push('profile memories')
        } catch { optionalFailures.push('profile memories') }
      }
      if (optionalFailures.length) {
        setError(`Your profile was saved, but ${optionalFailures.join(' and ')} could not be saved. You can update them from your profile. Select Continue to the network.`)
        return
      }
      void navigate({ to: '/app', replace: true })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Your profile was not confirmed. Please retry.')
    } finally {
      savingRef.current = false
      setBusy(false)
    }
  }

  if (access.error) {
    return <main className="access-waiting" role="alert">
      <span className="folio">ASK INTROS / CONNECTION ISSUE</span>
      <p>{access.error}</p>
      <button type="button" className="btn secondary" onClick={() => { void refresh() }}>Retry membership check</button>
    </main>
  }

  return <main className="onboarding-page">
    <header className="onboarding-head">
      <span className="folio">FOUNDING MEMBER PROFILE / 2026</span>
      <h1>Real identity.<br /><em>Real context.</em></h1>
      <p>
        These answers become your profile and the memory behind every introduction. Nothing is shared
        outside your stated scope, and no member can reach you against the availability you set here.
      </p>
    </header>
    <section className="onboarding-form">
      <div className="onboarding-progress" role="group" aria-label="Profile completion">
        <div className="onboarding-progress-label"><strong>Profile progress</strong><span aria-live="polite">{answeredCount} of {questions.length} answered</span></div>
        <div className="onboarding-progress-track" role="progressbar" aria-label="Profile questions answered" aria-valuemin={0} aria-valuemax={100} aria-valuenow={completion}>
          <div className="onboarding-progress-fill" style={{ width: `${completion}%` }} />
        </div>
        <small>Only your name is required to continue. More context helps make introductions relevant.</small>
      </div>
      <LinkedInScanPanel
        keys={ONBOARDING_KEYS} demo={false}
        current={{ ...answers, linkedin_url: linkedinUrl }}
        heading="Start from your LinkedIn profile"
        intro="Fills the answers below for you to check. Nothing is saved until you click Enter the network."
        applyLabel="Fill my answers"
        onApply={async (patch: ScanPatch) => {
          const { linkedin_url: url, ...rest } = patch
          if (url) setLinkedinUrl(url)
          const filled = Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, k === 'industries' || k === 'expertise' ? splitList(v ?? '').join(', ') : v ?? '']))
          setAnswers(prev => ({ ...prev, ...filled }))
          return { status: 'filled', message: 'Filled in below. Not saved yet: check your answers, then click Enter the network.' }
        }} />
      {questions.map(q => <label key={q.key}>
        <span>{q.label}</span>
        <input value={answers[q.key] ?? ''} onChange={e => set(q.key, e.target.value)} placeholder={q.placeholder} />
        <small>{q.hint}</small>
      </label>)}
      {error && <p className="auth-error" role="alert">{error}</p>}
      <button className="btn primary" type="button" onClick={() => void save()} disabled={busy}>
        {busy ? 'Building your profile…' : profileSaved ? 'Continue to the network' : 'Enter the network'} <ArrowRight size={15} />
      </button>
    </section>
  </main>
}
