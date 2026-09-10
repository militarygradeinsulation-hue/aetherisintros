/**
 * Database access for the network.
 *
 * Two halves:
 *  - `loadDirectory()` reads the shared, non-personal catalogue (members,
 *    companies, feed posts, asks, signals, demo conversations, seeded learned
 *    context) that every signed-in member sees.
 *  - `loadUserGraph()` / the `save*` helpers read and write the signed-in
 *    member's own graph: relationships, introduction requests, memories,
 *    conversations, posts, asks and preferences.
 *
 * Everything degrades to the in-code catalogue and localStorage when the
 * database is unreachable, so the preview never hard-fails.
 */
import { supabase } from '@/integrations/supabase/client'
import type { PrivacyScope } from './types'
import {
  learnings as catalogueLearnings, members as catalogueMembers, networkAsks as catalogueAsks,
  posts as cataloguePosts, signals as catalogueSignals, threads as catalogueThreads,
  type IntroState, type Learning, type Member, type NetworkAsk, type Post, type Signal, type Thread,
} from './social'

export type MemoryNote = { id: string; personId: string; text: string; scope: PrivacyScope; createdAt: string }

export interface Directory {
  members: Member[]
  posts: Post[]
  asks: NetworkAsk[]
  signals: Signal[]
  threads: Thread[]
  learnings: Learning[]
}

export interface RemoteGraph {
  connections: string[]
  follows: string[]
  saved: string[]
  introStates: Record<string, IntroState>
  learned: Learning[]
  notes: MemoryNote[]
  ownPosts: Post[]
  ownAsks: NetworkAsk[]
  askResponses: Record<string, string[]>
  ownThreads: Thread[]
  sentMessages: Record<string, Array<{ id: string; text: string; at: string }>>
  doc: Record<string, unknown>
}

const relKind = { connections: 'connection', follows: 'follow', saved: 'saved' } as const
type RelGroup = keyof typeof relKind

export async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

/** Shared catalogue. Falls back to the in-code cast when the table is empty. */
export async function loadDirectory(): Promise<Directory> {
  const fallback: Directory = {
    members: catalogueMembers, posts: cataloguePosts, asks: catalogueAsks,
    signals: catalogueSignals, threads: catalogueThreads, learnings: catalogueLearnings,
  }
  try {
    const [memberRows, postRows, askRows, signalRows, threadRows, learningRows] = await Promise.all([
      supabase.from('members').select('*'),
      supabase.from('posts').select('*').is('author_id', null),
      supabase.from('asks').select('*').is('author_id', null),
      supabase.from('signals').select('*'),
      supabase.from('seed_threads').select('*'),
      supabase.from('seed_learnings').select('*'),
    ])
    if (!memberRows.data?.length) return fallback

    const byId = new Map(catalogueMembers.map(m => [m.id, m]))
    const members = memberRows.data.map(row => {
      const base = byId.get(row.id)
      return {
        ...(base ?? {}),
        id: row.id, name: row.name, initials: row.initials, title: row.title,
        company: row.company, location: row.location, role: row.role, industry: row.industry,
        tags: row.tags ?? [], expertise: row.expertise ?? [], needs: row.needs ?? [],
        offers: row.offers ?? [], focus: row.focus, thesis: row.thesis,
        availability: row.availability, mutuals: row.mutuals ?? [],
        lastInteractionDays: row.last_interaction_days,
        relationshipStatus: row.relationship_status, score: row.score, scoreTotal: row.score_total,
        radar: row.radar, whyThem: row.why_them, whyYou: row.why_you, whyNow: row.why_now,
        bestPath: row.best_path ?? [], nextAction: row.next_action, dontDo: row.dont_do,
        confidence: row.confidence, introState: row.intro_state, joined: row.joined,
        ...(row.opportunity_low != null ? { opportunityLow: row.opportunity_low } : {}),
        ...(row.opportunity_high != null ? { opportunityHigh: row.opportunity_high } : {}),
      } as unknown as Member
    })

    return {
      members,
      posts: postRows.data?.length
        ? postRows.data.map(r => ({ id: r.id, memberId: r.member_id ?? 'me', kind: r.kind, text: r.text, detail: r.detail, when: r.when_label, responses: r.response_count } as Post))
        : cataloguePosts,
      asks: askRows.data?.length
        ? askRows.data.map(r => ({ id: r.id, memberId: r.member_id ?? 'me', ask: r.ask, detail: r.detail, whyNow: r.why_now, offer: r.offer, industry: r.industry, location: r.location, urgency: r.urgency, posted: r.posted, responses: r.response_count, visibility: r.visibility } as NetworkAsk))
        : catalogueAsks,
      signals: signalRows.data?.length
        ? signalRows.data.map(r => ({ id: r.id, memberId: r.member_id, kind: r.kind, text: r.text, when: r.when_label } as Signal))
        : catalogueSignals,
      threads: threadRows.data?.length
        ? threadRows.data.map(r => ({ id: r.id, memberId: r.member_id, introContext: r.intro_context, unread: r.unread, commitment: r.commitment, suggested: r.suggested, messages: (r.messages ?? []) as unknown as Thread['messages'] }))
        : catalogueThreads,
      learnings: learningRows.data?.length
        ? learningRows.data.map(r => ({ id: r.id, category: r.category, text: r.text, source: r.source, confidence: r.confidence, scope: r.scope, when: r.when_label } as Learning))
        : catalogueLearnings,
    }
  } catch {
    return fallback
  }
}

/** The signed-in member's own graph. */
export async function loadUserGraph(userId: string): Promise<Partial<RemoteGraph>> {
  try {
    const [rels, intros, memories, ownPosts, ownAsks, responses, threadRows, messageRows, prefs] = await Promise.all([
      supabase.from('relationships').select('member_id, kind').eq('user_id', userId),
      supabase.from('intro_requests').select('member_id, status').eq('user_id', userId),
      supabase.from('memories').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('posts').select('*').eq('author_id', userId),
      supabase.from('asks').select('*').eq('author_id', userId),
      supabase.from('ask_responses').select('ask_id, text').eq('user_id', userId),
      supabase.from('threads').select('*').eq('user_id', userId),
      supabase.from('messages').select('*').eq('user_id', userId).order('created_at'),
      supabase.from('preferences').select('data').eq('user_id', userId).maybeSingle(),
    ])

    const group = (name: RelGroup) =>
      (rels.data ?? []).filter(r => r.kind === relKind[name]).map(r => r.member_id)

    const askResponses: Record<string, string[]> = {}
    for (const r of responses.data ?? []) askResponses[r.ask_id] = [...(askResponses[r.ask_id] ?? []), r.text]

    const sentMessages: Record<string, Array<{ id: string; text: string; at: string }>> = {}
    for (const m of messageRows.data ?? []) {
      if (m.sender !== 'me') continue
      sentMessages[m.thread_id] = [...(sentMessages[m.thread_id] ?? []), { id: m.id, text: m.text, at: m.at_label }]
    }

    const introStates: Record<string, IntroState> = {}
    for (const i of intros.data ?? []) introStates[i.member_id] = i.status as IntroState

    const memoryRows = memories.data ?? []
    return {
      connections: group('connections'), follows: group('follows'), saved: group('saved'),
      introStates,
      learned: memoryRows.filter(m => m.kind === 'learning').map(m => ({
        id: m.id, category: m.category as Learning['category'], text: m.text,
        source: m.source ?? '', confidence: m.confidence ?? 100,
        scope: m.scope as PrivacyScope, when: m.when_label ?? '',
      })),
      notes: memoryRows.filter(m => m.kind === 'note').map(m => ({
        id: m.id, personId: m.member_id ?? 'me', text: m.text,
        scope: m.scope as PrivacyScope, createdAt: m.when_label ?? '',
      })),
      ownPosts: (ownPosts.data ?? []).map(r => ({ id: r.id, memberId: 'me', kind: r.kind as Post['kind'], text: r.text, detail: r.detail ?? '', when: r.when_label, responses: r.response_count })),
      ownAsks: (ownAsks.data ?? []).map(r => ({ id: r.id, memberId: 'me', ask: r.ask, detail: r.detail, whyNow: r.why_now, offer: r.offer, industry: r.industry, location: r.location, urgency: r.urgency as NetworkAsk['urgency'], posted: r.posted, responses: r.response_count, visibility: r.visibility as NetworkAsk['visibility'], mine: true })),
      askResponses,
      ownThreads: (threadRows.data ?? []).map(r => ({
        id: r.id, memberId: r.member_id, introContext: r.intro_context ?? '', unread: false,
        commitment: r.commitment ?? '', suggested: r.suggested ?? '', messages: [],
      })),
      sentMessages,
      doc: (prefs.data?.data ?? {}) as Record<string, unknown>,
    }
  } catch {
    return {}
  }
}

/* ------------------------------------------------------------------ writes */

const fire = (work: Promise<unknown> | PromiseLike<unknown>) => { void Promise.resolve(work).catch(error => console.error('persist failed', error)) }

export function saveRelationship(userId: string, group: RelGroup, memberId: string, on: boolean) {
  const kind = relKind[group]
  fire(on
    ? supabase.from('relationships').upsert({ user_id: userId, member_id: memberId, kind }, { onConflict: 'user_id,member_id,kind' })
    : supabase.from('relationships').delete().eq('user_id', userId).eq('member_id', memberId).eq('kind', kind))
}

export function saveIntro(userId: string, memberId: string, status: IntroState, extra?: { reason?: string; mutualValue?: string }) {
  fire(supabase.from('intro_requests').upsert({
    user_id: userId, member_id: memberId, status,
    requester_opt_in: true, member_opt_in: status === 'introduced',
    ...(extra?.reason ? { reason: extra.reason } : {}),
    ...(extra?.mutualValue ? { mutual_value: extra.mutualValue } : {}),
  }, { onConflict: 'user_id,member_id' }))
}

export function saveLearning(userId: string, learning: Learning, memberId?: string) {
  fire(supabase.from('memories').insert({
    id: learning.id, user_id: userId, kind: 'learning', category: learning.category,
    member_id: memberId ?? null, text: learning.text, source: learning.source,
    confidence: learning.confidence, scope: learning.scope, when_label: learning.when,
  }))
}

export function saveNote(userId: string, note: MemoryNote) {
  fire(supabase.from('memories').insert({
    id: note.id, user_id: userId, kind: 'note', category: 'People', member_id: note.personId,
    text: note.text, scope: note.scope, when_label: note.createdAt, source: 'Private note',
  }))
}

export function savePost(userId: string, post: Post) {
  fire(supabase.from('posts').insert({
    id: post.id, author_id: userId, kind: post.kind, text: post.text,
    detail: post.detail, when_label: post.when, response_count: 0,
  }))
}

export function saveAsk(userId: string, ask: NetworkAsk) {
  fire(supabase.from('asks').insert({
    id: ask.id, author_id: userId, ask: ask.ask, detail: ask.detail, why_now: ask.whyNow,
    offer: ask.offer, industry: ask.industry, location: ask.location, urgency: ask.urgency,
    posted: ask.posted, response_count: 0, visibility: ask.visibility,
  }))
}

export function saveAskResponse(userId: string, askId: string, text: string) {
  fire(supabase.from('ask_responses').insert({ user_id: userId, ask_id: askId, text }))
}

export function saveThread(userId: string, thread: Thread) {
  fire(supabase.from('threads').insert({
    id: thread.id, user_id: userId, member_id: thread.memberId,
    intro_context: thread.introContext, commitment: thread.commitment, suggested: thread.suggested,
  }))
}

export function saveMessage(userId: string, threadId: string, message: { id: string; text: string; at: string }) {
  fire(supabase.from('messages').insert({
    id: message.id, user_id: userId, thread_id: threadId, sender: 'me',
    text: message.text, at_label: message.at,
  }))
}

/** Remaining member-owned settings (profile answers, autonomy, needs, events). */
export function saveDoc(userId: string, doc: Record<string, unknown>) {
  fire(supabase.from('preferences').upsert({ user_id: userId, data: doc as never }, { onConflict: 'user_id' }))
}

export function saveProfileFields(userId: string, fields: Record<string, unknown>) {
  fire(supabase.from('profiles').update(fields as never).eq('id', userId))
}
