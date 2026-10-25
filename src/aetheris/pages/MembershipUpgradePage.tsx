import './executive-page-parity.css'
import { useEffect, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/integrations/supabase/client'
import { billingStatus, startMembershipCheckout } from '@/lib/billing.functions'
import { Eyebrow } from '../ui'
import { rpc, SignInRequired, useSessionUser } from './useSessionUser'
import { MembershipLevels } from './MembershipLevels'

type Plan = { id: string; name: string; description: string | null; amount_cents: number; currency: string; billing_interval: string }

const UNLOCKS = [
  ['Priority intros', 'Your requests are reviewed first and reach members faster.'],
  ['Business Lobby access', 'Open availability windows and receive knocks from accepted contacts.'],
  ['Advanced analytics', 'See how your relationships and intro outcomes are trending.'],
  ['Concierge desk', 'A human desk helps route high-value introductions.'],
] as const

export function MembershipUpgradePage() {
  const { userId, ready } = useSessionUser()
  if (!ready) return <section className="executive-section aetheris-parity"><p className="og-note parity-empty">Loading…</p></section>
  if (!userId) return <div className="aetheris-parity"><SignInRequired what="membership upgrades" /></div>
  return <><MembershipLevels /><UpgradePanel /></>
}

function UpgradePanel() {
  const [tier, setTier] = useState<'basic' | 'executive' | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])
  const [configured, setConfigured] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    void rpc('my_membership_tier').then((r) => setTier(r.data === 'executive' ? 'executive' : 'basic'))
    void (supabase as any).from('membership_plans').select('id,name,description,amount_cents,currency,billing_interval') // eslint-disable-line @typescript-eslint/no-explicit-any
      .eq('active', true).order('sort').then((r: { data: Plan[] | null }) => setPlans(r.data ?? []))
    billingStatus().then((s) => setConfigured(s.configured)).catch(() => setConfigured(false))
  }, [])

  const checkout = async (planId: string) => {
    setBusy(planId); setError('')
    try { const { url } = await startMembershipCheckout({ data: { planId } }); location.assign(url) }
    catch (e) { setError(e instanceof Error ? e.message : 'Checkout could not start.'); setBusy(null) }
  }

  return (
    <section className="executive-section aetheris-parity">
      <header className="parity-head"><div>
      <Eyebrow>Membership</Eyebrow>
      <h2>More context. Better intros. Stronger outcomes.</h2>
      <p className="og-note">Executive membership adds priority routing and private tools for members who make introductions a habit.</p>
      </div></header>

      <div className="module parity-texture">
        <Eyebrow>Your tier</Eyebrow>
        {tier === null ? <p className="og-note">Loading…</p> : (
          <p>{tier === 'executive'
            ? <><CheckCircle2 className="inline h-4 w-4" aria-hidden /> <Badge className="parity-badge">Executive</Badge> You already have every Executive feature.</>
            : <><Badge className="parity-badge" variant="secondary">Basic</Badge> Upgrade to Executive to add the features below.</>}</p>
        )}
      </div>

      <div className="module parity-texture">
        <Eyebrow>What Executive adds</Eyebrow>
        <ul className="parity-benefits">{UNLOCKS.map(([t, d]) => <li key={t}><strong>{t}</strong> — {d}</li>)}</ul>
      </div>

      {tier === 'basic' && (
        <div className="module parity-texture">
          <Eyebrow>Upgrade</Eyebrow>
          {!configured ? <p className="og-note">Online checkout is not available yet.</p>
            : plans.length === 0 ? <p className="og-note">No plans are currently offered.</p>
            : plans.map((p) => (
              <div className="parity-row" key={p.id}>
                <p><strong>{p.name}</strong> — {(p.amount_cents / 100).toLocaleString(undefined, { style: 'currency', currency: p.currency.toUpperCase() })} / {p.billing_interval}</p>
                {p.description && <p className="og-note">{p.description}</p>}
                <Button className="btn primary" onClick={() => void checkout(p.id)} disabled={busy !== null}>{busy === p.id ? 'Opening checkout…' : `Upgrade to ${p.name}`}</Button>
              </div>
            ))}
          {error && <p role="alert" className="og-note">{error}</p>}
        </div>
      )}
    </section>
  )
}
