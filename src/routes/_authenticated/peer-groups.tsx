import { ClientOnly, createFileRoute } from '@tanstack/react-router'

import { PeerGroupsPanel } from '@/aetheris/PeerGroupsPanel'
import '@/aetheris/styles.css'

export const Route = createFileRoute('/_authenticated/peer-groups')({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: 'Peer Groups — Ask Intros' },
      { property: 'og:title', content: 'Peer Groups — Ask Intros' },
      { property: 'og:description', content: 'Confidential peer conversations, session agendas and commitments for CEOs and founders.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
      {
        name: 'description',
        content: 'AI-facilitated peer cohorts for CEOs and founders. Session agendas, commitment tracking, and confidential discussion.',
      },
    ],
  }),
  component: PeerGroupsRoute,
})

function PeerGroupsRoute() {
  return <ClientOnly fallback={null}><PeerGroupsPanel /></ClientOnly>
}
