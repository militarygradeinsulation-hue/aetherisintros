import { createFileRoute } from '@tanstack/react-router'
import { WarmReferralPanel } from '@/aetheris/WarmReferralPanel'

export const Route = createFileRoute('/warm-referrals')({
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
  return <WarmReferralPanel />
}
