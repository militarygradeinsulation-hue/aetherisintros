import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowRight, LockKeyhole } from 'lucide-react'
import { useEffect, useState } from 'react'

import { supabase } from '@/integrations/supabase/client'
import { lovable } from '@/integrations/lovable/index'
import authPortrait from '@/assets/portraits/portrait-26.jpg.asset.json'
import '@/aetheris/styles.css'

export const Route = createFileRoute('/auth')({
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
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let cancelled = false
    void supabase.auth.getSession().then(({ data }) => {
      if (!cancelled && data.session) void navigate({ to: '/app', replace: true })
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        void navigate({ to: '/app', replace: true })
      }
    })
    return () => { cancelled = true; sub.subscription.unsubscribe() }
  }, [navigate])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true); setError(''); setNotice('')
    try {
      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/app`,
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
    const result = await lovable.auth.signInWithOAuth('google', { redirect_uri: window.location.origin })
    if (result.error) {
      setError('Google sign-in could not start. Try email instead.')
      setBusy(false)
      return
    }
    if (result.redirected) return
    void navigate({ to: '/app', replace: true })
  }

  return <main className="auth-page">
    <section className="auth-panel">
      <Link to="/" className="auth-brand">
        <span className="brand-monogram">AI</span>
        <span className="brand-name">Aetheris<em>Intros</em></span>
      </Link>
      <span className="folio">MEMBER ACCESS / 2026</span>
      <h1>{mode === 'signin' ? <>Welcome<br /><em>back.</em></> : <>Join the<br /><em>network.</em></>}</h1>
      <p className="auth-lede">
        Your introductions, active memory and preferences stay with your account — private,
        permissioned and available on any device.
      </p>

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
      <div className="portrait-caption">
        <span>ACTIVE MEMORY / 01</span>
        <p>Signed in, every conversation makes the next introduction sharper.</p>
      </div>
    </aside>
  </main>
}
