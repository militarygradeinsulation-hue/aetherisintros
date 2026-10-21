import { createFileRoute, redirect } from '@tanstack/react-router'
import { AUTH_REQUIRED } from '@/aetheris/config'
import { supabase } from '@/integrations/supabase/client'
import { SpecterDetectPanel } from '@/features/specter-detect/SpecterDetectPanel'

export const Route = createFileRoute('/specter-detect')({
  staticData: { sitemap: false },
  ssr: false,
  beforeLoad: async () => {
    if (!AUTH_REQUIRED) return
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) throw redirect({ to: '/auth' })
  },
  component: () => <main className="min-h-screen bg-background px-4 py-12"><SpecterDetectPanel /></main>,
})
