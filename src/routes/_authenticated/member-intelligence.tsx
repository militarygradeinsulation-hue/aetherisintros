import { ClientOnly, createFileRoute } from '@tanstack/react-router'

import { Gate } from './app'

/** Deep link into the shared workspace shell with Member Intelligence
 * selected. The same membership gate as /app applies — no separate layout,
 * no separate access rules. */
export const Route = createFileRoute('/_authenticated/member-intelligence')({
  staticData: { sitemap: false },
  ssr: false,
  head: () => ({ meta: [
    { title: 'Member Intelligence — Ask Intros' },
    { name: 'description', content: 'Private business analysis and your evidence-based reputation score.' },
    { property: 'og:title', content: 'Member Intelligence — Ask Intros' },
    { property: 'og:description', content: 'Private business analysis and your evidence-based reputation score.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
  ] }),
  component: MemberIntelligence,
})

function MemberIntelligence() {
  return <ClientOnly fallback={<p style={{ padding: '2rem', color: '#9EA4AC' }}>Loading member intelligence…</p>}>
    <Gate initialPage="intelligence" />
  </ClientOnly>
}
