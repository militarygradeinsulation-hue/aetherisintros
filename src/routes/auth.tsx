import logoAsset from '@/assets/aetheris-logo.jpg.asset.json'
import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router'
import { ArrowRight, LockKeyhole } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import gsap from 'gsap'

import { supabase } from '@/integrations/supabase/client'
import { lovable } from '@/integrations/lovable/index'
import { AUTH_REQUIRED } from '@/aetheris/config'
import { safeAuthNext } from '@/aetheris/auth-next'
import { previewInvite, rememberInvite, storedInvite } from '@/aetheris/access'
import { logSecurityEvent, passwordProblem } from '@/aetheris/verification'
import { AppearanceToggle } from '@/aetheris/AppearanceToggle'
import { startLinkedInAuthentication } from '@/aetheris/linkedin-auth'
import { checkLinkedInReadiness, type ProviderReadiness } from '@/aetheris/auth-provider-readiness'
import '@/aetheris/styles.css'

export const Route = createFileRoute('/auth')({
  staticData: { sitemap: false },
  validateSearch: (search: Record<string, unknown>): { next?: string; invite?: string; mode?: 'signup' | 'recovery' } => {
    const next = safeAuthNext(search['next'])
    const invite = typeof search['invite'] === 'string' ? search['invite'].slice(0, 64) : ''
    return { ...(next ? { next } : {}), ...(invite ? { invite } : {}), ...(search['mode'] === 'signup' || search['mode'] === 'recovery' ? { mode: search['mode'] as 'signup' | 'recovery' } : {}) }
  },
  beforeLoad: ({ search }) => {
    // A pending agent-integration consent flow always needs the sign-in screen.
    if (!AUTH_REQUIRED && !search.next && !search.invite && !search.mode) throw redirect({ to: '/app' })
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
      { property: 'og:url', content: 'https://askintros.vip/auth' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  component: AuthPage,
})

function AuthPage() {
  const [linkedInStatus, setLinkedInStatus] = useState<ProviderReadiness>('unverified')
  useEffect(() => {
    const controller = new AbortController()
    void checkLinkedInReadiness(controller.signal).then(status => { if (!controller.signal.aborted) setLinkedInStatus(status) })
    return () => controller.abort()
  }, [])
  const visualRef = useRef<HTMLElement>(null)
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => { setHydrated(true) }, [])

  // Layered parallax on the visual panel: each [data-parallax-layer] drifts at
  // its own depth with the pointer and page scroll (gsap, no scroll hijacking).
  useEffect(() => {
    const panel = visualRef.current
    if (!panel || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const layers = Array.from(panel.querySelectorAll<HTMLElement>('[data-parallax-layer]'))
    if (!layers.length) return
    const setters = layers.map(el => ({
      depth: Number(el.dataset['parallaxLayer']) || 1,
      x: gsap.quickTo(el, 'x', { duration: 0.9, ease: 'power3.out' }),
      y: gsap.quickTo(el, 'y', { duration: 0.9, ease: 'power3.out' }),
    }))
    const onMove = (event: MouseEvent) => {
      const rect = panel.getBoundingClientRect()
      const nx = (event.clientX - rect.left) / rect.width - 0.5
      const ny = (event.clientY - rect.top) / rect.height - 0.5
      for (const s of setters) { s.x(nx * s.depth * -14); s.y(ny * s.depth * -10) }
    }
    const onScroll = () => {
      const drift = Math.min(Math.max(window.scrollY, 0), 400)
      for (const s of setters) s.y(drift * s.depth * 0.12)
    }
    panel.addEventListener('mousemove', onMove)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      panel.removeEventListener('mousemove', onMove)
      window.removeEventListener('scroll', onScroll)
      gsap.killTweensOf(layers)
    }
  }, [])

  const navigate = useNavigate()
  const { next, invite: inviteParam, mode: requestedMode } = Route.useSearch()
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot' | 'reset'>(requestedMode === 'recovery' ? 'reset' : inviteParam || requestedMode === 'signup' ? 'signup' : 'signin')
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
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const land = useCallback(async () => {
    // fetchAccess() claims membership only after confirmed email, and preserves
    // invite codes until approval. Never claim or clear an invite here.
    if (next) { window.location.replace(next); return }
    void navigate({ to: '/early-access', replace: true })
  }, [navigate, next])

  useEffect(() => {
    let cancelled = false
    void supabase.auth.getSession().then(({ data }) => {
      if (!cancelled && data.session && mode !== 'reset' && mode !== 'forgot') void land()
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // Supabase authenticates the reset token first. Never redirect away
        // from this screen before the member has chosen a new password.
        setMode('reset')
        return
      }
      if (session && mode !== 'reset' && mode !== 'forgot' &&
          (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        setTimeout(() => {
          if (cancelled) return
          if (event === 'SIGNED_IN') void logSecurityEvent('signed_in', 'Signed in to Ask Intros.')
          void land()
        }, 0)
      }
    })
    return () => { cancelled = true; sub.subscription.unsubscribe() }
  }, [land, mode])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true); setError(''); setNotice('')
    try {
      if (mode === 'forgot') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/auth?mode=recovery`,
        })
        if (resetError) throw resetError
        // Avoid disclosing which addresses have accounts.
        setNotice('If an account exists for that email, you will receive a password reset link. Check your inbox and spam folder.')
        return
      }
      if (mode === 'reset') {
        const weak = passwordProblem(password)
        if (weak) throw new Error(weak)
        if (password !== confirmPassword) throw new Error('The new passwords do not match.')
        const { error: updateError } = await supabase.auth.updateUser({ password })
        if (updateError) throw updateError
        setPassword(''); setConfirmPassword('')
        // Re-enter the same membership gate after a successful password reset.
        window.location.replace(next || '/app')
        return
      }
      rememberInvite(invite)
      if (mode === 'signup') {
        // Membership RPCs enforce launch mode and whitelist eligibility after sign-in.
        if (invite.trim() && inviter && !inviter.valid) throw new Error('That invite code is not valid. Check it with the person who sent it.')
        const weak = passwordProblem(password)
        if (weak) throw new Error(weak)
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${next || '/early-access'}`,
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
    try {
      const result = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: `${window.location.origin}${next || '/early-access'}`,
      })
      if (result.error) throw new Error('Google sign-in could not start. Try email instead.')
      if (result.redirected) return
      await land()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Google sign-in could not start. Try email instead.')
    } finally {
      setBusy(false)
    }
  }

  const linkedin = async () => {
    if (busy) return
    setBusy(true); setError(''); setNotice('')
    rememberInvite(invite)
    try {
      await startLinkedInAuthentication('signin', `${window.location.origin}${next || '/early-access'}`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'LinkedIn sign-in could not start. Try email instead.')
    } finally { setBusy(false) }
  }

  return <main className="auth-page" data-hydrated={hydrated ? "true" : "false"}>
    <section className="auth-panel">
      <AppearanceToggle className="auth-appearance" />
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
            <span><i aria-hidden="true" />MEMBER SIGNUP</span>
            <p>Create a free Basic account, confirm your email, and complete your profile. C-suite members can apply for reviewed Executive access after joining.</p>
            <div className="auth-soon-actions">
              <Link to="/demo">Explore the demo <ArrowRight size={13} /></Link>
              <Link to="/early-access">Explore Executive access <ArrowRight size={13} /></Link>
            </div>
          </div>}
      <h1>{mode === 'signin' ? <>Welcome<br /><em>back.</em></> : mode === 'signup' ? <>Join the<br /><em>network.</em></> : mode === 'forgot' ? <>Recover your<br /><em>account.</em></> : <>Set a new<br /><em>password.</em></>}</h1>
      <p className="auth-lede">
        {mode === 'forgot'
          ? 'Enter your account email to request a password reset. If the address is registered, you will receive a secure link.'
          : mode === 'reset'
            ? 'Choose a strong new password using the secure link from your email. Your member profile and network will be preserved.'
            : 'Build your professional network with meaningful introductions and double opt-in consent. Verified business-role badges require proof; your context stays private and permissioned.'}
      </p>

      <div className="auth-proof" aria-label="Member access principles">
        <span><b>01</b> Private by default</span>
        <span><b>02</b> Double opt-in</span>
        <span><b>03</b> Your memory, controlled</span>
      </div>


      {(mode === 'signin' || mode === 'signup') && <>
        <button className="btn google" type="button" onClick={() => void google()} disabled={busy}>
          Continue with Google
        </button>
        <button className="btn google" type="button" onClick={() => void linkedin()} disabled={busy || linkedInStatus === 'disabled'} aria-describedby={linkedInStatus === 'disabled' ? 'linkedin-unavailable' : undefined}>
          Continue with LinkedIn
        </button>
        {linkedInStatus === 'disabled' && <p id="linkedin-unavailable" className="auth-notice">LinkedIn sign-in is not enabled yet. Use Google or email to access your account.</p>}
        <div className="auth-divider"><span>or use email</span></div>
      </>}

      {mode === 'signup' && <label className="auth-invite">
        <span>INVITE CODE (IF YOU HAVE ONE)</span>
        <input value={invite} onChange={e => setInvite(e.target.value)} placeholder="e.g. joseph-3f9a2c" autoComplete="off" />
        <small>{inviter?.valid ? `Invited by ${inviter.inviter || 'a member'} — you will join each other’s network.` : inviter && !inviter.valid ? 'That code is not valid.' : 'Have an invitation? Enter it to connect with the member who invited you.'}</small>
      </label>}

      <form className="auth-form" onSubmit={event => void submit(event)}>
        {mode === 'signup' && <label>
          <span>FULL NAME</span>
          <input value={name} onChange={e => setName(e.target.value)} autoComplete="name" placeholder="Joseph Toney" />
        </label>}
        {mode !== 'reset' && <label>
          <span>EMAIL</span>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" placeholder="you@company.com" />
        </label>}
        {mode !== 'forgot' && <label>
          <span>{mode === 'reset' ? 'NEW PASSWORD' : 'PASSWORD'}</span>
          <input type="password" required minLength={mode === 'signin' ? 6 : 12} value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} placeholder={mode === 'signin' ? 'Your password' : 'At least 12 characters, mixed case, number, symbol'} />
        </label>}
        {mode === 'reset' && <label>
          <span>CONFIRM NEW PASSWORD</span>
          <input type="password" required minLength={12} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} autoComplete="new-password" placeholder="Re-enter your new password" />
        </label>}
        {error && <p className="auth-error">{error}</p>}
        {notice && <p className="auth-notice">{notice}</p>}
        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? 'One moment…' : mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : mode === 'forgot' ? 'Send reset link' : 'Update password'} <ArrowRight size={15} />
        </button>
      </form>

      {mode === 'signin' && <button type="button" className="auth-switch" onClick={() => { setMode('forgot'); setError(''); setNotice('') }}>
        Forgot your password?
      </button>}
      <button type="button" className="auth-switch" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setNotice(''); setPassword(''); setConfirmPassword('') }}>
        {mode === 'signin' ? 'New to Ask Intros? Create your account.' : 'Back to sign in'}
      </button>
      {mode === 'reset' && <button type="button" className="auth-switch" onClick={() => { setMode('forgot'); setError(''); setNotice('') }}>Request a new reset link</button>}
      <Link to="/early-access" className="auth-switch">Want Executive access? Start with Basic.</Link>
      <Link to="/demo" className="auth-switch">Not ready to join? Open the demo.</Link>

      <span className="auth-foot"><LockKeyhole size={12} /> Nothing is shared without your explicit opt-in.</span>
    </section>
    <aside ref={visualRef} className="auth-visual auth-visual-type" aria-label="Ask Intros relationship principles">
      <div className="auth-parallax-ring" data-parallax-layer="4" aria-hidden="true" />
      <div className="auth-parallax-ring auth-parallax-ring--inner" data-parallax-layer="3" aria-hidden="true" />
      <span className="auth-visual-mark" data-parallax-layer="2" aria-hidden="true">+</span>
      <div className="auth-visual-statement" data-parallax-layer="3" aria-hidden="true">
        <span>PEOPLE</span><i>×</i><span>CONTEXT</span><i>×</i><span>OPPORTUNITY</span>
      </div>
      <div className="portrait-caption" data-parallax-layer="2">
        <span>ACTIVE MEMORY / 01</span>
        <p>Signed in, every conversation makes the next introduction sharper.</p>
      </div>
    </aside>
  </main>
}
