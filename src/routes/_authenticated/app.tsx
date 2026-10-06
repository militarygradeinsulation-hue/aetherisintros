import { ClientOnly, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

import IntrosApp from '@/intros-ui/IntrosApp'
import { useAccess } from '@/aetheris/access'
import '@/aetheris/styles.css'

export const Route = createFileRoute('/_authenticated/app')({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: 'Ask Intros — The Relationship Network for CEOs' },
      {
        name: 'description',
        content:
          'The relationship network for CEOs. See who matters, why they matter, and why now.',
      },
      { property: 'og:title', content: 'Ask Intros — The Relationship Network for CEOs' },
      {
        property: 'og:description',
        content: 'Who matters. Why they matter. Why now.',
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
  const { access } = useAccess()
  const navigate = useNavigate()
  const ready = access.status === 'approved' && access.verification === 'verified' && access.onboarded

  useEffect(() => {
    if (access.loading) return
    // Verification decides network access; the database enforces the same rule.
    if (access.verification !== 'verified') void navigate({ to: '/verify', replace: true })
    else if (access.status !== 'approved') void navigate({ to: '/early-access', replace: true })
    else if (!access.onboarded) void navigate({ to: '/onboarding', replace: true })
  }, [access, navigate])

  if (access.loading || !ready) {
    return <main className="access-waiting"><span className="folio">ASK INTROS</span><p>Checking your membership…</p></main>
  }
  return <IntrosApp mode="live" />
}
