import { ClientOnly, createFileRoute, redirect } from '@tanstack/react-router'

import { supabase } from '@/integrations/supabase/client'
import { TrackRecordDashboard } from '@/aetheris/TrackRecordDashboard'
import '@/aetheris/styles.css'

export const Route = createFileRoute('/track-record')({
  staticData: { sitemap: false },
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) throw redirect({ to: '/auth' })
    return { user: data.user }
  },
  head: () => ({
    meta: [
      { title: 'Track Record — Ask Intros' },
      {
        name: 'description',
        content: 'Your reputation score, introduction success rate, and follow-through metrics.',
      },
    ],
  }),
  component: TrackRecordRoute,
})

function TrackRecordRoute() {
  const { user } = Route.useRouteContext()
  if (!user) return null

  return (
    <ClientOnly fallback={null}>
      <div style={{ maxWidth: 560, margin: '3rem auto', padding: '0 1rem' }}>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(22px,3vw,30px)', marginBottom: '1.5rem', color: 'var(--soft)' }}>
          Your Track Record
        </h1>
        <TrackRecordDashboard userId={user.id} />
      </div>
    </ClientOnly>
  )
}
