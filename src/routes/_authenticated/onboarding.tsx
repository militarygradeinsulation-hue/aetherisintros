import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useEffect, useState } from 'react'

import { useAccess } from '@/aetheris/access'
import { supabase } from '@/integrations/supabase/client'
import '@/aetheris/styles.css'

export const Route = createFileRoute('/_authenticated/onboarding')({
  head: () => ({
    meta: [
      { title: 'Build your profile — Aetheris Intros' },
      {
        name: 'description',
        content: 'Answer nine questions and Aetheris Intros builds your professional profile and the memory behind your introductions.',
      },
      { property: 'og:title', content: 'Build your profile — Aetheris Intros' },
      { property: 'og:description', content: 'Real identity, real work, real context. Nine questions is all it takes.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
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
  const { access } = useAccess()
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (access.loading) return
    if (access.status !== 'approved') void navigate({ to: '/early-access', replace: true })
    else if (access.name && !answers['name']) setAnswers(prev => ({ ...prev, name: access.name }))
  }, [access, answers, navigate])

  const set = (key: string, value: string) => setAnswers(prev => ({ ...prev, [key]: value }))
  const get = (key: string) => answers[key]?.trim() ?? ''

  const save = async () => {
    if (!access.userId) return
    if (!get('name')) { setError('Your name is needed — members meet real people.'); return }
    setBusy(true); setError('')
    const initials = get('name').split(/\s+/).slice(0, 2).map(p => p[0] ?? '').join('').toUpperCase()
    const { error: saveError } = await supabase.from('profiles').update({
      name: get('name'), initials: initials || 'M', title: get('title'), company: get('company'),
      location: get('location'), focus: get('focus'), looking_for: get('looking_for'),
      can_help_with: get('can_help_with'), industries: list(get('industries')),
      expertise: list(get('expertise')), availability: get('availability'), onboarded: true,
    }).eq('id', access.userId)
    if (saveError) { setError(saveError.message); setBusy(false); return }

    const memories = [
      get('focus') && { category: 'Companies', text: `Your current focus: ${get('focus')}`, scope: 'public' as const },
      get('looking_for') && { category: 'Needs', text: `Active need: ${get('looking_for')}`, scope: 'shareable' as const },
      get('can_help_with') && { category: 'Interests', text: `You can help others with: ${get('can_help_with')}`, scope: 'public' as const },
      get('availability') && { category: 'Commitments', text: `Availability you set: ${get('availability')}`, scope: 'private' as const },
    ].filter(Boolean) as Array<{ category: string; text: string; scope: 'public' | 'shareable' | 'private' }>
    if (memories.length) {
      await supabase.from('memories').insert(memories.map(m => ({
        user_id: access.userId!, kind: 'learning', category: m.category, text: m.text,
        source: 'Profile onboarding', confidence: 100, scope: m.scope, when_label: 'Just now',
      })))
    }
    void navigate({ to: '/app', replace: true })
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
      {questions.map(q => <label key={q.key}>
        <span>{q.label}</span>
        <input value={answers[q.key] ?? ''} onChange={e => set(q.key, e.target.value)} placeholder={q.placeholder} />
        <small>{q.hint}</small>
      </label>)}
      {error && <p className="auth-error">{error}</p>}
      <button className="btn primary" type="button" onClick={() => void save()} disabled={busy}>
        {busy ? 'Building your profile…' : 'Enter the network'} <ArrowRight size={15} />
      </button>
    </section>
  </main>
}
