import { createServerFn } from '@tanstack/react-start'

import { requireAuthContract } from './auth-gate'
import { gatewayChat } from './aiGateway.server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = any

export interface PeerGroupSummary {
  id: string
  name: string
  description: string
  stage_label: string | null
  industry_focus: string | null
  role: string
  member_count: number
}

export interface PeerFeedPost {
  id: string
  kind: string
  body: string
  created_at: string
  pinned: boolean
  author_name: string
  author_initials: string
}

/** List all peer groups the current user is a member of. */
export const listMyPeerGroups = createServerFn({ method: 'GET' })
  .middleware([requireAuthContract])
  .handler(async ({ context }): Promise<PeerGroupSummary[]> => {
    const db = context.supabase as AnyDb
    const { data, error } = await (db.rpc as AnyDb)('list_my_peer_groups')
    if (error) throw new Error(error.message)
    return (data ?? []) as PeerGroupSummary[]
  })

/** Create a new peer group; the caller automatically becomes its facilitator. */
export const createPeerGroup = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .validator((input: { name: string; description: string; stageLabel: string; industryFocus: string }) => input)
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const db = context.supabase as AnyDb
    const { data: group, error } = await (db.rpc as AnyDb)('create_peer_group', {
      p_name: data.name,
      p_description: data.description,
      p_stage_label: data.stageLabel,
      p_industry_focus: data.industryFocus,
    })
    if (error) throw new Error(error.message)
    return { id: (group as { id: string }).id }
  })

/** Fetch the latest 50 top-level posts for a peer group feed. */
export const getPeerGroupFeed = createServerFn({ method: 'GET' })
  .middleware([requireAuthContract])
  .validator((input: { groupId: string }) => input)
  .handler(async ({ data, context }): Promise<PeerFeedPost[]> => {
    const db = context.supabase as AnyDb
    const { data: posts, error } = await (db.rpc as AnyDb)('get_peer_group_feed', {
      p_group_id: data.groupId,
    })
    if (error) throw new Error(error.message)
    return (posts ?? []) as PeerFeedPost[]
  })

/** Post an update/ask/win/block/insight to a peer group. */
export const postToPeerGroup = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .validator((input: { groupId: string; kind: string; body: string }) => input)
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const db = context.supabase as AnyDb
    const { data: post, error } = await (db.rpc as AnyDb)('post_to_peer_group', {
      p_group_id: data.groupId,
      p_kind: data.kind,
      p_body: data.body,
    })
    if (error) throw new Error(error.message)
    return { id: (post as { id: string }).id }
  })

// ── Agenda types ──────────────────────────────────────────────────────────────

export interface PeerGroupAgenda {
  id: string
  group_id: string
  session_number: number
  generated_at: string
  discussion_questions: string[]
  focus_theme: string | null
  prepared_by_ai: boolean
}

export interface PeerGroupCommitment {
  id: string
  group_id: string
  user_id: string
  commitment: string
  due_date: string | null
  status: 'active' | 'completed' | 'missed'
  session_number: number
  created_at: string
  completed_at: string | null
}

// ── Agenda server functions ───────────────────────────────────────────────────

/** Fetch the latest agenda for a peer group. */
export const getGroupAgenda = createServerFn({ method: 'GET' })
  .middleware([requireAuthContract])
  .validator((input: { groupId: string }) => input)
  .handler(async ({ data, context }): Promise<PeerGroupAgenda | null> => {
    const db = context.supabase as AnyDb
    const { data: agenda, error } = await db
      .from('peer_group_agendas')
      .select('*')
      .eq('group_id', data.groupId)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return agenda as PeerGroupAgenda | null
  })

const AGENDA_SYSTEM_PROMPT = `You are a skilled peer-group facilitator for a confidential CEO peer forum.
Generate a focused, insightful agenda for an upcoming monthly peer group session.
Return a JSON object with these fields:
- focus_theme: string — a concise, specific theme for the session (e.g. "Navigating a down round" or "Hiring for the next stage")
- discussion_questions: string[] — exactly 4 to 6 deep, open-ended discussion questions that:
  - Are rooted in the stated focus theme
  - Draw out real experience, not platitudes
  - Encourage members to share both successes and struggles
  - Surface actionable insights and accountability
Respond with valid JSON only. No markdown fences, no preamble.`

/**
 * Generate an AI agenda for the next session of a peer group and persist it.
 * Only the group facilitator may call this.
 */
export const generateGroupAgenda = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .validator((input: { groupId: string; focusHint?: string }) => input)
  .handler(async ({ data, context }): Promise<PeerGroupAgenda> => {
    const db = context.supabase as AnyDb

    // Fetch the group to confirm existence and get context.
    const { data: group, error: groupError } = await db
      .from('peer_groups')
      .select('id, name, description, cadence')
      .eq('id', data.groupId)
      .maybeSingle()
    if (groupError) throw new Error(groupError.message)
    if (!group) throw new Error('Group not found.')

    // Count existing agendas to compute the next session number.
    const { count } = await db
      .from('peer_group_agendas')
      .select('id', { count: 'exact', head: true })
      .eq('group_id', data.groupId)
    const sessionNumber = (count ?? 0) + 1

    const userPrompt = [
      `Group: ${(group as { name: string }).name}`,
      (group as { description: string }).description ? `Description: ${(group as { description: string }).description}` : null,
      (group as { cadence: string }).cadence ? `Cadence: ${(group as { cadence: string }).cadence}` : null,
      `Session number: ${sessionNumber}`,
      data.focusHint ? `Facilitator's focus hint: ${data.focusHint}` : null,
    ].filter(Boolean).join('\n')

    let answer: string
    try {
      answer = await gatewayChat({
        system: AGENDA_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
        maxSteps: 1,
      })
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : 'The agenda generator could not respond right now.')
    }

    let parsed: { focus_theme: string; discussion_questions: string[] }
    try {
      parsed = JSON.parse(answer) as typeof parsed
      if (!parsed.focus_theme || !Array.isArray(parsed.discussion_questions)) throw new Error('bad shape')
    } catch {
      throw new Error('The AI returned an agenda in an unexpected format. Please try again.')
    }

    const { data: saved, error: saveError } = await db
      .from('peer_group_agendas')
      .insert({
        group_id: data.groupId,
        session_number: sessionNumber,
        focus_theme: parsed.focus_theme,
        discussion_questions: parsed.discussion_questions,
        prepared_by_ai: true,
      })
      .select()
      .single()
    if (saveError) throw new Error(saveError.message)
    return saved as PeerGroupAgenda
  })

// ── Commitment server functions ───────────────────────────────────────────────

/** Fetch all commitments for a peer group (own + peers). */
export const getGroupCommitments = createServerFn({ method: 'GET' })
  .middleware([requireAuthContract])
  .validator((input: { groupId: string }) => input)
  .handler(async ({ data, context }): Promise<PeerGroupCommitment[]> => {
    const db = context.supabase as AnyDb
    const { data: rows, error } = await db
      .from('peer_group_commitments')
      .select('*')
      .eq('group_id', data.groupId)
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (rows ?? []) as PeerGroupCommitment[]
  })

/** Add a personal commitment for the current session. */
export const addCommitment = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .validator((input: { groupId: string; commitment: string; dueDate?: string; sessionNumber?: number }) => input)
  .handler(async ({ data, context }): Promise<PeerGroupCommitment> => {
    const db = context.supabase as AnyDb
    const { data: row, error } = await db
      .from('peer_group_commitments')
      .insert({
        group_id: data.groupId,
        commitment: data.commitment.trim(),
        due_date: data.dueDate ?? null,
        session_number: data.sessionNumber ?? 1,
      })
      .select()
      .single()
    if (error) throw new Error(error.message)
    return row as PeerGroupCommitment
  })

/** Mark a commitment completed (or reopen it). */
export const updateCommitmentStatus = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .validator((input: { commitmentId: string; status: 'active' | 'completed' | 'missed' }) => input)
  .handler(async ({ data, context }): Promise<void> => {
    const db = context.supabase as AnyDb
    const { error } = await db
      .from('peer_group_commitments')
      .update({ status: data.status })
      .eq('id', data.commitmentId)
    if (error) throw new Error(error.message)
  })
