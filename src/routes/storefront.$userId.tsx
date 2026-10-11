import { createFileRoute } from '@tanstack/react-router'

import { StorefrontPanel } from '@/aetheris/StorefrontPanel'
import '@/aetheris/styles.css'

export const Route = createFileRoute('/storefront/$userId')({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: 'Member Storefront — Ask Intros' },
      { name: 'description', content: "View a member's services, what they seek, and send a structured proposal." },
      { property: 'og:title', content: 'Member Storefront — Ask Intros' },
      { property: 'og:description', content: 'Services, partnership interests and proposal intake for an Ask Intros member.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: StorefrontPage,
})

function StorefrontPage() {
  const { userId } = Route.useParams()
  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 16px' }}>
      <StorefrontPanel userId={userId} />
    </main>
  )
}
