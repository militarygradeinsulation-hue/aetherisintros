import { ClientOnly, createFileRoute } from '@tanstack/react-router'

import { WarmReferralPanel } from '@/aetheris/WarmReferralPanel'
import '@/aetheris/styles.css'

export const Route = createFileRoute('/_authenticated/warm-referrals')({
  staticData: { sitemap: false },
  ssr: false,
  head: () => ({
    meta: [
      { title: 'Warm Referral Paths — Ask Intros' },
      {
        name: 'description',
        content: 'AI-surfaced warm intro paths through people you already trust. One click to ask your connector for an introduction.',
      },
    ],
  }),
  component: WarmReferralsRoute,
})

function WarmReferralsRoute() {
  return (
    <ClientOnly fallback={null}>
      <WarmReferralPanel />
    </ClientOnly>
  )
}
