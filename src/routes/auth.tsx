import logoAsset from '@/assets/aetheris-logo.jpg.asset.json'
import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router'
import { ArrowRight, LockKeyhole } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { supabase } from '@/integrations/supabase/client'
import { lovable } from '@/integrations/lovable/index'
import { AUTH_REQUIRED } from '@/aetheris/config'
import { claimAccess, clearInvite, previewInvite, rememberInvite, storedInvite } from '@/aetheris/access'
import { logSecurityEvent, passwordProblem } from '@/aetheris/verification'
import '@/aetheris/styles.css'
import ConstellationField from '@/aetheris/ConstellationField'

const safeNext = (value: unknown) => {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return ''
  return value
}

export const Route = createFileRoute('/auth')({
  staticData: { sitemap: false },
  validateSearch: (search: Record<string, unknown>): { next?: string; invite?: string } => {
    const next = safeNext(search['next'])
    const invite = typeof search['invite'] === 'string' ? search['invite'].slice(0, 64) : ''
    return { ...(next ? { next } : {}), ...(invite ? { invite } : {}) }
  },
  beforeLoad: ({ search }) => {
    // A pending agent-integration consent flow always needs the sign-in screen.
    if (!AUTH_REQUIRED && !search.next && !search.invite) throw redirect({ to: '/app' })
  },
  head: () => ({
    meta: [
      { title: 'Sign in — Ask Intros' },
      {
        name: 'description',
        content:
          'Sign in to Ask Intros to keep your introductions, active memory and relationship preferences between sessions.',
      },
      { property: 'og:title', content: 'Sign in — Ask Intros' },
      {
        property: 'og:description',
        content: 'Your introductions, memory and preferences, kept private and permissioned.',
      },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  component: AuthPage,
})

function AuthPage() {
  const navigate = useNavigate()
  const { next, invite: inviteParam } = Route.useSearch()
  const [mode, setMode] = useState<'signin' | 'signup'>(inviteParam ? 'signup' : 'signin')
  const [invite, setInvite] = useState(inviteParam ?? '')
  const [inviter, setInviter] = useState<{ valid: boolean; inviter: string } | null>(null)
  useEffect(() => { if (!inviteParam) { const s = storedInvite(); if (s) setInvite(s) } }, [inviteParam])
  useEffect(() => {
    const c = invite.trim()
    if (c.length < 4) { setInviter(null); return }
    const t = setTimeout(() => { void previewInvite(c).then(setInviter) }, 300)
    return () => clearTimeout(t)
  }, [invite])
  const hasInvite = Boolean(inviteParam) || (mode === 'signup' && Boolean(inviter?.valid))
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const land = useCallback(async () => {
    const code = storedInvite()
    if (code) {
      // Joining through a member's invite connects both of you once the place is claimed.
      try { await claimAccess(code); clearInvite() } catch { /* the founding page can retry */ }
    }
    if (next) { window.location.replace(next); return }
    void navigate({ to: '/verify', replace: true })
  }, [navigate, next])

  useEffect(() => {
    let cancelled = false
    void supabase.auth.getSession().then(({ data }) => {
      if (!cancelled && data.session) void land()
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && event === 'SIGNED_IN') void logSecurityEvent('signed_in', 'Signed in to Ask Intros.')
      if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) void land()
    })
    return () => { cancelled = true; sub.subscription.unsubscribe() }
  }, [land])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true); setError(''); setNotice('')
    try {
      rememberInvite(invite)
      if (mode === 'signup') {
        if (!invite.trim()) throw new Error('Sign-up is invite-only right now. Enter the invite code a member sent you.')
        if (inviter && !inviter.valid) throw new Error('That invite code is not valid. Check it with the person who sent it.')
        const weak = passwordProblem(password)
        if (weak) throw new Error(weak)
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${next || '/verify'}`,
            data: { name: name || email.split('@')[0], invite_code: invite.trim() },
          },
        })
        if (signUpError) throw signUpError
        if (!data.session) {
          setNotice('Check your email to confirm the address, then sign in. If it does not arrive, check your spam folder too.')
          setMode('signin')
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) throw signInError
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const google = async () => {
    setBusy(true); setError('')
    rememberInvite(invite)
    const result = await lovable.auth.signInWithOAuth('google', {
      redirect_uri: `${window.location.origin}${next || '/verify'}`,
    })
    if (result.error) {
      setError('Google sign-in could not start. Try email instead.')
      setBusy(false)
      return
    }
    if (result.redirected) return
    void land()
  }

  return <main className="auth-page">
    <section className="auth-panel">
      <Link to="/" className="auth-brand">
        <img className="brand-logo" src={logoAsset.url} alt="Ask Intros logo" />
        <span className="brand-name">Ask<em>Intros</em></span>
      </Link>
      <div className="auth-index"><span className="folio">MEMBER ACCESS / 2026</span><span>01 / PRIVATE NETWORK</span></div>
      {hasInvite
        ? <p className="auth-invited" role="status">
            {inviter?.valid
              ? `You were invited by ${inviter.inviter || 'a member'}. Create your account below.`
              : 'You were invited by a member. Create your account below.'}
          </p>
        : <div className="auth-soon" role="status">
            <span><i aria-hidden="true" />LAUNCHING SOON</span>
            <p>Ask Intros is in private pre-launch. Open sign-up is closed — only whitelisted founding members can sign in right now.</p>
            <div className="auth-soon-actions">
              <Link to="/demo">Explore the demo <ArrowRight size={13} /></Link>
              <Link to="/early-access">Join the whitelist <ArrowRight size={13} /></Link>
            </div>
          </div>}
      <h1>{mode === 'signin' ? <>Welcome<br /><em>back.</em></> : <>Join the<br /><em>network.</em></>}</h1>
      <p className="auth-lede">
        A network built for people who actually run companies. Every member is verified, so every
        relationship starts with a real person — and your context stays private and permissioned.
      </p>

      <div className="auth-proof" aria-label="Member access principles">
        <span><b>01</b> Private by default</span>
        <span><b>02</b> Double opt-in</span>
        <span><b>03</b> Your memory, controlled</span>
      </div>


      <button className="btn google" type="button" onClick={() => void google()} disabled={busy}>
        Continue with Google
      </button>
      <div className="auth-divider"><span>or use email</span></div>

      {mode === 'signup' && <label className="auth-invite">
        <span>INVITE CODE</span>
        <input value={invite} onChange={e => setInvite(e.target.value)} placeholder="e.g. joseph-3f9a2c" autoComplete="off" />
        <small>{inviter?.valid ? `Invited by ${inviter.inviter || 'a member'} — you will join each other’s network.` : inviter && !inviter.valid ? 'That code is not valid.' : 'Enter the code from the member who invited you.'}</small>
      </label>}

      <form className="auth-form" onSubmit={event => void submit(event)}>
        {mode === 'signup' && <label>
          <span>FULL NAME</span>
          <input value={name} onChange={e => setName(e.target.value)} autoComplete="name" placeholder="Joseph Toney" />
        </label>}
        <label>
          <span>EMAIL</span>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" placeholder="you@company.com" />
        </label>
        <label>
          <span>PASSWORD</span>
          <input type="password" required minLength={mode === 'signin' ? 6 : 12} value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} placeholder={mode === 'signin' ? 'Your password' : 'At least 12 characters, mixed case, number, symbol'} />
        </label>
        {error && <p className="auth-error">{error}</p>}
        {notice && <p className="auth-notice">{notice}</p>}
        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? 'One moment…' : mode === 'signin' ? 'Sign in' : 'Create account'} <ArrowRight size={15} />
        </button>
      </form>

      <button type="button" className="auth-switch" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setNotice('') }}>
        {mode === 'signin' ? 'Have an invite code? Create your account.' : 'Already a member? Sign in.'}
      </button>
      <Link to="/early-access" className="auth-switch">No invite yet? Request whitelist access.</Link>
      <Link to="/demo" className="auth-switch">Not ready to join? Open the demo.</Link>

      <span className="auth-foot"><LockKeyhole size={12} /> Nothing is shared without your explicit opt-in.</span>
    </section>
    <aside className="auth-visual auth-visual-type" aria-label="Ask Intros relationship principles">
      <ConstellationField className="auth-constellation" />
      <span className="auth-visual-mark" aria-hidden="true">+</span>
      <div className="auth-visual-statement" aria-hidden="true">
        <span>PEOPLE</span><i>×</i><span>CONTEXT</span><i>×</i><span>OPPORTUNITY</span>
      </div>
      <div className="portrait-caption">
        <span>ACTIVE MEMORY / 01</span>
        <p>Signed in, every conversation makes the next introduction sharper.</p>
      </div>
    </aside>
  </main>
}
