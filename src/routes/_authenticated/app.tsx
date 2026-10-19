import { ClientOnly, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

import IntrosApp from '@/intros-ui/IntrosApp'
import { AetherisProviderRoot } from '@/aetheris/AetherisProviderRoot'
import { useAccess, isLiveMember } from '@/aetheris/access'
import { supabase } from '@/integrations/supabase/client'
import { ExecutiveUpgrade } from '@/aetheris/ExecutiveUpgrade'
import '@/aetheris/executive-upgrade.css'
import '@/aetheris/styles.css'

export const Route = createFileRoute('/_authenticated/app')({
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
  return <ClientOnly fallback={null}><Gate /></ClientOnly>
}

function Gate() {
  const { access, refresh } = useAccess()
  const navigate = useNavigate()
  const ready = isLiveMember(access)

  useEffect(() => {
    if (access.loading || access.error) return
    // Approval and onboarding grant network access; business-role badges are separate.
    if (!access.signedIn) void navigate({ to: '/auth', replace: true })
    else if (access.status !== 'approved') void navigate({ to: '/early-access', replace: true })
    else if (access.emailConfirmed && access.verification !== 'rejected' && access.verification !== 'suspended' && !access.onboarded) void navigate({ to: '/onboarding', replace: true })
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
  return <AetherisProviderRoot mode="live"><IntrosApp mode="live" /><ExecutiveUpgrade tier={access.tier} isAdmin={access.isAdmin} /></AetherisProviderRoot>
}
