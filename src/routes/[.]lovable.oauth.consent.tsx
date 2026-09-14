import logoAsset from '@/assets/aetheris-logo.jpg.asset.json'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { LockKeyhole } from 'lucide-react'

import { supabase } from '@/integrations/supabase/client'
import '@/aetheris/styles.css'

type AuthorizationDetails = {
  client?: { name?: string | null } | null
  redirect_url?: string | null
  redirect_to?: string | null
}

type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>
  approveAuthorization: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>
  denyAuthorization: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>
}

const oauth = () => (supabase.auth as unknown as { oauth: OAuthApi }).oauth

export const Route = createFileRoute('/.lovable/oauth/consent')({
  staticData: { sitemap: false },
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s['authorization_id'] === 'string' ? (s['authorization_id'] as string) : '',
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error('Missing authorization_id')
    const { data } = await supabase.auth.getSession()
    const next = location.pathname + location.searchStr
    if (!data.session) throw redirect({ to: '/auth', search: { next } })
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get('authorization_id')!
    const { data, error } = await oauth().getAuthorizationDetails(authorizationId)
    if (error) throw new Error(error.message)
    const immediate = data?.redirect_url ?? data?.redirect_to
    if (immediate && !data?.client) throw redirect({ href: immediate })
    return data
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="consent-page">
      <section className="consent-panel">
        <h1>Something went wrong</h1>
        <p className="consent-lede">
          This authorization request could not be loaded: {String((error as Error)?.message ?? error)}
        </p>
      </section>
    </main>
  ),
})

function Consent() {
  const details = Route.useLoaderData()
  const { authorization_id } = Route.useSearch()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const client = details?.client?.name ?? 'this app'

  async function decide(approve: boolean) {
    setBusy(true)
    setError(null)
    const { data, error: failure } = approve
      ? await oauth().approveAuthorization(authorization_id)
      : await oauth().denyAuthorization(authorization_id)
    if (failure) { setBusy(false); setError(failure.message); return }
    const target = data?.redirect_url ?? data?.redirect_to
    if (!target) { setBusy(false); setError('No redirect returned by the authorization server.'); return }
    window.location.href = target
  }

  return <main className="consent-page">
    <section className="consent-panel">
      <img className="brand-logo" src={logoAsset.url} alt="Aetheris Intros logo" />
      <span className="folio">AGENT ACCESS / PERMISSIONED</span>
      <h1>Connect <em>{client}</em> to your account</h1>
      <p className="consent-lede">
        {client} will act as you inside Aetheris Intros: read your profile and Active Memory,
        search the network, read and post asks, and request double opt-in introductions on your
        behalf. It never sees other members&rsquo; private context, and no introduction happens
        unless both sides opt in.
      </p>
      <ul className="consent-scope">
        <li>Your profile, asks and Active Memory</li>
        <li>Network search with match reasoning</li>
        <li>Introduction requests — always double opt-in</li>
      </ul>
      {error && <p className="auth-error" role="alert">{error}</p>}
      <div className="consent-actions">
        <button className="btn primary" type="button" disabled={busy} onClick={() => void decide(true)}>
          {busy ? 'One moment…' : 'Approve'}
        </button>
        <button className="btn" type="button" disabled={busy} onClick={() => void decide(false)}>
          Deny
        </button>
      </div>
      <span className="auth-foot"><LockKeyhole size={12} /> You can revoke this access at any time.</span>
    </section>
  </main>
}
