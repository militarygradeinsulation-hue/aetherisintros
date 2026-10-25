import logoAsset from '@/assets/aetheris-logo.jpg.asset.json'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowRight, Check, Clock, LockKeyhole, ShieldAlert } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { signOutMember } from '@/aetheris/sync/workspace-sync'

import { storedInvite, claimAccess, foundingLabel, foundingStats, joinWaitlist, useAccess, type AccessState, type FoundingStats } from '@/aetheris/access'
import { supabase } from '@/integrations/supabase/client'
import { AppearanceToggle } from '@/aetheris/AppearanceToggle'
import '@/aetheris/styles.css'

export const Route = createFileRoute('/early-access')({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: 'Ask Intros Membership | Basic and Executive Access' },
      {
        name: 'description',
        content:
          'Explore Ask Intros membership, Basic account creation, and reviewed Executive access for purposeful business networking and introductions.',
      },
      { property: 'og:title', content: 'Ask Intros Membership | Basic and Executive Access' },
      { property: 'og:description', content: 'Explore Basic membership and reviewed Executive access to Ask Intros.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { property: 'og:url', content: 'https://askintros.vip/early-access' },
    ],
    links: [{ rel: 'canonical', href: 'https://askintros.vip/early-access' }],
  }),
  component: EarlyAccessPage,
})

/** Confirm the stored membership read-back, not just the claim RPC's receipt. */
export function confirmedFoundingClaim(claimedStatus: string, checked: AccessState | null): boolean {
  return claimedStatus === 'approved' && checked?.signedIn === true &&
    checked.emailConfirmed === true && checked.status === 'approved' &&
    checked.verification !== 'rejected' && checked.verification !== 'suspended'
}

function EarlyAccessPage() {
  const { access, refresh } = useAccess()
  const navigate = useNavigate()
  const [stats, setStats] = useState<FoundingStats>({ approved: 0, capacity: 1000, mode: 'first_1000' })
  const [code, setCode] = useState('')
  const [waitEmail, setWaitEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const reloadStats = useCallback(() => { void foundingStats().then(setStats) }, [])
  useEffect(reloadStats, [reloadStats])
  useEffect(() => { const s = storedInvite(); if (s) setCode(s) }, [])

  useEffect(() => {
    if (access.loading || !access.signedIn) return
    // Network approval and onboarding are separate from optional role verification.
    if (access.status === 'approved' && access.emailConfirmed && access.verification !== 'rejected' && access.verification !== 'suspended') {
      void navigate({ to: access.onboarded ? '/app' : '/onboarding', replace: true })
    }
  }, [access, navigate])

  const claim = async () => {
    setBusy(true); setError(''); setNotice('')
    try {
      const result = await claimAccess(code)
      const checked = await refresh()
      reloadStats()
      if (confirmedFoundingClaim(result.status, checked)) {
        setNotice('Your membership is confirmed. Continue to your onboarding.')
      } else if (result.status === 'approved') {
        setError('Your claim was received, but we could not confirm the saved approval yet. Please retry before continuing.')
      } else if (result.status === 'waitlisted') {
        setNotice('Your claim was recorded as waitlisted. We will contact you when a place opens.')
      } else {
        setError('This account is not approved yet. An invitation or admin approval may be needed.')
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong. Try again.')
    } finally { setBusy(false) }
  }

  const wait = async () => {
    setBusy(true); setError(''); setNotice('')
    try {
      await joinWaitlist(waitEmail, '')
      setNotice('You are on the waitlist. We will write to you when a place opens.')
      setWaitEmail('')
    } catch { setError('That email could not be added. Check it and try again.') }
    finally { setBusy(false) }
  }

  const remaining = Math.max(0, stats.capacity - stats.approved)
  const modeCopy = stats.mode === 'first_1000'
    ? `${remaining.toLocaleString()} founding places remain of ${stats.capacity.toLocaleString()}.`
    : stats.mode === 'invite_only'
      ? 'Access is currently by invitation only.'
      : 'Registration is closed. Approved members can still sign in.'

  return <main className="auth-page">
    <section className="auth-panel">
      <AppearanceToggle className="auth-appearance" />
      <Link to="/" className="auth-brand">
        <img className="brand-logo" src={logoAsset.url} alt="Ask Intros logo" />
        <span className="brand-name">Ask<em>Intros</em></span>
      </Link>
      <div className="auth-index"><span className="folio">FOUNDING 1,000 / 2026</span><span>01 / MEMBER ACCESS</span></div>
      <h1>Start with<br /><em>Basic.</em></h1>
      <p className="auth-lede">
        Anyone can create a Basic account and join after email confirmation and profile setup. Executive membership is reviewed separately for C-suite leaders. Every introduction requires consent.
      </p>

      <div className="access-meter" aria-label="Founding member places">
        <div className="access-meter-bar"><i style={{ width: `${Math.min(100, (stats.approved / Math.max(1, stats.capacity)) * 100)}%` }} /></div>
        <span>{stats.approved.toLocaleString()} claimed · {modeCopy}</span>
      </div>

      {access.loading && <p className="auth-notice">Checking your place…</p>}
      {access.error && <div className="auth-error" role="alert">
        <p>{access.error}</p>
        <button className="btn secondary" type="button" onClick={() => { void refresh() }}>Retry membership check</button>
      </div>}

      {!access.loading && !access.error && access.signedIn && access.status === 'approved' && !access.emailConfirmed && (
        <p className="auth-notice" role="status">Your account is approved. Confirm your email address using the link in your inbox before entering the network.</p>
      )}

      {!access.loading && !access.error && !access.signedIn && <>
        <p className="auth-lede">Explore the complete showcase without an account. Create one only when you are ready to build your real professional network.</p>
        <div className="access-entry-actions">
          <Link to="/demo" className="btn primary">Demo the system <ArrowRight size={15} /></Link>
          <Link to="/auth" search={{ next: '/early-access', mode: 'signup' }} className="btn access-account">Create a Basic account</Link>
        </div>
      </>}

      {!access.loading && !access.error && access.signedIn && access.status !== 'approved' && <>
        {access.status === 'waitlisted' && <p className="auth-notice"><Clock size={13} /> You are on the waitlist. Nothing more to do — we will write when a place opens.</p>}
        {access.status === 'suspended' && <p className="auth-error"><ShieldAlert size={13} /> This account is suspended. Reply to your welcome email and we will look at it.</p>}
        {access.status === 'denied' && <p className="auth-error"><ShieldAlert size={13} /> This account was not approved for early access.</p>}
        {(access.status === 'none' || access.status === 'pending') && <>
          <p className="auth-notice"><Clock size={13} /> {stats.mode === 'first_1000' ? 'A founding place may be available. Claim it to build your network.' : 'Explore the demo while you wait for an invitation.'}</p>
          <Link to="/demo" className="btn primary">Explore the demo <ArrowRight size={15} /></Link>
          <label className="access-field">
            <span>MEMBER ACCESS CODE</span>
            <input value={code} onChange={e => setCode(e.target.value)} placeholder="Code from a member" />
          </label>
          <button className="btn ghost" type="button" onClick={() => void claim()} disabled={busy || (!code.trim() && stats.mode !== 'first_1000')}>
            {busy ? 'One moment…' : 'Claim founding access'} <ArrowRight size={15} />
          </button>
        </>}
        {error && <p className="auth-error">{error}</p>}
        {notice && <p className="auth-notice">{notice}</p>}
        <button className="auth-switch" type="button" onClick={() => { void signOutMember('/auth') }}>
          Use a different account
        </button>
      </>}

      {!access.loading && !access.error && !access.signedIn && stats.mode !== 'first_1000' && <div className="access-waitlist">
        <label className="access-field">
          <span>JOIN THE WAITLIST</span>
          <input type="email" value={waitEmail} onChange={e => setWaitEmail(e.target.value)} placeholder="you@company.com" />
        </label>
        <button className="btn ghost" type="button" onClick={() => void wait()} disabled={busy || !waitEmail}>Add me to the waitlist</button>
      </div>}

      <div className="auth-proof" aria-label="What founding members get">
        <span><b>01</b> <Check size={12} /> Permanent founding number</span>
        <span><b>02</b> Double opt-in introductions</span>
        <span><b>03</b> Your memory, controlled</span>
      </div>
      <span className="auth-foot"><LockKeyhole size={12} /> {access.foundingNumber ? foundingLabel(access.foundingNumber, stats.capacity) : 'Nothing is shared without your explicit opt-in.'}</span>
      {access.status === 'approved' && access.emailConfirmed && access.verification !== 'rejected' && access.verification !== 'suspended' && (
        <Link to={access.onboarded ? '/app' : '/onboarding'} className="auth-switch">{access.onboarded ? 'Enter your network.' : 'Complete your profile.'}</Link>
      )}
    </section>
    <aside className="auth-visual auth-visual-type" aria-label="Ask Intros founding network principles">
      <span className="auth-visual-mark" aria-hidden="true">+</span>
      <div className="auth-visual-statement" aria-hidden="true">
        <span>WHY ME</span><i>×</i><span>WHY THEM</span><i>×</i><span>WHY NOW</span>
      </div>
      <div className="portrait-caption">
        <span>REAL IDENTITY. REAL CONTEXT.</span>
        <p>Demo the system freely. Join the live network when you are ready to participate.</p>
      </div>
    </aside>
  </main>
}
