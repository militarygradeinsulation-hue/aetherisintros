import './executive-page-parity.css'
import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/integrations/supabase/client'
import { saveMarketplacePilotInterest } from '../marketplace-pilot/persistence'
import type { PilotInterestPayload } from '../marketplace-pilot/pilot-interest'
import { Eyebrow } from '../ui'
import { SignInRequired, useSessionUser } from './useSessionUser'

const CATEGORIES = ['Buy', 'Partner', 'Invest', 'Hire'] as const
type Category = (typeof CATEGORIES)[number]
const BUDGETS = ['Not determined', 'Under $10k', '$10k–$50k', '$50k–$250k', '$250k+'] as const

type Saved = { intent: string; response: PilotInterestPayload; updated_at: string }

/** Buy/Hire are concrete needs (buyer section); Partner/Invest are exploratory. */
export function buildIntentPayload(f: { category: Category; description: string; budget: string; organization: string; role: string; industry: string; city: string }): PilotInterestPayload {
  const base = {
    organization: f.organization.trim(), role: f.role.trim(), industry: f.industry.trim(),
    location: { city: f.city.trim(), remote: false },
    difficulty: `[${f.category} · ${f.budget}] ${f.description.trim()}`.slice(0, 1000),
    optIns: { pilotContact: false, feedbackInterview: false, realPilotProject: false },
  }
  if (f.category === 'Buy' || f.category === 'Hire') {
    return { ...base, intent: 'buy', buyer: { need: f.description.trim(), outcome: `${f.category} · budget ${f.budget}`, timing: 'Flexible', location: f.city.trim(), remote: false, budgetStatus: 'not_determined' } }
  }
  return { ...base, intent: 'exploring' }
}

export function MarketplacePilotPage() {
  const { userId, ready } = useSessionUser()
  if (!ready) return <section className="executive-section aetheris-parity"><p className="og-note parity-empty">Loading…</p></section>
  if (!userId) return <div className="aetheris-parity"><SignInRequired what="the marketplace pilot" /></div>
  return <PilotPanel />
}

function PilotPanel() {
  const [saved, setSaved] = useState<Saved[]>([])
  const [form, setForm] = useState({ category: 'Buy' as Category, description: '', budget: BUDGETS[0] as string, organization: '', role: '', industry: '', city: '' })
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const { data } = await (supabase as any).from('marketplace_pilot_interests').select('intent,response,updated_at') // eslint-disable-line @typescript-eslint/no-explicit-any
    setSaved(data ?? [])
  }, [])
  useEffect(() => { void load() }, [load])

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value })
  const submit = async () => {
    const d = form.description.trim().length
    if (d < 12 || d > 900) return setMsg('Description must be 12–900 characters.')
    if (![form.organization, form.role, form.industry, form.city].every((v) => v.trim() && v.trim().length <= 120)) return setMsg('Organization, role, industry and city are required.')
    setBusy(true); setMsg('')
    try { await saveMarketplacePilotInterest(buildIntentPayload(form)); setMsg('Saved privately.'); await load() }
    catch { setMsg('Your intent could not be saved. Your answers are kept.') }
    finally { setBusy(false) }
  }

  return (
    <section className="executive-section aetheris-parity">
      <header className="parity-head"><div>
      <Eyebrow>Marketplace pilot</Eyebrow>
      <h2>Tell us what you want to buy, partner on, or fund.</h2>
      <p className="og-note">Your intent shapes which marketplace features we build first. It stays private: it never becomes a listing or permits outreach.</p>
      </div></header>

      <div className="module parity-texture">
        <Eyebrow>Submit an intent</Eyebrow>
        <label>Category <select value={form.category} onChange={set('category')}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label>
        <label>Budget range <select value={form.budget} onChange={set('budget')}>{BUDGETS.map((b) => <option key={b}>{b}</option>)}</select></label>
        <label>Description <Textarea value={form.description} onChange={set('description')} maxLength={900} /></label>
        <label>Organization <Input value={form.organization} onChange={set('organization')} maxLength={120} /></label>
        <label>Role <Input value={form.role} onChange={set('role')} maxLength={120} /></label>
        <label>Industry <Input value={form.industry} onChange={set('industry')} maxLength={120} /></label>
        <label>City or region <Input value={form.city} onChange={set('city')} maxLength={120} /></label>
        <Button className="btn primary" onClick={() => void submit()} disabled={busy}>{busy ? 'Saving…' : 'Save intent'}</Button>
        <p className="og-note">One intent per member; saving again replaces your earlier one.</p>
        {msg && <p role="status" className="og-note">{msg}</p>}
      </div>

      <div className="module parity-texture">
        <Eyebrow>Your intent</Eyebrow>
        {saved.length === 0 ? <p className="og-note parity-empty">You have not submitted an intent yet.</p> : saved.map((s) => (
          <div className="parity-row" key={s.updated_at}>
            <Badge className="parity-badge" variant="secondary">Received · private</Badge> <span className="og-note">{new Date(s.updated_at).toLocaleDateString()}</span>
            <p>{s.response.difficulty}</p>
          </div>
        ))}
      </div>

      <div className="module parity-texture">
        <Eyebrow>Network signals</Eyebrow>
        <p className="og-note">Unavailable. Intents are private to each member, so no network feed is shared yet.</p>
      </div>
    </section>
  )
}
