import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import { supabase } from '@/integrations/supabase/client'

export const Route = createFileRoute('/passport/$token')({
  head: () => ({
    meta: [
      { title: 'Relationship Passport — Ask Intros' },
      { name: 'description', content: 'A verified executive’s selected Ask Intros profile, shared by explicit choice.' },
      { property: 'og:title', content: 'Relationship Passport — Ask Intros' },
      { property: 'og:description', content: 'A verified executive’s selected Ask Intros profile, shared by explicit choice.' },
      { property: 'og:type', content: 'profile' },
      { name: 'twitter:card', content: 'summary' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: PassportView,
})

type PassportData = Record<string, unknown> & { name?: string; restricted?: boolean }

function PassportView() {
  const { token } = Route.useParams()
  const [data, setData] = useState<PassportData | null | undefined>(undefined)
  useEffect(() => {
    void (supabase as unknown as { rpc: (n: string, a: object) => Promise<{ data: PassportData | null }> })
      .rpc('get_passport', { p_token: token }).then(r => setData(r.data ?? null))
  }, [token])
  const text = (k: string) => (typeof data?.[k] === 'string' && data[k] ? String(data[k]) : '')
  const list = (k: string) => (Array.isArray(data?.[k]) ? (data[k] as unknown[]) : [])
  return <main className="passport-public">
    <p className="passport-kicker">ASK INTROS · RELATIONSHIP PASSPORT</p>
    {data === undefined && <p>Opening passport…</p>}
    {data === null && <><h1>This passport is unavailable.</h1><p>It may have been revoked by its owner.</p></>}
    {data?.restricted && <><h1>Verified members only.</h1><p>Sign in with a verified Ask Intros account to view this passport.</p><Link to="/auth">Sign in</Link></>}
    {data && !data.restricted && <>
      <h1>{data.name}</h1>
      {(text('title') || text('company')) && <p className="passport-role">{[text('title'), text('company')].filter(Boolean).join(' · ')}{text('location') ? ` · ${text('location')}` : ''}</p>}
      {text('verified_business') && <p className="passport-verified">Verified · {text('verified_business')}</p>}
      {([['what_i_do', 'What I do'], ['building', 'Building'], ['looking_for', 'Looking for'], ['can_help_with', 'Can help with'], ['signal', 'Current Signal']] as const).map(([k, l]) => text(k) ? <section key={k}><h2>{l}</h2><p>{text(k)}</p></section> : null)}
      {list('open_to').length > 0 && <section><h2>Open to</h2><p>{list('open_to').join(' · ')}</p></section>}
      {data['scheduling_enabled'] === true && <section><h2>Scheduling</h2><p>Open to scheduling through Ask Intros.</p></section>}
      {list('recommendations').length > 0 && <section><h2>Recommendations</h2>{(list('recommendations') as Array<{ body: string }>).map((r, i) => <blockquote key={i}>{r.body}</blockquote>)}</section>}
      <p className="passport-foot">Shared by explicit choice. No contact details or private records are included.</p>
    </>}
  </main>
}
