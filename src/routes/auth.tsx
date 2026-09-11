import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router'
import { ArrowRight, LockKeyhole } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { supabase } from '@/integrations/supabase/client'
import { lovable } from '@/integrations/lovable/index'
import { AUTH_REQUIRED } from '@/aetheris/config'
import authPortrait from '@/assets/portraits/portrait-26.jpg.asset.json'
import '@/aetheris/styles.css'

const safeNext = (value: unknown) => {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return ''
  return value
}

export const Route = createFileRoute('/auth')({
  validateSearch: (search: Record<string, unknown>): { next?: string } => {
    const next = safeNext(search['next'])
    return next ? { next } : {}
  },
  beforeLoad: ({ search }) => {
    // A pending agent-integration consent flow always needs the sign-in screen.
    if (!AUTH_REQUIRED && !search.next) throw redirect({ to: '/app' })
  },
  head: () => ({
    meta: [
      { title: 'Sign in — Aetheris Intros' },
      {
        name: 'description',
        content:
          'Sign in to Aetheris Intros to keep your introductions, active memory and relationship preferences between sessions.',
      },
      { property: 'og:title', content: 'Sign in — Aetheris Intros' },
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
  const { next } = Route.useSearch()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const land = useCallback(() => {
    if (next) { window.location.replace(next); return }
    void navigate({ to: '/early-access', replace: true })
  }, [navigate, next])

  useEffect(() => {
    let cancelled = false
    void supabase.auth.getSession().then(({ data }) => {
      if (!cancelled && data.session) land()
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) land()
    })
    return () => { cancelled = true; sub.subscription.unsubscribe() }
  }, [land])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true); setError(''); setNotice('')
    try {
      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${next || '/early-access'}`,
            data: { name: name || email.split('@')[0] },
          },
        })
        if (signUpError) throw signUpError
        if (!data.session) {
          setNotice('Check your email to confirm the address, then sign in.')
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
    const result = await lovable.auth.signInWithOAuth('google', {
      redirect_uri: `${window.location.origin}${next || '/early-access'}`,
    })
    if (result.error) {
      setError('Google sign-in could not start. Try email instead.')
      setBusy(false)
      return
    }
    if (result.redirected) return
    land()
  }

  return <main className="auth-page">
    <section className="auth-panel">
      <Link to="/" className="auth-brand">
        <span className="brand-monogram">AI</span>
        <span className="brand-name">Aetheris<em>Intros</em></span>
      </Link>
      <div className="auth-index"><span className="folio">MEMBER ACCESS / 2026</span><span>01 / PRIVATE NETWORK</span></div>
      <h1>{mode === 'signin' ? <>Welcome<br /><em>back.</em></> : <>Join the<br /><em>network.</em></>}</h1>
      <p className="auth-lede">
        Your introductions, active memory and preferences stay with your account — private,
        permissioned and available on any device.
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
          <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} placeholder="At least 6 characters" />
        </label>
        {error && <p className="auth-error">{error}</p>}
        {notice && <p className="auth-notice">{notice}</p>}
        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? 'One moment…' : mode === 'signin' ? 'Sign in' : 'Create account'} <ArrowRight size={15} />
        </button>
      </form>

      <button className="auth-switch" type="button" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError('') }}>
        {mode === 'signin' ? 'No account yet? Create one.' : 'Already a member? Sign in.'}
      </button>
      <span className="auth-foot"><LockKeyhole size={12} /> Nothing is shared without your explicit opt-in.</span>
    </section>
    <aside className="auth-visual">
      <img src={authPortrait.url} alt="A composed professional in architectural window light" width={1280} height={1600} />
      <span className="auth-visual-mark" aria-hidden="true">+</span>
      <div className="portrait-caption">
        <span>ACTIVE MEMORY / 01</span>
        <p>Signed in, every conversation makes the next introduction sharper.</p>
      </div>
    </aside>
  </main>
}
