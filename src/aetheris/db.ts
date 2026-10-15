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
import { parseBusinessDetails } from './business-posts'
import { reportClientError } from '@/lib/error-report'
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

function businessOf(kind: string, raw: unknown) {
  const business = parseBusinessDetails(kind, raw)
  return business ? { business } : {}
}

const demoAliases: Record<string, string> = {
  'Gary Frey': 'Adrian Vale', 'Maya Chen': 'Mina Park', 'Scott Kelley': 'Nolan Pierce',
  'Alison Kaiser': 'Celeste Arden', 'Prateek Sanjay': 'Rohan Vey', 'Kevin Ward': 'Caleb Wynn',
  'Sarah Villalobos': 'Mara Solis', 'Marcus Adeyemi': 'Darius Cole', 'Lena Hartmann': 'Elara Voss',
  'Diego Ferreira': 'Mateo Quinn', 'Priya Raghavan': 'Anika Rao', 'Tomás Bergeron': 'Luc Moreau',
  'Ava Lindqvist': 'Freya Bell', 'Elliot Nakamura': 'Kenji Vale', 'Nadia Okonjo': 'Amara Nwosu',
  'Ben Halvorsen': 'Elias North', 'Grace Iwuoha': 'Simone Adebayo', 'Rafael Duarte': 'Theo Maren',
  'Hannah Beckett': 'Clara Fenwick', 'Yusuf Karim': 'Idris Hale', 'Camille Renaud': 'Elise Laurent',
  'Oliver Mensah': 'Micah Kone', 'Ingrid Sørensen': 'Astrid Dahl', 'Julian Reyes': 'Gabriel Soto',
}

function fictionalize<T>(value: T): T {
  if (typeof value === 'string') {
    let result: string = value
    for (const [realName, fictionalName] of Object.entries(demoAliases)) result = result.replaceAll(realName, fictionalName)
    return result as T
  }
  if (Array.isArray(value)) return value.map(fictionalize) as T
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, fictionalize(item)])) as T
  }
  return value
}

export async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

/**
 * Public /demo uses a packaged fictional catalogue only.
 * Do not query production members, posts, asks, signals or seeded conversations
 * here. Those tables have intentional access boundaries and must never be
 * silently replaced by demo records in the signed-in network.
 */
export async function loadDirectory(): Promise<Directory> {
  return fictionalize({
    members: catalogueMembers,
    posts: cataloguePosts,
    asks: catalogueAsks,
    signals: catalogueSignals,
    threads: catalogueThreads,
    learnings: catalogueLearnings,
  })
}

/** The signed-in member's own graph. */
export async function loadUserGraph(userId: string, strict = false): Promise<Partial<RemoteGraph>> {
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
    // In live mode, any denied private-graph query is a failed load, not an
    // empty or successfully synchronized account. The demo can remain offline.
    const failedReads = [
      ['relationships', rels.error], ['introductions', intros.error],
      ['memories', memories.error], ['posts', ownPosts.error],
      ['asks', ownAsks.error], ['ask responses', responses.error],
      ['threads', threadRows.error], ['messages', messageRows.error],
      ['preferences', prefs.error],
    ].filter((entry): entry is [string, NonNullable<typeof rels.error>] => Boolean(entry[1]));
    if (strict && failedReads.length) {
      throw new Error('Member network read failed: ' +
        failedReads.map(([table, error]) => table + ': ' + error.message).join(' · '));
    }
    // Inviter first, then the founder, then everyone else.
    const top = await supabase.rpc('my_top_connections').then(r => (r.data ?? []).map(t => String(t.member_id)), () => [] as string[])

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
      connections: [...top.filter(id => group('connections').includes(id)), ...group('connections').filter(id => !top.includes(id))], follows: group('follows'), saved: group('saved'),
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
      ownPosts: (ownPosts.data ?? []).map(r => ({ id: r.id, memberId: 'me', kind: r.kind as Post['kind'], text: r.text, detail: r.detail ?? '', when: r.when_label, responses: r.response_count, media: (r.media ?? []) as unknown as Post['media'], visibility: (r.visibility ?? 'network') as Post['visibility'], ...businessOf(r.kind, r.business) })),
      ownAsks: (ownAsks.data ?? []).map(r => ({ id: r.id, memberId: 'me', ask: r.ask, detail: r.detail, whyNow: r.why_now, offer: r.offer, industry: r.industry, location: r.location, urgency: r.urgency as NetworkAsk['urgency'], posted: r.posted, responses: r.response_count, visibility: r.visibility as NetworkAsk['visibility'], mine: true })),
      askResponses,
      ownThreads: (threadRows.data ?? []).map(r => ({
        id: r.id, memberId: r.member_id, introContext: r.intro_context ?? '', unread: false,
        commitment: r.commitment ?? '', suggested: r.suggested ?? '', messages: [],
      })),
      sentMessages,
      doc: (prefs.data?.data ?? {}) as Record<string, unknown>,
    }
  } catch (error) {
    if (strict) throw error;
    return {}
  }
}

/* ------------------------------------------------------------------ writes */

const fire = (work: Promise<unknown> | PromiseLike<unknown>, where = 'persist-write') => { void Promise.resolve(work).catch(error => reportClientError(error, where)) }

export function saveRelationship(userId: string, group: RelGroup, memberId: string, on: boolean) {
  const kind = relKind[group]
  fire(on
    ? supabase.from('relationships').upsert({ user_id: userId, member_id: memberId, kind }, { onConflict: 'user_id,member_id,kind' })
    : supabase.from('relationships').delete().eq('user_id', userId).eq('member_id', memberId).eq('kind', kind), 'relationship-persist')
}

export function saveIntro(userId: string, memberId: string, status: IntroState, extra?: { reason?: string; mutualValue?: string }) {
  const isLiveMember = /^[0-9a-f-]{36}$/i.test(memberId)
  fire(supabase.from('intro_requests').upsert({
    user_id: userId, member_id: memberId, status,
    ...(isLiveMember ? { target_user_id: memberId } : {}),
    requester_opt_in: true, member_opt_in: status === 'introduced',
    ...(extra?.reason ? { reason: extra.reason } : {}),
    ...(extra?.mutualValue ? { mutual_value: extra.mutualValue } : {}),
  }, { onConflict: 'user_id,member_id' }), 'intro-persist')
}

export function saveLearning(userId: string, learning: Learning, memberId?: string) {
  fire(supabase.from('memories').insert({
    id: learning.id, user_id: userId, kind: 'learning', category: learning.category,
    member_id: memberId ?? null, text: learning.text, source: learning.source,
    confidence: learning.confidence, scope: learning.scope, when_label: learning.when,
  }), 'memory-learning-persist')
}

export function saveNote(userId: string, note: MemoryNote) {
  fire(supabase.from('memories').insert({
    id: note.id, user_id: userId, kind: 'note', category: 'People', member_id: note.personId,
    text: note.text, scope: note.scope, when_label: note.createdAt, source: 'Private note',
  }), 'memory-note-persist')
}

export async function savePost(userId: string, post: Post): Promise<void> {
  const { error } = await supabase.from('posts').insert({
    id: post.id, author_id: userId, kind: post.kind, text: post.text,
    detail: post.detail, when_label: post.when, response_count: 0,
    media: (post.media ?? []) as never, visibility: post.visibility ?? 'network',
    ...(post.business ? { business: post.business as never } : {}),
  })
  if (error) {
    reportClientError(error, 'post-persist')
    throw new Error('Your post could not be saved. Check your connection and try again.')
  }
}

export async function saveAsk(userId: string, ask: NetworkAsk): Promise<void> {
  const { error } = await supabase.from('asks').insert({
    id: ask.id, author_id: userId, ask: ask.ask, detail: ask.detail, why_now: ask.whyNow,
    offer: ask.offer, industry: ask.industry, location: ask.location, urgency: ask.urgency,
    posted: ask.posted, response_count: 0, visibility: ask.visibility,
  })
  if (error) {
    reportClientError(error, 'ask-persist')
    throw new Error('Your need could not be saved. Check your connection and try again.')
  }
}

export function saveAskResponse(userId: string, askId: string, text: string) {
  fire(supabase.from('ask_responses').insert({ user_id: userId, ask_id: askId, text }), 'ask-response-persist')
}

export function saveThread(userId: string, thread: Thread) {
  fire(supabase.from('threads').insert({
    id: thread.id, user_id: userId, member_id: thread.memberId,
    intro_context: thread.introContext, commitment: thread.commitment, suggested: thread.suggested,
  }), 'thread-persist')
}

export function saveMessage(userId: string, threadId: string, message: { id: string; text: string; at: string }) {
  fire(supabase.from('messages').insert({
    id: message.id, user_id: userId, thread_id: threadId, sender: 'me',
    text: message.text, at_label: message.at,
  }), 'message-persist')
}

/** Remaining member-owned settings (profile answers, autonomy, needs, events). */
export function saveDoc(userId: string, doc: Record<string, unknown>) {
  fire(supabase.from('preferences').upsert({ user_id: userId, data: doc as never }, { onConflict: 'user_id' }), 'preferences-persist')
}

export function saveProfileFields(userId: string, fields: Record<string, unknown>) {
  fire(supabase.from('profiles').update(fields as never).eq('id', userId), 'profile-persist')
}
