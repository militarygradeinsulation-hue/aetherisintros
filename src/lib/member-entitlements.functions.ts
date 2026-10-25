import { createServerFn } from '@tanstack/react-start'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { parseEntitlements } from '@/aetheris/member-entitlements'

export const getMyMemberEntitlements = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as unknown as {
      rpc: (name: string) => Promise<{ data: unknown; error: { message: string } | null }>
    }).rpc('my_member_entitlements')
    if (error) throw new Error('Membership permissions are unavailable. Please retry.')
    return parseEntitlements(data)
  })