import logoAsset from '@/assets/aetheris-logo.jpg.asset.json'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowRight, Check, Clock, LockKeyhole, ShieldAlert } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { storedInvite, claimAccess, foundingLabel, foundingStats, joinWaitlist, useAccess, type FoundingStats } from '@/aetheris/access'
import { supabase } from '@/integrations/supabase/client'
import '@/aetheris/styles.css'

export const Route = createFileRoute('/early-access')({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: 'Founding 1,000 — Ask Intros' },
      {
        name: 'description',
        content:
          'Ask Intros is opening to its first 1,000 members. Claim a founding place and join a business network without selling, mass outreach or spam.',
      },
      { property: 'og:title', content: 'Founding 1,000 — Ask Intros' },
      { property: 'og:description', content: 'The first 1,000 members shape the network. Claim your founding place.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { property: 'og:url', content: 'https://intros.today/early-access' },
    ],
    links: [{ rel: 'canonical', href: 'https://intros.today/early-access' }],
  }),
  component: EarlyAccessPage,
})

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
    // A founding place is only half of membership: the business role must be verified too.
    if (access.verification !== 'verified') { void navigate({ to: '/verify', replace: true }); return }
    if (access.status === 'approved') {
      void navigate({ to: access.onboarded ? '/app' : '/onboarding', replace: true })
    }
  }, [access, navigate])

  const claim = async () => {
    setBusy(true); setError(''); setNotice('')
    try {
      const result = await claimAccess(code)
      await refresh()
      reloadStats()
      if (result.status === 'approved') void navigate({ to: '/verify', replace: true })
      else if (result.status === 'waitlisted') setNotice('The founding places are taken. You are on the waitlist and we will write when a place opens.')
      else setError('This account is not approved yet. An invitation or admin approval is needed.')
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
      <Link to="/" className="auth-brand">
        <img className="brand-logo" src={logoAsset.url} alt="Ask Intros logo" />
        <span className="brand-name">Ask<em>Intros</em></span>
      </Link>
      <div className="auth-index"><span className="folio">FOUNDING 1,000 / 2026</span><span>01 / MEMBER ACCESS</span></div>
      <h1>The first<br /><em>thousand.</em></h1>
      <p className="auth-lede">
        Ask Intros opens with 1,000 members. No selling, no mass outreach, no bought attention —
        every introduction needs both sides to agree.
      </p>

      <div className="access-meter" aria-label="Founding member places">
        <div className="access-meter-bar"><i style={{ width: `${Math.min(100, (stats.approved / Math.max(1, stats.capacity)) * 100)}%` }} /></div>
        <span>{stats.approved.toLocaleString()} claimed · {modeCopy}</span>
      </div>

      {access.loading && <p className="auth-notice">Checking your place…</p>}

      {!access.loading && !access.signedIn && <>
        <p className="auth-lede">Explore the complete showcase without an account. Create one only when you are ready to build your real professional network.</p>
        <div className="access-entry-actions">
          <Link to="/demo" className="btn primary">Demo the system <ArrowRight size={15} /></Link>
          <Link to="/auth" search={{ next: '/early-access' }} className="btn access-account">Create your account</Link>
        </div>
      </>}

      {!access.loading && access.signedIn && access.status !== 'approved' && <>
        {access.status === 'waitlisted' && <p className="auth-notice"><Clock size={13} /> You are on the waitlist. Nothing more to do — we will write when a place opens.</p>}
        {access.status === 'suspended' && <p className="auth-error"><ShieldAlert size={13} /> This account is suspended. Reply to your welcome email and we will look at it.</p>}
        {access.status === 'denied' && <p className="auth-error"><ShieldAlert size={13} /> This account was not approved for early access.</p>}
        {(access.status === 'none' || access.status === 'pending') && <>
          <p className="auth-notice"><Clock size={13} /> You are on the whitelist. Explore the demo now — full access opens with a member’s access code.</p>
          <Link to="/demo" className="btn primary">Explore the demo <ArrowRight size={15} /></Link>
          <label className="access-field">
            <span>MEMBER ACCESS CODE</span>
            <input value={code} onChange={e => setCode(e.target.value)} placeholder="Code from a member" />
          </label>
          <button className="btn ghost" type="button" onClick={() => void claim()} disabled={busy || !code.trim()}>
            {busy ? 'One moment…' : 'Unlock full access'} <ArrowRight size={15} />
          </button>
        </>}
        {error && <p className="auth-error">{error}</p>}
        {notice && <p className="auth-notice">{notice}</p>}
        <button className="auth-switch" type="button" onClick={() => void supabase.auth.signOut().then(refresh)}>
          Use a different account
        </button>
      </>}

      {!access.loading && !access.signedIn && stats.mode !== 'first_1000' && <div className="access-waitlist">
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
      {access.status === 'approved' && <Link to="/app" className="auth-switch">Enter your network.</Link>}
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
