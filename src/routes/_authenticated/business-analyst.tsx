import { ClientOnly, createFileRoute } from '@tanstack/react-router'

import BusinessAnalystPanel from '@/aetheris/BusinessAnalystPanel'
import '@/aetheris/styles.css'

export const Route = createFileRoute('/_authenticated/business-analyst')({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: 'AI Business Analyst — Ask Intros' },
      { property: 'og:title', content: 'AI Business Analyst — Ask Intros' },
      { property: 'og:description', content: 'Review business context and recommended introductions in your private Ask Intros workspace.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
      {
        name: 'description',
        content: 'Your on-demand AI analyst: strengths, gaps, top platform opportunities, and recommended introductions.',
      },
    ],
  }),
  component: BusinessAnalystRoute,
})

function BusinessAnalystRoute() {
  return (
    <ClientOnly fallback={null}>
      <BusinessAnalystPanel />
    </ClientOnly>
  )
}
