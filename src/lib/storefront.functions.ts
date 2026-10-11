import { createServerFn } from '@tanstack/react-start'
import { requireAuthContract } from './auth-gate'

export interface StorefrontService {
  id?: string
  title: string
  price?: number
  scope?: string
}

export interface IntakeQuestion {
  id: string
  label: string
  required?: boolean
}

export interface Storefront {
  id: string
  user_id: string
  headline: string | null
  services: StorefrontService[]
  seeking: string[]
  ideal_client: string | null
  intake_questions: IntakeQuestion[]
  is_public: boolean
  created_at: string
  updated_at: string
}

export interface Proposal {
  id: string
  from_user_id: string
  to_user_id: string
  storefront_id: string | null
  subject: string
  message: string
  answers: Record<string, string>
  status: 'sent' | 'viewed' | 'accepted' | 'declined' | 'countered'
  counter_message: string | null
  viewed_at: string | null
  responded_at: string | null
  created_at: string
}

export interface UpsertStorefrontInput {
  headline?: string
  services?: StorefrontService[]
  seeking?: string[]
  ideal_client?: string
  intake_questions?: IntakeQuestion[]
  is_public?: boolean
}

export interface SendProposalInput {
  toUserId: string
  subject: string
  message: string
  answers?: Record<string, string>
  storefrontId?: string
}

export interface RespondToProposalInput {
  proposalId: string
  status: 'accepted' | 'declined' | 'countered'
  counterMessage?: string
}

/** GET — public, returns any user's storefront (if is_public or own). */
export const getStorefront = createServerFn({ method: 'GET' })
  .validator((data: { userId: string }) => data)
  .handler(async ({ data, context }): Promise<Storefront | null> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = (context as any).supabase as any
    const { data: row, error } = await db
      .from('member_storefronts')
      .select('*')
      .eq('user_id', data.userId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return row ?? null
  })

/** POST — authenticated, upserts the authenticated user's own storefront. */
export const upsertStorefront = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .validator((data: UpsertStorefrontInput) => data)
  .handler(async ({ data, context }): Promise<Storefront> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = (context as any).supabase as any
    const { data: row, error } = await db
      .from('member_storefronts')
      .upsert(
        {
          user_id: (context as any).userId,
          ...(data.headline !== undefined && { headline: data.headline }),
          ...(data.services !== undefined && { services: data.services }),
          ...(data.seeking !== undefined && { seeking: data.seeking }),
          ...(data.ideal_client !== undefined && { ideal_client: data.ideal_client }),
          ...(data.intake_questions !== undefined && { intake_questions: data.intake_questions }),
          ...(data.is_public !== undefined && { is_public: data.is_public }),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single()
    if (error) throw new Error(error.message)
    return row
  })

/** POST — authenticated, sends a structured proposal to another member. */
export const sendProposal = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .validator((data: SendProposalInput) => data)
  .handler(async ({ data, context }): Promise<Proposal> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = (context as any).supabase as any
    const userId = (context as any).userId
    if (data.toUserId === userId) throw new Error('You cannot send a proposal to yourself.')
    const { data: row, error } = await db
      .from('proposals')
      .insert({
        from_user_id: userId,
        to_user_id: data.toUserId,
        ...(data.storefrontId && { storefront_id: data.storefrontId }),
        subject: data.subject,
        message: data.message,
        answers: data.answers ?? {},
      })
      .select()
      .single()
    if (error) throw new Error(error.message)
    return row
  })

/** GET — authenticated, returns all proposals sent to or by the current user. */
export const getProposals = createServerFn({ method: 'GET' })
  .middleware([requireAuthContract])
  .handler(async ({ context }): Promise<{ sent: Proposal[]; received: Proposal[] }> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = (context as any).supabase as any
    const userId = (context as any).userId
    const { data: rows, error } = await db
      .from('proposals')
      .select('*')
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    const all: Proposal[] = rows ?? []
    return {
      sent: all.filter((p) => p.from_user_id === userId),
      received: all.filter((p) => p.to_user_id === userId),
    }
  })

/** POST — authenticated, accept/decline/counter a received proposal. */
export const respondToProposal = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .validator((data: RespondToProposalInput) => data)
  .handler(async ({ data, context }): Promise<Proposal> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = (context as any).supabase as any
    const userId = (context as any).userId

    // Verify the caller is the recipient before mutating
    const { data: existing, error: fetchErr } = await db
      .from('proposals')
      .select('id, to_user_id, status')
      .eq('id', data.proposalId)
      .maybeSingle()
    if (fetchErr) throw new Error(fetchErr.message)
    if (!existing) throw new Error('Proposal not found.')
    if (existing.to_user_id !== userId) throw new Error('Only the recipient can respond to a proposal.')

    const { data: row, error } = await db
      .from('proposals')
      .update({
        status: data.status,
        ...(data.status === 'countered' && data.counterMessage && { counter_message: data.counterMessage }),
        ...(existing.status === 'sent' || existing.status === 'viewed' ? { viewed_at: existing.viewed_at ?? new Date().toISOString() } : {}),
        responded_at: new Date().toISOString(),
      })
      .eq('id', data.proposalId)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return row
  })
