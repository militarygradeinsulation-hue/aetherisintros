import { createServerFn } from '@tanstack/react-start'
import { requireAuthContract } from './auth-gate'

export const createReferral = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .validator((data: { referredId: string; referredToId: string; personalNote: string; sourceDealRoomId?: string }) => data)
  .handler(async ({ data, context }) => {
    const db = (context as any).supabase
    const { data: row, error } = await db.rpc('create_referral', {
      p_referred_id: data.referredId,
      p_referred_to_id: data.referredToId,
      p_personal_note: data.personalNote,
      p_source_deal_room_id: data.sourceDealRoomId ?? null
    })
    if (error) throw new Error(error.message)
    return row
  })

export const getMyReferrals = createServerFn({ method: 'GET' })
  .middleware([requireAuthContract])
  .handler(async ({ context }) => {
    const db = (context as any).supabase
    const { data } = await db.rpc('get_my_referrals')
    return (data ?? []) as Array<{
      id: string
      referred_name: string
      referred_to_name: string
      personal_note: string
      status: string
      created_at: string
      connected_at: string | null
    }>
  })

export const markReferralConnected = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .validator((data: { referralId: string }) => data)
  .handler(async ({ data, context }) => {
    const db = (context as any).supabase
    await db.rpc('mark_referral_connected', { p_referral_id: data.referralId })
  })
