import { ClientOnly, createFileRoute, redirect } from '@tanstack/react-router'

import { SyndicationRoomsPanel } from '@/aetheris/SyndicationRoomsPanel'

export const Route = createFileRoute('/syndication')({
  staticData: { sitemap: false },
  beforeLoad: async ({ context }) => {
    const { supabase } = context as { supabase: { auth: { getUser: () => Promise<{ data: { user: unknown } }> } } }
    const { data } = await supabase.auth.getUser()
    if (!data?.user) throw redirect({ to: '/auth' })
  },
  head: () => ({
    meta: [
      { title: 'Syndication Rooms — Ask Intros' },
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
