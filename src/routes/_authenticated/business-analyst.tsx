import { ClientOnly, createFileRoute } from '@tanstack/react-router'

import BusinessAnalystPanel from '@/aetheris/BusinessAnalystPanel'
import '@/aetheris/styles.css'

export const Route = createFileRoute('/_authenticated/business-analyst')({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: 'AI Business Analyst — Ask Intros' },
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
