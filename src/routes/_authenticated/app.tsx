import { ClientOnly, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

import App from '@/aetheris/App'
import { useAccess } from '@/aetheris/access'
import '@/aetheris/styles.css'

export const Route = createFileRoute('/_authenticated/app')({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: 'Your network — Aetheris Intros' },
      {
        name: 'description',
        content:
          'The Aetheris Intros network: real members, active memory, trusted paths, double opt-in introductions and the needs your network can actually move.',
      },
      { property: 'og:title', content: 'Your network — Aetheris Intros' },
      {
        property: 'og:description',
        content: 'Know who matters, why the relationship makes sense, why now, and the smartest next action.',
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

  useEffect(() => {
    if (access.loading) return
    if (access.status !== 'approved') void navigate({ to: '/early-access', replace: true })
    else if (!access.onboarded) void navigate({ to: '/onboarding', replace: true })
  }, [access, navigate])

  if (access.loading || access.status !== 'approved' || !access.onboarded) {
    return <main className="access-waiting"><span className="folio">AETHERIS INTROS</span><p>Checking your membership…</p></main>
  }
  return <App mode="live" />
}
