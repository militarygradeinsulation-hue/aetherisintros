import './executive-page-parity.css'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useServerFn } from '@tanstack/react-start'
import { supabase } from '@/integrations/supabase/client'
import { billingStatus, startMembershipCheckout, openBillingPortal } from '@/lib/billing.functions'
import { Eyebrow } from '../ui'
import { SignInRequired, useSessionUser } from './useSessionUser'
import { MembershipLevels } from './MembershipLevels'

type Plan = { id: string; name: string; description: string | null; amount_cents: number; currency: string; billing_interval: string }

export function MembershipUpgradePage() {
  const { userId, ready } = useSessionUser()
  if (!ready) return <section className="executive-section aetheris-parity"><p className="og-note parity-empty">Loading…</p></section>
  if (!userId) return <div className="aetheris-parity"><SignInRequired what="membership upgrades" /></div>
  return <><MembershipLevels /><UpgradePanel /></>
}

function UpgradePanel() {
  const readBilling = useServerFn(billingStatus)
  const startCheckout = useServerFn(startMembershipCheckout)
  const manageBilling = useServerFn(openBillingPortal)
  const [plans, setPlans] = useState<Plan[]>([])
  const [configured, setConfigured] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    void (supabase as any).from('membership_plans').select('id,name,description,amount_cents,currency,billing_interval') // eslint-disable-line @typescript-eslint/no-explicit-any
      .eq('active', true).order('sort').then((r: { data: Plan[] | null }) => setPlans(r.data ?? []))
    void readBilling().then((s) => setConfigured(s.configured)).catch(() => setConfigured(false))
  }, [readBilling])

  const checkout = async (planId: string) => {
    setBusy(planId); setError('')
    try { const { url } = await startCheckout({ data: { planId } }); location.assign(url) }
    catch (e) { setError(e instanceof Error ? e.message : 'Checkout could not start.'); setBusy(null) }
  }

  return (
    <section className="executive-section aetheris-parity">
      <header className="parity-head"><div>
      <Eyebrow>Membership</Eyebrow>
      <h2>Paid membership and billing.</h2>
      <p className="og-note">Only currently offered plans appear below. Existing Executive review remains separate from payment.</p>
      </div></header>

      {(
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
          {configured && <Button variant="outline" disabled={busy !== null} onClick={() => { setBusy('portal'); setError(''); void manageBilling().then(({ url }) => location.assign(url)).catch(() => { setError('Billing could not open. You may not have a billing account yet.'); setBusy(null) }) }}>Manage billing</Button>}
        </div>
      )}
    </section>
  )
}
