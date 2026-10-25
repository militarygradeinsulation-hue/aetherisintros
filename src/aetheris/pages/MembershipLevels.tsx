import { useEffect, useState } from 'react'
import { BadgeCheck, Linkedin, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useServerFn } from '@tanstack/react-start'
import { getMyMemberEntitlements } from '@/lib/member-entitlements.functions'
import { checkLinkedInReadiness, type ProviderReadiness } from '../auth-provider-readiness'
import { startLinkedInAuthentication } from '../linkedin-auth'
import type { MemberEntitlements } from '../member-entitlements'
import './executive-page-parity.css'

export function MembershipLevels() {
  const getEntitlements = useServerFn(getMyMemberEntitlements)
  const [access, setAccess] = useState<MemberEntitlements | null>(null)
  const [provider, setProvider] = useState<ProviderReadiness>('unverified')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    const c = new AbortController()
    void checkLinkedInReadiness(c.signal).then(s => { if (!c.signal.aborted) setProvider(s) })
    void getEntitlements().then(e => { if (!c.signal.aborted) setAccess(e) }).catch(() => { if (!c.signal.aborted) setError('Your new access levels are not available yet. Existing membership remains unchanged.') })
    return () => c.abort()
  }, [getEntitlements])
  const connect = async () => {
    setBusy(true); setError('')
    try { await startLinkedInAuthentication('link', `${window.location.origin}/auth?next=${encodeURIComponent('/app?workspace=membership-upgrade')}`) }
    catch { setError('LinkedIn ownership verification could not start. Your Basic account remains available.') }
    finally { setBusy(false) }
  }
  return <section className="executive-section aetheris-parity" aria-label="Membership levels">
    <header className="parity-head"><div><h2>Choose how far your membership goes.</h2><p className="og-note">Start free. Verify your LinkedIn account for networking. Paid membership adds full member access and your black ID card.</p></div></header>
    <div className="parity-grid">
      <article className="module"><h3>Basic · Free</h3><p>Your profile and browsing.</p><p className="og-note">No LinkedIn account required. Posting, messaging, introductions, and business tools are not included.</p></article>
      <article className="module"><h3><Linkedin className="inline h-4 w-4" aria-hidden /> LinkedIn verified</h3><p>Posting, messaging, and introductions.</p><p className="og-note">Connect your own LinkedIn account to verify ownership. Business tools and the black ID card belong to paid membership.</p>
        {access?.linkedinVerified ? <p role="status"><BadgeCheck className="inline h-4 w-4" aria-hidden /> LinkedIn ownership verified</p> : <Button className="btn secondary" onClick={() => void connect()} disabled={busy || provider !== 'enabled'}>{busy ? 'Connecting…' : 'Verify with LinkedIn'}</Button>}
        {provider !== 'enabled' && <p className="og-note">LinkedIn verification is not available yet. You can still create and use a Basic account.</p>}
      </article>
      <article className="module"><h3><CreditCard className="inline h-4 w-4" aria-hidden /> Paid membership</h3><p>Full member features and the black ID card.</p><p className="og-note">Includes networking and business tools. Private administration remains separately authorized.</p>{access?.level === 'paid' && <p role="status">Paid membership active</p>}</article>
    </div>
    {error && <p role="status">{error}</p>}
  </section>
}