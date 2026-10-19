import { ClientOnly, createFileRoute } from '@tanstack/react-router'

import { SyndicationRoomsPanel } from '@/aetheris/SyndicationRoomsPanel'
import '@/aetheris/styles.css'

export const Route = createFileRoute('/_authenticated/syndication')({
  staticData: { sitemap: false },
  ssr: false,
  head: () => ({
    meta: [
      { title: 'Syndication Rooms — Ask Intros' },
      { property: 'og:title', content: 'Syndication Rooms — Ask Intros' },
      { property: 'og:description', content: 'Private rooms for co-investment, co-sponsorship and co-referral decisions with trusted members.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
      {
        name: 'description',
        content: 'Private rooms for co-investment, co-sponsorship, and co-referral decisions with trusted members.',
      },
    ],
  }),
  component: SyndicationRoute,
})

function SyndicationRoute() {
  return (
    <ClientOnly fallback={null}>
      <main style={{ minHeight: '100vh', background: 'var(--night)', paddingTop: '24px' }}>
        <SyndicationRoomsPanel />
      </main>
    </ClientOnly>
  )
}
