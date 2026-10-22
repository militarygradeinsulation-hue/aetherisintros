import { ClientOnly, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import IntrosApp from '@/intros-ui/IntrosApp'
import type { ActivePage } from '@/intros-ui/components/layout/TopNavigation'
import { AetherisProviderRoot } from '@/aetheris/AetherisProviderRoot'
import { useAccess, isLiveMember } from '@/aetheris/access'
import { supabase } from '@/integrations/supabase/client'
import { ExecutiveUpgrade } from '@/aetheris/ExecutiveUpgrade'
import { ConnectionBanner } from '@/aetheris/ConnectionBanner'
import { WelcomeDiagnosticBanner } from '@/aetheris/WelcomeDiagnosticBanner'
import '@/aetheris/executive-upgrade.css'
import '@/aetheris/styles.css'

const entryPages: ActivePage[] = ['home', 'people', 'intros', 'messages', 'insights', 'meetings', 'specter', 'intelligence']

export const Route = createFileRoute('/_authenticated/app')({
  validateSearch: (search: Record<string, unknown>): { view?: ActivePage } => {
    const view = search['view']
    return typeof view === 'string' && entryPages.includes(view as ActivePage)
      ? { view: view as ActivePage }
      : {}
  },
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: 'Your Network — Ask Intros' },
      {
        name: 'description',
        content:
          'The relationship network for CEOs. See who matters, why they matter, and why now.',
      },
      { property: 'og:title', content: 'Your Network — Ask Intros' },
      {
        property: 'og:description',
        content: 'Your private member network, conversations and introduction opportunities.',
      },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  component: AppRoute,
})

/** Only an approved, onboarded Founding Member reaches the live network. */
function AppRoute() {
  const { view } = Route.useSearch()
  return <ClientOnly fallback={null}><Gate initialPage={view} /></ClientOnly>
}

/** Shared live-workspace gate: full membership checks, then the persistent
 * shell. Deep links such as /member-intelligence reuse it with an initial
 * page instead of mounting a separate full-screen layout. */
export function Gate({ initialPage }: { initialPage?: ActivePage | undefined }) {
  const { access, refresh } = useAccess()
  const navigate = useNavigate()
  const ready = isLiveMember(access)
  // The Executive dialog is opened from the workspace sidebar, not a floating
  // bubble, so it never overlaps the Butler launcher.
  const [executiveOpen, setExecutiveOpen] = useState(false)

  useEffect(() => {
    if (access.loading || access.error) return
    // Approval and onboarding grant network access; business-role badges are separate.
    if (!access.signedIn) void navigate({ to: '/auth', replace: true })
    else if (access.status !== 'approved') void navigate({ to: '/early-access', replace: true })
    else if (!access.onboarded) {
      // Approved but not onboarded: confirmed members go to onboarding; everyone
      // else (unconfirmed email, restricted verification) goes to /early-access,
      // which explains the next step instead of hanging on "Checking your membership…".
      if (access.emailConfirmed && access.verification !== 'rejected' && access.verification !== 'suspended') void navigate({ to: '/onboarding', replace: true })
      else void navigate({ to: '/early-access', replace: true })
    }
  }, [access, navigate])

  if (access.error) {
    return <main className="access-waiting" role="alert">
      <span className="folio">ASK INTROS / CONNECTION ISSUE</span>
      <p>{access.error}</p>
      <button className="btn secondary" type="button" onClick={() => { void refresh() }}>Retry membership check</button>
    </main>
  }
  if (!access.loading && access.signedIn && access.status === 'approved' && access.onboarded && !ready) {
    const accountRestricted = access.verification === 'rejected' || access.verification === 'suspended'
    return <main className="access-waiting" role="alert">
      <span className="folio">ASK INTROS / MEMBER ACCESS</span>
      <p>{accountRestricted
        ? 'Your membership has an unresolved restriction. Please contact Ask Intros support.'
        : 'Confirm the email address associated with your account to activate live networking.'}</p>
      <button className="btn secondary" type="button" onClick={() => {
        void supabase.auth.signOut().then(() => { window.location.assign('/auth') })
      }}>Sign out</button>
    </main>
  }
  if (access.loading || !ready) {
    return <main className="access-waiting"><span className="folio">ASK INTROS</span><p>Checking your membership…</p></main>
  }
  // Executive non-admin members have nothing to apply for or review: no action.
  const executiveAction = access.tier === 'executive' && !access.isAdmin ? undefined : {
    label: access.isAdmin ? 'Executive applications' : 'Executive access',
    onOpen: () => setExecutiveOpen(true),
  }
  return <AetherisProviderRoot mode="live"><ConnectionBanner /><WelcomeDiagnosticBanner /><IntrosApp mode="live" executiveAction={executiveAction} initialPage={initialPage} /><ExecutiveUpgrade tier={access.tier} isAdmin={access.isAdmin} open={executiveOpen} onOpenChange={setExecutiveOpen} hideTrigger /></AetherisProviderRoot>
}
